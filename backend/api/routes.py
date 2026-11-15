"""REST API Routes for VidyutSetu Workbench."""

import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.db.database import get_db, get_app_git_sha, DBTestRun, DBCustomVendorConfig
from backend.adapters.registry import get_adapter, list_registered_vendors
from backend.engine.validator import ValidationEngine
from backend.engine.scorer import DiagnosticSuggester
from backend.engine.conformance import ConformanceEvaluationEngine
from backend.engine.anomaly import AnomalyDetectionEngine
from backend.generator.simulator import SyntheticAmiGenerator
from backend.models.canonical import (
    CanonicalPayload,
    DiagnosticIssue,
    ConformanceStatus,
    IssueSeverity,
    ValidationStage,
)
from backend.models.vendor import VendorProfile

router = APIRouter(prefix="/api", tags=["Workbench API"])

MAX_PAYLOAD_BYTES = 10 * 1024 * 1024  # 10 MB hard ceiling for uploaded payloads


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VidyutSetu AMI Interoperability Workbench",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.1.0",
        "standards_scope": ["IEC 61968-9", "DLMS/COSEM (IEC 62056)", "IS 15959"],
    }


@router.get("/stats")
def get_workbench_stats(db: Session = Depends(get_db)):
    total_runs = db.query(DBTestRun).count()
    runs = db.query(DBTestRun).order_by(desc(DBTestRun.execution_time)).limit(100).all()

    avg_score = 0.0
    if runs:
        avg_score = round(sum(r.total_score for r in runs) / len(runs), 1)

    vendor_counts = {}
    for r in runs:
        vendor_counts[r.source_vendor] = vendor_counts.get(r.source_vendor, 0) + 1

    return {
        "total_test_runs": total_runs,
        "average_interoperability_score": avg_score,
        "active_vendor_adapters": len(list_registered_vendors()),
        "vendor_usage": vendor_counts,
        "recent_runs": [
            {
                "run_id": r.run_id,
                "execution_time": r.execution_time.isoformat() if r.execution_time else None,
                "source_vendor": r.source_vendor,
                "target_vendor": r.target_vendor,
                "total_records": r.total_records,
                "conformance_status": r.grade,
                "summary": r.summary,
            }
            for r in runs[:10]
        ]
    }


@router.get("/vendors")
def get_vendors(db: Session = Depends(get_db)):
    registered = list_registered_vendors()
    # Check if there are database overrides
    customs = db.query(DBCustomVendorConfig).all()
    out = {}
    for vid, prof in registered.items():
        out[vid] = prof.model_dump()
    for c in customs:
        try:
            cfg = json.loads(c.config_json)
            out[c.vendor_id] = cfg
        except Exception:
            pass
    return out


@router.post("/generate")
def generate_synthetic_data(
    vendor_id: str = Query(..., description="Target vendor format: alpha-hes, beta-hes, gamma-mdms, delta-legacy, or canonical"),
    meter_count: int = Query(3, ge=1, le=20),
    intervals: int = Query(6, ge=1, le=48),
    inject_anomalies: bool = Query(False),
    inject_tampers: bool = Query(False),
    seed: Optional[int] = Query(None, description="RNG seed for reproducible generation"),
):
    if vendor_id == "canonical":
        payload = SyntheticAmiGenerator.generate_canonical_scenario(
            meter_count=meter_count,
            intervals_per_meter=intervals,
            inject_anomalies=inject_anomalies,
            inject_tampers=inject_tampers,
            seed=seed,
        )
        return {"seed": seed, **payload.model_dump()}

    adapter = get_adapter(vendor_id)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported vendor adapter: {vendor_id}")

    data = SyntheticAmiGenerator.generate_vendor_scenario(
        vendor_id=vendor_id,
        meter_count=meter_count,
        intervals=intervals,
        inject_anomalies=inject_anomalies,
        inject_tampers=inject_tampers,
        seed=seed,
    )
    return {
        "vendor_id": vendor_id,
        "format": adapter.profile.format_type,
        "seed": seed,
        "payload": data
    }


@router.post("/workbench/execute")
async def execute_interoperability_test(
    source_vendor: str = Form(...),
    target_vendor: Optional[str] = Form(None),
    raw_payload: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    source_adapter = get_adapter(source_vendor)
    if not source_adapter:
        raise HTTPException(status_code=400, detail=f"Source vendor '{source_vendor}' is not recognized.")

    # Determine input string with size guard
    content_str = ""
    if file:
        content_bytes = await file.read()
        if len(content_bytes) > MAX_PAYLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Uploaded file exceeds {MAX_PAYLOAD_BYTES // (1024*1024)} MB limit.",
            )
        content_str = content_bytes.decode("utf-8", errors="replace")
    elif raw_payload:
        if len(raw_payload.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Payload exceeds {MAX_PAYLOAD_BYTES // (1024*1024)} MB limit.",
            )
        content_str = raw_payload
    else:
        raise HTTPException(status_code=400, detail="Provide raw_payload or upload a file.")

    # Stage A: Source format parsing and schema validation
    parsing_succeeded = True
    parsed_input = content_str
    if source_adapter.profile.format_type == "json":
        try:
            parsed_input = json.loads(content_str)
        except Exception:
            parsing_succeeded = False

    source_issues = source_adapter.validate_source(parsed_input)

    # Stage B: Adapter transformation — issues blame the adapter mapping
    canonical_payload, adapter_issues = source_adapter.parse_to_canonical(parsed_input)
    for iss in adapter_issues:
        iss.stage = ValidationStage.ADAPTER

    # Stage C: Canonical validation — issues blame contract violations
    validation_issues, valid_count, invalid_count = ValidationEngine.validate_canonical_payload(canonical_payload)
    for iss in validation_issues:
        iss.stage = ValidationStage.CANONICAL

    # Stage D: If target vendor requested, serialize + validate target contract
    target_output = None
    target_issues: List[DiagnosticIssue] = []
    if target_vendor and target_vendor != "none":
        target_adapter = get_adapter(target_vendor)
        if target_adapter:
            target_output = target_adapter.serialize_from_canonical(canonical_payload)
            target_issues = target_adapter.validate_target(target_output)
            for iss in target_issues:
                iss.stage = ValidationStage.TARGET

    # Stage E: ML Anomaly Detection (Isolation Forest or Z-score fallback per meter)
    anomaly_report = AnomalyDetectionEngine.detect(canonical_payload.readings)
    for ra in anomaly_report.flat:
        canonical_payload.readings[ra.reading_index].anomaly_score = ra.anomaly_score
        canonical_payload.readings[ra.reading_index].is_anomaly = ra.is_anomaly
    # Also annotate non-anomaly readings with their scores
    for meter_results in anomaly_report.per_meter.values():
        for ra in meter_results:
            if not ra.is_anomaly:
                canonical_payload.readings[ra.reading_index].anomaly_score = ra.anomaly_score
                canonical_payload.readings[ra.reading_index].is_anomaly = ra.is_anomaly
    anomaly_issues = AnomalyDetectionEngine.to_diagnostic_issues(anomaly_report)

    all_issues = source_issues + adapter_issues + validation_issues + target_issues + anomaly_issues

    # Enrich issues with auto-remediation advice
    all_issues = DiagnosticSuggester.enrich_issues_with_remediation(all_issues)

    # Evaluate conformance — assertion-based, no aggregate score
    total_records = len(canonical_payload.readings)
    conformance = ConformanceEvaluationEngine.evaluate(
        issues=all_issues,
        total_records=total_records,
        format_parsed_successfully=parsing_succeeded,
    )

    elapsed_ms = round((time.time() - start_time) * 1000.0, 2)
    run_id = f"RUN-{uuid.uuid4().hex[:10].upper()}"

    # Blame attribution summary
    blame = {}
    for iss in all_issues:
        stage = iss.stage.value
        blame.setdefault(stage, {"error_count": 0, "warning_count": 0})
        if iss.severity == IssueSeverity.ERROR:
            blame[stage]["error_count"] += 1
        else:
            blame[stage]["warning_count"] += 1

    # Persist — reuse existing DB columns without schema migration:
    #   grade   → conformance_status string (PASS/CONDITIONAL/FAIL/INCOMPLETE)
    #   summary → conformance summary text
    #   total_score → 100/75/0/50 for PASS/CONDITIONAL/FAIL/INCOMPLETE (retained for history queries)
    _status_to_score = {
        ConformanceStatus.PASS: 100.0,
        ConformanceStatus.CONDITIONAL: 75.0,
        ConformanceStatus.FAIL: 0.0,
        ConformanceStatus.INCOMPLETE: 50.0,
    }
    db_run = DBTestRun(
        run_id=run_id,
        execution_time=datetime.now(timezone.utc),
        source_vendor=source_vendor,
        target_vendor=target_vendor,
        total_records=total_records,
        valid_records=valid_count,
        invalid_records=invalid_count,
        syntactic_score=float(conformance.total_assertions),
        semantic_score=float(conformance.mandatory_failure_count),
        integrity_score=float(conformance.warning_count),
        total_score=_status_to_score[conformance.status],
        grade=conformance.status.value,
        summary=conformance.summary,
        issues_json=json.dumps([iss.model_dump() for iss in all_issues[:500]]),
        raw_preview=content_str[:5000],
        canonical_preview=json.dumps(canonical_payload.model_dump(), default=str)[:10000],
        target_preview=json.dumps(target_output, default=str)[:10000] if isinstance(target_output, (dict, list)) else (str(target_output)[:10000] if target_output else ""),
        duration_ms=elapsed_ms,
        app_git_sha=get_app_git_sha(),
        blame_json=json.dumps(blame),
    )
    db.add(db_run)
    db.commit()

    anomaly_summary = {
        "total_readings": anomaly_report.total_readings,
        "anomaly_count": anomaly_report.anomaly_count,
        "anomaly_rate": anomaly_report.anomaly_rate,
        "has_anomalies": anomaly_report.has_anomalies,
        "flagged_readings": [
            {
                "reading_index": a.reading_index,
                "meter_serial_number": a.meter_serial_number,
                "anomaly_score": a.anomaly_score,
                "method": a.method,
                "contributing_features": a.contributing_features,
                "description": a.description,
            }
            for a in anomaly_report.flat
        ],
    }

    return {
        "run_id": run_id,
        "execution_time": datetime.now(timezone.utc).isoformat(),
        "source_vendor": source_vendor,
        "target_vendor": target_vendor,
        "total_records": total_records,
        "valid_records": valid_count,
        "invalid_records": invalid_count,
        "conformance": conformance.model_dump(),
        "blame_attribution": blame,
        "anomaly_detection": anomaly_summary,
        "issues": [iss.model_dump() for iss in all_issues],
        "canonical_payload": canonical_payload.model_dump(),
        "target_output": target_output,
        "duration_ms": elapsed_ms
    }


@router.get("/anomaly/summary/{run_id}")
def get_anomaly_summary(run_id: str, db: Session = Depends(get_db)):
    """Return ML anomaly detection summary for a stored test run."""
    r = db.query(DBTestRun).filter(DBTestRun.run_id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Test run {run_id} not found.")
    issues = json.loads(r.issues_json or "[]")
    anomaly_issues = [i for i in issues if i.get("code") == "ANOMALY_DETECTED"]
    return {
        "run_id": run_id,
        "anomaly_issue_count": len(anomaly_issues),
        "anomaly_issues": anomaly_issues,
    }


@router.get("/contracts")
def list_contracts():
    """List all vendor adapter contracts with their versioned schema declarations."""
    vendors = list_registered_vendors()
    contracts = []
    for vid, profile in vendors.items():
        adapter = get_adapter(vid)
        contract = {
            "vendor_id": vid,
            "name": profile.name,
            "version": profile.version,
            "system_type": profile.system_type,
            "format_type": profile.format_type,
            "protocol": profile.protocol,
            "description": profile.description,
            "field_mappings": [m.model_dump() for m in profile.default_mappings],
            "obis_code_mappings": profile.obis_code_mappings,
            "event_mappings": profile.event_mappings,
            "source_schema": _adapter_source_schema(vid, profile),
            "target_schema": _adapter_target_schema(vid, profile),
        }
        contracts.append(contract)
    return {"contracts": contracts, "count": len(contracts)}


@router.get("/contracts/{vendor_id}")
def get_contract(vendor_id: str):
    """Get a single vendor's adapter contract."""
    vendors = list_registered_vendors()
    profile = vendors.get(vendor_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_id}' not found.")
    return {
        "vendor_id": vendor_id,
        "name": profile.name,
        "version": profile.version,
        "system_type": profile.system_type,
        "format_type": profile.format_type,
        "protocol": profile.protocol,
        "description": profile.description,
        "field_mappings": [m.model_dump() for m in profile.default_mappings],
        "obis_code_mappings": profile.obis_code_mappings,
        "event_mappings": profile.event_mappings,
        "source_schema": _adapter_source_schema(vendor_id, profile),
        "target_schema": _adapter_target_schema(vendor_id, profile),
    }


@router.get("/contracts/diff/{vendor_a}/{vendor_b}")
def diff_contracts(vendor_a: str, vendor_b: str):
    """Compare two vendor contracts, highlighting mapping differences."""
    vendors = list_registered_vendors()
    pa, pb = vendors.get(vendor_a), vendors.get(vendor_b)
    if not pa:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_a}' not found.")
    if not pb:
        raise HTTPException(status_code=404, detail=f"Vendor '{vendor_b}' not found.")

    obis_a = set(pa.obis_code_mappings.keys())
    obis_b = set(pb.obis_code_mappings.keys())
    events_a = set(pa.event_mappings.keys())
    events_b = set(pb.event_mappings.keys())

    return {
        "vendor_a": vendor_a,
        "vendor_b": vendor_b,
        "format_match": pa.format_type == pb.format_type,
        "protocol_match": pa.protocol == pb.protocol,
        "obis_codes": {
            "only_a": sorted(obis_a - obis_b),
            "only_b": sorted(obis_b - obis_a),
            "shared": sorted(obis_a & obis_b),
        },
        "event_mappings": {
            "only_a": sorted(events_a - events_b),
            "only_b": sorted(events_b - events_a),
            "shared": sorted(events_a & events_b),
        },
    }


def _adapter_source_schema(vendor_id: str, profile: VendorProfile) -> dict:
    """Build a declarative source schema from the vendor profile."""
    if profile.format_type == "json":
        if profile.protocol == "DLMS/COSEM":
            return {
                "type": "object",
                "required_keys": ["meter_data"],
                "record_fields": ["meter_number", "clock", "registers"],
                "obis_registers": list(profile.obis_code_mappings.keys()),
            }
        elif profile.protocol == "CIM_IEC61968":
            return {
                "type": "object",
                "required_keys": ["MeterReadings"],
                "nested_structure": "EndDevice → IntervalBlock → IntervalReading",
            }
        else:
            return {
                "type": "object",
                "required_keys": ["readings"],
                "record_fields": ["device_uid", "ts_epoch_sec", "act_wh"],
            }
    elif profile.format_type == "csv":
        return {
            "type": "csv",
            "required_columns": ["MTR_ID", "RDG_TIME", "KWH_IMP"],
            "optional_columns": ["KWH_EXP", "KVARH_LAG", "VRMS", "IRMS", "PF", "FREQ", "ALARM_CODE"],
        }
    return {"type": profile.format_type}


def _adapter_target_schema(vendor_id: str, profile: VendorProfile) -> dict:
    """Build a declarative target schema from the vendor profile."""
    if profile.format_type == "json":
        return {
            "type": "object",
            "format": profile.format_type,
            "protocol": profile.protocol,
        }
    elif profile.format_type == "csv":
        return {
            "type": "csv",
            "columns": ["MTR_ID", "RDG_TIME", "KWH_IMP", "KWH_EXP", "KVARH_LAG", "VRMS", "IRMS", "PF", "FREQ", "ALARM_CODE"],
        }
    return {"type": profile.format_type}


@router.get("/test-runs")
def list_test_runs(limit: int = 50, db: Session = Depends(get_db)):
    runs = db.query(DBTestRun).order_by(desc(DBTestRun.execution_time)).limit(limit).all()
    return [
        {
            "run_id": r.run_id,
            "execution_time": r.execution_time.isoformat() if r.execution_time else None,
            "source_vendor": r.source_vendor,
            "target_vendor": r.target_vendor,
            "total_records": r.total_records,
            "valid_records": r.valid_records,
            "invalid_records": r.invalid_records,
            "conformance_status": r.grade,
            "summary": r.summary,
            "duration_ms": r.duration_ms
        }
        for r in runs
    ]


@router.get("/test-runs/compare")
def compare_test_runs(
    run_a: str = Query(..., description="First run ID (baseline)"),
    run_b: str = Query(..., description="Second run ID (candidate)"),
    db: Session = Depends(get_db),
):
    """Compare two test runs, showing assertion-level regression/improvement."""
    a = db.query(DBTestRun).filter(DBTestRun.run_id == run_a).first()
    b = db.query(DBTestRun).filter(DBTestRun.run_id == run_b).first()
    if not a:
        raise HTTPException(status_code=404, detail=f"Baseline run {run_a} not found.")
    if not b:
        raise HTTPException(status_code=404, detail=f"Candidate run {run_b} not found.")

    issues_a = set()
    issues_b = set()
    issues_a_list = json.loads(a.issues_json or "[]")
    issues_b_list = json.loads(b.issues_json or "[]")

    for iss in issues_a_list:
        issues_a.add((iss.get("code", ""), iss.get("field", ""), iss.get("stage", "")))
    for iss in issues_b_list:
        issues_b.add((iss.get("code", ""), iss.get("field", ""), iss.get("stage", "")))

    resolved = issues_a - issues_b
    new_issues = issues_b - issues_a
    persistent = issues_a & issues_b

    def _to_dicts(tuples):
        return [{"code": t[0], "field": t[1], "stage": t[2]} for t in sorted(tuples)]

    status_a = a.grade
    status_b = b.grade
    regression = (
        status_a in ("PASS", "CONDITIONAL") and status_b in ("FAIL", "INCOMPLETE")
    )
    improvement = (
        status_a in ("FAIL", "INCOMPLETE") and status_b in ("PASS", "CONDITIONAL")
    )

    return {
        "baseline": {
            "run_id": a.run_id,
            "conformance_status": status_a,
            "total_issues": len(issues_a_list),
            "source_vendor": a.source_vendor,
            "target_vendor": a.target_vendor,
        },
        "candidate": {
            "run_id": b.run_id,
            "conformance_status": status_b,
            "total_issues": len(issues_b_list),
            "source_vendor": b.source_vendor,
            "target_vendor": b.target_vendor,
        },
        "regression_detected": regression,
        "improvement_detected": improvement,
        "resolved_issues": _to_dicts(resolved),
        "new_issues": _to_dicts(new_issues),
        "persistent_issues": _to_dicts(persistent),
        "summary": {
            "resolved_count": len(resolved),
            "new_count": len(new_issues),
            "persistent_count": len(persistent),
        },
    }


@router.get("/test-runs/{run_id}")
def get_test_run_detail(run_id: str, db: Session = Depends(get_db)):
    r = db.query(DBTestRun).filter(DBTestRun.run_id == run_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Test run {run_id} not found.")

    issues = []
    try:
        issues = json.loads(r.issues_json or "[]")
    except Exception:
        pass

    return {
        "run_id": r.run_id,
        "execution_time": r.execution_time.isoformat() if r.execution_time else None,
        "source_vendor": r.source_vendor,
        "target_vendor": r.target_vendor,
        "total_records": r.total_records,
        "valid_records": r.valid_records,
        "invalid_records": r.invalid_records,
        "conformance": {
            "status": r.grade,
            "summary": r.summary,
            "total_assertions": int(r.syntactic_score),
            "mandatory_failure_count": int(r.semantic_score),
            "warning_count": int(r.integrity_score),
        },
        "blame_attribution": json.loads(r.blame_json or "{}"),
        "issues": issues,
        "raw_preview": r.raw_preview,
        "canonical_preview": r.canonical_preview,
        "target_preview": r.target_preview,
        "duration_ms": r.duration_ms,
        "app_git_sha": r.app_git_sha,
    }

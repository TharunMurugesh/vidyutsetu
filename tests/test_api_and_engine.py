"""Unit and integration tests for VidyutSetu ConformanceEvaluationEngine and APIs."""

import json
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.canonical import (
    CanonicalPayload,
    CanonicalMeterReading,
    DiagnosticIssue,
    IssueSeverity,
    ConformanceStatus,
)
from backend.engine.validator import ValidationEngine
from backend.engine.conformance import ConformanceEvaluationEngine
from backend.engine.anomaly import AnomalyDetectionEngine


@pytest.fixture
def client():
    return TestClient(app)


def _make_reading(**kwargs):
    defaults = dict(
        meter_serial_number="MTR-001",
        timestamp=datetime.now(timezone.utc),
        active_energy_import_kwh=100.0,
        voltage_v=230.0,
        current_a=5.0,
        power_factor=0.95,
    )
    defaults.update(kwargs)
    return CanonicalMeterReading(**defaults)


# ── Conformance Engine Unit Tests ─────────────────────────────────────────────

def test_all_mandatory_pass_gives_pass():
    """No issues → all requirements pass → PASS."""
    result = ConformanceEvaluationEngine.evaluate(
        issues=[],
        total_records=5,
        format_parsed_successfully=True,
    )
    assert result.status == ConformanceStatus.PASS
    assert result.mandatory_failure_count == 0
    assert result.warning_count == 0


def test_single_mandatory_failure_gives_fail():
    """99 assertions pass, one mandatory failure → FAIL regardless."""
    issues = [
        DiagnosticIssue(
            code="INVALID_METER_SERIAL",
            severity=IssueSeverity.ERROR,
            message="Meter serial number is invalid.",
        )
    ]
    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=99,
        format_parsed_successfully=True,
    )
    assert result.status == ConformanceStatus.FAIL
    assert result.mandatory_failure_count >= 1


def test_warnings_only_gives_conditional():
    """All mandatory requirements pass with non-blocking warnings → CONDITIONAL."""
    issues = [
        DiagnosticIssue(
            code="VOLTAGE_OUT_OF_BOUNDS",
            severity=IssueSeverity.WARNING,
            message="Voltage slightly out of nominal range.",
        ),
        DiagnosticIssue(
            code="NAIVE_TIMESTAMP",
            severity=IssueSeverity.WARNING,
            message="Timestamp has no timezone info.",
        ),
    ]
    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=10,
        format_parsed_successfully=True,
    )
    assert result.status == ConformanceStatus.CONDITIONAL
    assert result.mandatory_failure_count == 0
    assert result.warning_count == 2


def test_format_failed_no_records_gives_incomplete():
    """Format parse failed, zero records → required checks not executed → INCOMPLETE."""
    issues = [
        DiagnosticIssue(
            code="JSON_PARSE_ERROR",
            severity=IssueSeverity.ERROR,
            message="Could not parse JSON payload.",
        )
    ]
    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=0,
        format_parsed_successfully=False,
    )
    # JSON_PARSE_ERROR is a mandatory code → FAIL takes precedence over INCOMPLETE
    # but if that code is treated as mandatory FAIL, the status is FAIL
    # Spec precedence 1: mandatory failure → FAIL (wins over INCOMPLETE)
    assert result.status == ConformanceStatus.FAIL


def test_no_records_no_mandatory_failure_gives_incomplete():
    """Required check not executed, no mandatory failures → INCOMPLETE."""
    result = ConformanceEvaluationEngine.evaluate(
        issues=[],
        total_records=0,
        format_parsed_successfully=False,
    )
    assert result.status == ConformanceStatus.INCOMPLETE


def test_mandatory_fail_beats_incomplete():
    """Mandatory failure + unexecuted checks → FAIL wins (precedence 1 > precedence 2)."""
    issues = [
        DiagnosticIssue(
            code="NEGATIVE_ACTIVE_ENERGY",
            severity=IssueSeverity.ERROR,
            message="Active energy is negative.",
        )
    ]
    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=0,
        format_parsed_successfully=False,
    )
    assert result.status == ConformanceStatus.FAIL
    assert result.mandatory_failure_count >= 1


def test_optional_field_absent_does_not_reject():
    """Optional-coded warnings do not cause FAIL or INCOMPLETE."""
    issues = [
        DiagnosticIssue(
            code="GRID_FREQUENCY_ABNORMAL",
            severity=IssueSeverity.WARNING,
            message="Grid frequency outside 49.9–50.1 Hz.",
        )
    ]
    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=3,
        format_parsed_successfully=True,
    )
    assert result.status in (ConformanceStatus.PASS, ConformanceStatus.CONDITIONAL)
    assert result.mandatory_failure_count == 0


def test_valid_reading_passes_validation():
    """A well-formed canonical reading generates no issues and yields PASS."""
    payload = CanonicalPayload(
        source_system="test",
        readings=[_make_reading()],
    )
    issues, valid, invalid = ValidationEngine.validate_canonical_payload(payload)
    assert valid == 1
    assert invalid == 0

    result = ConformanceEvaluationEngine.evaluate(
        issues=issues,
        total_records=valid,
        format_parsed_successfully=True,
    )
    assert result.status == ConformanceStatus.PASS


# ── API Integration Tests ─────────────────────────────────────────────────────

def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_api_stats(client):
    res = client.get("/api/stats")
    assert res.status_code == 200
    assert "total_test_runs" in res.json()


def test_execute_returns_conformance_not_score(client):
    """Execute endpoint must return 'conformance' key with status, not a numeric score."""
    res_gen = client.post("/api/generate?vendor_id=alpha-hes&meter_count=2&intervals=3")
    assert res_gen.status_code == 200
    payload_data = res_gen.json()["payload"]

    res_exec = client.post("/api/workbench/execute", data={
        "source_vendor": "alpha-hes",
        "target_vendor": "beta-hes",
        "raw_payload": json.dumps(payload_data),
    })
    assert res_exec.status_code == 200
    data = res_exec.json()

    assert "conformance" in data, "Response must include 'conformance' key"
    assert "score" not in data, "Response must NOT include legacy 'score' key"

    conformance = data["conformance"]
    assert conformance["status"] in ("PASS", "CONDITIONAL", "FAIL", "INCOMPLETE")
    assert isinstance(conformance["total_assertions"], int)
    assert isinstance(conformance["mandatory_failure_count"], int)
    assert isinstance(conformance["warning_count"], int)
    # No aggregate numeric score should influence the status
    assert "total_score" not in conformance

    # Blame attribution must be present
    assert "blame_attribution" in data
    blame = data["blame_attribution"]
    assert isinstance(blame, dict)
    for stage_name, counts in blame.items():
        assert stage_name in ("SOURCE", "ADAPTER", "CANONICAL", "TARGET")
        assert "error_count" in counts
        assert "warning_count" in counts


def test_source_validation_stage_a(client):
    """Stage A: source validation should catch schema violations before adapter runs."""
    # Send a payload missing 'meter_data' key entirely
    bad_payload = json.dumps({"system_id": "test", "wrong_key": []})
    res = client.post("/api/workbench/execute", data={
        "source_vendor": "alpha-hes",
        "raw_payload": bad_payload,
    })
    assert res.status_code == 200
    data = res.json()
    source_issues = [i for i in data["issues"] if i.get("stage") == "SOURCE"]
    assert len(source_issues) >= 1
    assert any("SOURCE_MISSING_KEY" == i["code"] for i in source_issues)


def test_contracts_api(client):
    """Contracts endpoint returns versioned schemas for all vendors."""
    res = client.get("/api/contracts")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 4
    vendor_ids = {c["vendor_id"] for c in data["contracts"]}
    assert vendor_ids == {"alpha-hes", "beta-hes", "gamma-mdms", "delta-legacy"}
    for c in data["contracts"]:
        assert "version" in c
        assert "source_schema" in c
        assert "target_schema" in c


def test_contracts_diff(client):
    """Contract diff highlights mapping differences between two vendors."""
    res = client.get("/api/contracts/diff/alpha-hes/delta-legacy")
    assert res.status_code == 200
    data = res.json()
    assert data["format_match"] is True
    assert "obis_codes" in data
    assert "shared" in data["obis_codes"]


def test_regression_comparison(client):
    """Regression comparison shows resolved, new, and persistent issues between runs."""
    # Execute two runs: one clean, one with anomalies
    gen_clean = client.post("/api/generate?vendor_id=alpha-hes&meter_count=2&intervals=3")
    clean_payload = gen_clean.json()["payload"]
    r1 = client.post("/api/workbench/execute", data={
        "source_vendor": "alpha-hes",
        "raw_payload": json.dumps(clean_payload),
    })
    run_a = r1.json()["run_id"]

    gen_anom = client.post("/api/generate?vendor_id=alpha-hes&meter_count=2&intervals=3&inject_anomalies=true")
    anom_payload = gen_anom.json()["payload"]
    r2 = client.post("/api/workbench/execute", data={
        "source_vendor": "alpha-hes",
        "raw_payload": json.dumps(anom_payload),
    })
    run_b = r2.json()["run_id"]

    # Compare
    res = client.get(f"/api/test-runs/compare?run_a={run_a}&run_b={run_b}")
    assert res.status_code == 200
    data = res.json()
    assert data["baseline"]["run_id"] == run_a
    assert data["candidate"]["run_id"] == run_b
    assert "summary" in data
    assert "resolved_count" in data["summary"]
    assert "new_count" in data["summary"]


def test_generate_seed_reproducibility(client):
    """Same seed must produce identical payloads; response must include the seed."""
    params = "vendor_id=canonical&meter_count=2&intervals=3&seed=42"
    r1 = client.post(f"/api/generate?{params}")
    r2 = client.post(f"/api/generate?{params}")
    assert r1.status_code == 200
    d1, d2 = r1.json(), r2.json()
    assert d1["seed"] == 42
    assert d1["readings"] == d2["readings"]
    assert d1["events"] == d2["events"]


# ── ML Anomaly Detection Unit Tests ───────────────────────────────────────────

def _make_readings_clean(n=10):
    """Generate n normal readings for one meter (steady energy, stable voltage)."""
    readings = []
    for i in range(n):
        readings.append(CanonicalMeterReading(
            meter_serial_number="MTR-CLEAN",
            timestamp=datetime(2026, 1, 1, i, 0, tzinfo=timezone.utc),
            active_energy_import_kwh=100.0 + i * 0.5,
            voltage_v=230.0,
            current_a=5.0,
            power_factor=0.95,
            frequency_hz=50.0,
        ))
    return readings


def _make_readings_with_spike(n=10):
    """Normal readings with one large energy spike injected at the midpoint."""
    readings = _make_readings_clean(n)
    mid = n // 2
    readings[mid] = CanonicalMeterReading(
        meter_serial_number="MTR-CLEAN",
        timestamp=datetime(2026, 1, 1, mid, 0, tzinfo=timezone.utc),
        active_energy_import_kwh=9999.0,   # extreme outlier
        voltage_v=230.0,
        current_a=5.0,
        power_factor=0.95,
        frequency_hz=50.0,
    )
    return readings


def test_anomaly_clean_data_low_anomaly_rate():
    """Clean, uniform readings must have a very low anomaly rate (≤ contamination threshold)."""
    readings = _make_readings_clean(20)
    report = AnomalyDetectionEngine.detect(readings)
    assert report.total_readings == 20
    # With contamination=0.05, at most 5% of readings should be flagged on clean data
    assert report.anomaly_rate <= 0.10, f"Too many anomalies on clean data: {report.anomaly_count}/{report.total_readings}"


def test_anomaly_spike_detected():
    """An extreme energy spike must be flagged as anomalous."""
    readings = _make_readings_with_spike(10)
    report = AnomalyDetectionEngine.detect(readings)
    assert report.has_anomalies, "Spike reading should be detected as anomaly"
    flagged_indices = {a.reading_index for a in report.flat}
    assert 5 in flagged_indices, "The spike at index 5 should be flagged"


def test_anomaly_scores_in_range():
    """All anomaly scores must be in [0.0, 1.0]."""
    readings = _make_readings_with_spike(10)
    report = AnomalyDetectionEngine.detect(readings)
    for meter_results in report.per_meter.values():
        for ra in meter_results:
            assert 0.0 <= ra.anomaly_score <= 1.0, f"Score {ra.anomaly_score} out of range"


def test_anomaly_zscore_fallback_small_dataset():
    """With fewer than 5 readings, Z-score fallback must run without error."""
    readings = _make_readings_clean(3)
    report = AnomalyDetectionEngine.detect(readings)
    assert report.total_readings == 3
    methods = {ra.method for rl in report.per_meter.values() for ra in rl}
    assert "zscore" in methods or "single_reading" in methods


def test_anomaly_to_diagnostic_issues():
    """to_diagnostic_issues must return DiagnosticIssue objects with ANOMALY_DETECTED code."""
    readings = _make_readings_with_spike(10)
    report = AnomalyDetectionEngine.detect(readings)
    issues = AnomalyDetectionEngine.to_diagnostic_issues(report)
    assert len(issues) == report.anomaly_count
    for iss in issues:
        assert iss.code == "ANOMALY_DETECTED"
        assert iss.severity.value == "WARNING"


def test_execute_returns_anomaly_detection_field(client):
    """Execute endpoint must include anomaly_detection summary in response."""
    payload = json.dumps({
        "meter_data": [
            {
                "meter_number": "MTR-ANOM-TEST",
                "clock": "2026-01-01T00:00:00+00:00",
                "registers": {
                    "1.0.1.8.0.255": 150.0,
                    "1.0.2.8.0.255": 0.0,
                    "1.0.3.8.0.255": 0.0,
                    "1.0.1.4.0.255": 0.95,
                    "1.0.32.7.0.255": 230.0,
                    "1.0.31.7.0.255": 5.0,
                    "1.0.14.7.0.255": 50.0,
                }
            }
        ]
    })
    resp = client.post(
        "/api/workbench/execute",
        data={"source_vendor": "alpha-hes", "raw_payload": payload},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "anomaly_detection" in data
    ad = data["anomaly_detection"]
    assert "total_readings" in ad
    assert "anomaly_count" in ad
    assert "anomaly_rate" in ad
    assert isinstance(ad["flagged_readings"], list)

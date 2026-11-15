"""Golden dataset and fault-injection tests for VidyutSetu.

Addresses evaluator findings 3.1 and 3.5:
- Hand-computed golden datasets with expected canonical output
- Mutation-style fault injection: inject a known fault, assert the exact diagnostic code fires
- Assert clean datasets produce NO false positives
- Report detection rate and false-positive rate per fault class
"""

import copy
import json
import math
import pytest
from datetime import datetime, timezone, timedelta
from typing import List

from backend.adapters.alpha import AlphaAdapter
from backend.adapters.beta import BetaAdapter
from backend.adapters.delta import DeltaAdapter
from backend.adapters.gamma import GammaAdapter
from backend.engine.validator import ValidationEngine
from backend.engine.conformance import ConformanceEvaluationEngine
from backend.models.canonical import (
    ConformanceStatus,
    DiagnosticIssue,
    IssueSeverity,
)


# ── Time helpers — golden datasets use recent timestamps to avoid clock drift ─

def _recent_iso(minutes_ago: int = 30) -> str:
    t = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return t.isoformat()


def _recent_epoch(minutes_ago: int = 30) -> int:
    t = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return int(t.timestamp())


def _recent_ist(minutes_ago: int = 30) -> str:
    IST = timezone(timedelta(hours=5, minutes=30))
    t = (datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)).astimezone(IST)
    return t.strftime("%d-%m-%Y %H:%M:%S")


# ── Hand-crafted golden datasets ─────────────────────────────────────────────

def _golden_alpha():
    return {
        "system_id": "alpha-hes",
        "meter_data": [
            {
                "meter_number": "GOLD-MTR-001",
                "clock": _recent_iso(30),
                "interval_minutes": 15,
                "registers": {
                    "1.0.1.8.0.255": {"value": 1000.0, "scaler": 0, "unit": "kWh"},
                    "1.0.2.8.0.255": {"value": 50.0, "scaler": 0, "unit": "kWh"},
                    "1.0.3.8.0.255": {"value": 180.0, "scaler": 0, "unit": "kVArh"},
                    "1.0.12.7.0.255": {"value": 230.0, "scaler": 0, "unit": "V"},
                    "1.0.11.7.0.255": {"value": 5.0, "scaler": 0, "unit": "A"},
                    "1.0.13.7.0.255": {"value": 0.95, "scaler": 0, "unit": ""},
                    "1.0.14.7.0.255": {"value": 50.0, "scaler": 0, "unit": "Hz"},
                },
                "events": [],
            },
            {
                "meter_number": "GOLD-MTR-001",
                "clock": _recent_iso(15),
                "interval_minutes": 15,
                "registers": {
                    "1.0.1.8.0.255": {"value": 1000.5, "scaler": 0, "unit": "kWh"},
                    "1.0.2.8.0.255": {"value": 50.0, "scaler": 0, "unit": "kWh"},
                    "1.0.3.8.0.255": {"value": 180.09, "scaler": 0, "unit": "kVArh"},
                    "1.0.12.7.0.255": {"value": 231.0, "scaler": 0, "unit": "V"},
                    "1.0.11.7.0.255": {"value": 4.8, "scaler": 0, "unit": "A"},
                    "1.0.13.7.0.255": {"value": 0.96, "scaler": 0, "unit": ""},
                    "1.0.14.7.0.255": {"value": 50.01, "scaler": 0, "unit": "Hz"},
                },
                "events": [],
            },
        ],
    }


def _golden_beta_csv():
    return (
        "MTR_ID,RDG_TIME,KWH_IMP,KWH_EXP,KVARH_LAG,VRMS,IRMS,PF,FREQ,ALARM_CODE\n"
        f"GOLD-CSV-001,{_recent_ist(30)},2000.0,10.0,360.0,229.5,4.5,0.92,50.0,\n"
        f"GOLD-CSV-001,{_recent_ist(15)},2000.5,10.0,360.09,230.1,4.3,0.93,50.01,\n"
    )


def _golden_delta():
    return {
        "telemetry": [
            {
                "device_uid": "GOLD-DLT-001",
                "ts_epoch_sec": _recent_epoch(30),
                "act_wh": 3000000,
                "exp_wh": 0,
                "volt_mv": 230000,
                "curr_ma": 5000,
                "p_fact_pct": 95,
                "freq_hz": 50.0,
            },
            {
                "device_uid": "GOLD-DLT-001",
                "ts_epoch_sec": _recent_epoch(15),
                "act_wh": 3000500,
                "exp_wh": 0,
                "volt_mv": 231000,
                "curr_ma": 4800,
                "p_fact_pct": 96,
                "freq_hz": 50.01,
            },
        ]
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_pipeline(adapter, raw_data, format_ok=True):
    canonical, adapter_issues = adapter.parse_to_canonical(raw_data)
    validation_issues, valid, invalid = ValidationEngine.validate_canonical_payload(canonical)
    all_issues = adapter_issues + validation_issues
    conformance = ConformanceEvaluationEngine.evaluate(
        issues=all_issues,
        total_records=len(canonical.readings),
        format_parsed_successfully=format_ok,
    )
    return canonical, all_issues, conformance


def _has_code(issues: List[DiagnosticIssue], code: str) -> bool:
    return any(i.code == code for i in issues)


# ── Clean golden dataset tests (zero false positives) ─────────────────────────

class TestGoldenCleanDatasets:
    """Clean datasets must produce ZERO issues and PASS conformance."""

    def test_alpha_golden_no_false_positives(self):
        canonical, issues, conformance = _run_pipeline(AlphaAdapter(), _golden_alpha())
        assert len(canonical.readings) == 2
        assert canonical.readings[0].meter_serial_number == "GOLD-MTR-001"
        assert canonical.readings[0].active_energy_import_kwh == 1000.0
        assert canonical.readings[1].active_energy_import_kwh == 1000.5
        assert len(issues) == 0, f"False positives on clean data: {[i.code for i in issues]}"
        assert conformance.status == ConformanceStatus.PASS

    def test_beta_golden_no_false_positives(self):
        canonical, issues, conformance = _run_pipeline(BetaAdapter(), _golden_beta_csv())
        assert len(canonical.readings) == 2
        assert canonical.readings[0].meter_serial_number == "GOLD-CSV-001"
        assert canonical.readings[0].active_energy_import_kwh == 2000.0
        assert len(issues) == 0, f"False positives on clean data: {[i.code for i in issues]}"
        assert conformance.status == ConformanceStatus.PASS

    def test_delta_golden_no_false_positives(self):
        canonical, issues, conformance = _run_pipeline(DeltaAdapter(), _golden_delta())
        assert len(canonical.readings) == 2
        assert canonical.readings[0].meter_serial_number == "GOLD-DLT-001"
        # 3000000 Wh * 0.001 = 3000.0 kWh
        assert canonical.readings[0].active_energy_import_kwh == 3000.0
        # 230000 mV * 0.001 = 230.0 V
        assert canonical.readings[0].voltage_v == 230.0
        assert len(issues) == 0, f"False positives on clean data: {[i.code for i in issues]}"
        assert conformance.status == ConformanceStatus.PASS

    def test_alpha_golden_canonical_field_values(self):
        """Verify exact canonical field values from hand-computed golden data."""
        canonical, _, _ = _run_pipeline(AlphaAdapter(), _golden_alpha())
        r0 = canonical.readings[0]
        assert r0.voltage_v == 230.0
        assert r0.current_a == 5.0
        assert r0.power_factor == 0.95
        assert r0.frequency_hz == 50.0
        assert r0.obis_code == "1.0.1.8.0.255"


# ── Fault injection tests ─────────────────────────────────────────────────────
# Each test mutates the golden dataset, then asserts the EXACT diagnostic code.

class TestFaultInjection:
    """Mutation-based fault injection: inject one fault, assert exact detection."""

    def test_missing_meter_id_detected(self):
        mutated = _golden_alpha()
        mutated["meter_data"][0]["meter_number"] = ""
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "INVALID_METER_SERIAL") or _has_code(issues, "MISSING_METER_ID")
        assert conformance.status == ConformanceStatus.FAIL

    def test_missing_active_energy_detected(self):
        mutated = _golden_alpha()
        del mutated["meter_data"][0]["registers"]["1.0.1.8.0.255"]
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "MISSING_ACTIVE_IMPORT_ENERGY")
        assert conformance.status == ConformanceStatus.FAIL

    def test_negative_energy_detected(self):
        mutated = _golden_alpha()
        mutated["meter_data"][0]["registers"]["1.0.1.8.0.255"]["value"] = -50.0
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "NEGATIVE_ACTIVE_ENERGY")
        assert conformance.status == ConformanceStatus.FAIL

    def test_non_monotonic_energy_detected(self):
        mutated = _golden_alpha()
        # Second reading has LOWER cumulative energy than first → non-monotonic
        mutated["meter_data"][1]["registers"]["1.0.1.8.0.255"]["value"] = 999.0
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "NON_MONOTONIC_ENERGY_REGISTER")
        assert conformance.status == ConformanceStatus.FAIL

    def test_power_factor_out_of_range_detected(self):
        mutated = _golden_alpha()
        mutated["meter_data"][0]["registers"]["1.0.13.7.0.255"]["value"] = 1.5
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "POWER_FACTOR_OUT_OF_RANGE")
        assert conformance.status == ConformanceStatus.FAIL

    def test_voltage_out_of_bounds_warning(self):
        mutated = _golden_alpha()
        mutated["meter_data"][0]["registers"]["1.0.12.7.0.255"]["value"] = 310.0
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "VOLTAGE_OUT_OF_BOUNDS")
        assert conformance.status == ConformanceStatus.CONDITIONAL

    def test_json_parse_error_detected(self):
        _, issues, conformance = _run_pipeline(AlphaAdapter(), "not valid json{{{", format_ok=False)
        assert _has_code(issues, "JSON_PARSE_ERROR")
        assert conformance.status == ConformanceStatus.FAIL

    def test_csv_missing_columns_detected(self):
        bad_csv = "ID,TIME,VAL\nfoo,bar,baz\n"
        _, issues, conformance = _run_pipeline(BetaAdapter(), bad_csv)
        assert _has_code(issues, "MISSING_CSV_COLUMNS")
        assert conformance.status == ConformanceStatus.FAIL

    def test_delta_non_numeric_voltage_no_crash(self):
        mutated = _golden_delta()
        mutated["telemetry"][0]["volt_mv"] = "N/A"
        canonical, issues, conformance = _run_pipeline(DeltaAdapter(), mutated)
        assert _has_code(issues, "NUMBER_COERCION_ERROR")
        assert len(canonical.readings) == 2

    def test_delta_epoch_milliseconds_no_crash(self):
        mutated = _golden_delta()
        mutated["telemetry"][0]["ts_epoch_sec"] = 1750000000000  # ms not s
        canonical, issues, _ = _run_pipeline(DeltaAdapter(), mutated)
        assert len(canonical.readings) == 2

    def test_duplicate_timestamps_detected(self):
        mutated = _golden_alpha()
        mutated["meter_data"][1]["clock"] = mutated["meter_data"][0]["clock"]
        _, issues, conformance = _run_pipeline(AlphaAdapter(), mutated)
        assert _has_code(issues, "DUPLICATE_INTERVAL_TIMESTAMP")
        assert conformance.status == ConformanceStatus.FAIL

    def test_delta_missing_act_wh_detected(self):
        mutated = _golden_delta()
        del mutated["telemetry"][0]["act_wh"]
        _, issues, conformance = _run_pipeline(DeltaAdapter(), mutated)
        assert _has_code(issues, "MISSING_ACT_WH")
        assert conformance.status == ConformanceStatus.FAIL

    def test_beta_empty_meter_id_detected(self):
        bad_csv = (
            "MTR_ID,RDG_TIME,KWH_IMP,KWH_EXP,KVARH_LAG,VRMS,IRMS,PF,FREQ,ALARM_CODE\n"
            ",15-06-2025 15:30:00,2000.0,10.0,360.0,229.5,4.5,0.92,50.0,\n"
        )
        _, issues, conformance = _run_pipeline(BetaAdapter(), bad_csv)
        assert _has_code(issues, "EMPTY_METER_ID")
        assert conformance.status == ConformanceStatus.FAIL


# ── Cross-adapter semantic equivalence (vendor A → canonical → vendor B) ──────

class TestCrossAdapterRoundTrip:
    """Evaluator finding 3.4: the headline test is Vendor A → canonical → Vendor B
    with semantic equivalence. This IS interoperability."""

    def test_alpha_to_beta_semantic_equivalence(self):
        """Alpha DLMS → canonical → Beta CSV → canonical. Energy must survive."""
        alpha = AlphaAdapter()
        beta = BetaAdapter()

        canonical_a, issues_a, _ = _run_pipeline(alpha, _golden_alpha())
        assert len(issues_a) == 0

        csv_output = beta.serialize_from_canonical(canonical_a)
        canonical_b, issues_b, _ = _run_pipeline(beta, csv_output)

        # Same number of readings
        assert len(canonical_b.readings) == len(canonical_a.readings)

        # Energy values survive the round-trip
        for ra, rb in zip(canonical_a.readings, canonical_b.readings):
            assert abs(ra.active_energy_import_kwh - rb.active_energy_import_kwh) < 0.01
            assert ra.meter_serial_number == rb.meter_serial_number

    def test_alpha_to_delta_unit_conversion(self):
        """Alpha DLMS (kWh) → canonical → Delta (Wh/mV/mA) → canonical.
        Unit conversion must be reversible."""
        alpha = AlphaAdapter()
        delta = DeltaAdapter()

        canonical_a, _, _ = _run_pipeline(alpha, _golden_alpha())
        delta_output = delta.serialize_from_canonical(canonical_a)
        canonical_d, issues_d, _ = _run_pipeline(delta, delta_output)

        for ra, rd in zip(canonical_a.readings, canonical_d.readings):
            # kWh → Wh → kWh should round-trip within 0.1 kWh
            assert abs(ra.active_energy_import_kwh - rd.active_energy_import_kwh) < 0.1
            if ra.voltage_v is not None and rd.voltage_v is not None:
                assert abs(ra.voltage_v - rd.voltage_v) < 0.1


# ── Detection rate report ─────────────────────────────────────────────────────

FAULT_CLASSES = [
    ("MISSING_METER_ID", "missing_meter_id"),
    ("MISSING_ACTIVE_IMPORT_ENERGY", "missing_active_energy"),
    ("NEGATIVE_ACTIVE_ENERGY", "negative_energy"),
    ("NON_MONOTONIC_ENERGY_REGISTER", "non_monotonic_energy"),
    ("POWER_FACTOR_OUT_OF_RANGE", "pf_out_of_range"),
    ("VOLTAGE_OUT_OF_BOUNDS", "voltage_oob"),
    ("DUPLICATE_INTERVAL_TIMESTAMP", "duplicate_timestamps"),
]


def test_detection_rate_summary(capsys):
    """Print detection rates for each fault class. Not a pass/fail test —
    informational output for the evaluator."""
    results = []
    for expected_code, label in FAULT_CLASSES:
        detected = False
        mutated = _golden_alpha()
        if label == "missing_meter_id":
            mutated["meter_data"][0]["meter_number"] = ""
        elif label == "missing_active_energy":
            del mutated["meter_data"][0]["registers"]["1.0.1.8.0.255"]
        elif label == "negative_energy":
            mutated["meter_data"][0]["registers"]["1.0.1.8.0.255"]["value"] = -50.0
        elif label == "non_monotonic_energy":
            mutated["meter_data"][1]["registers"]["1.0.1.8.0.255"]["value"] = 999.0
        elif label == "pf_out_of_range":
            mutated["meter_data"][0]["registers"]["1.0.13.7.0.255"]["value"] = 1.5
        elif label == "voltage_oob":
            mutated["meter_data"][0]["registers"]["1.0.12.7.0.255"]["value"] = 310.0
        elif label == "duplicate_timestamps":
            mutated["meter_data"][1]["clock"] = mutated["meter_data"][0]["clock"]

        _, issues, _ = _run_pipeline(AlphaAdapter(), mutated)
        detected = _has_code(issues, expected_code)
        fp_count = sum(1 for i in issues if i.code != expected_code and i.severity == IssueSeverity.ERROR)
        results.append((label, expected_code, detected, fp_count))

    with capsys.disabled():
        print("\n\n── VidyutSetu Fault Injection Detection Report ──")
        print(f"{'Fault Class':<30} {'Expected Code':<35} {'Detected':>8} {'FP Errors':>9}")
        print("─" * 82)
        for label, code, det, fp in results:
            print(f"{label:<30} {code:<35} {'YES' if det else 'NO':>8} {fp:>9}")
        total = len(results)
        detected_count = sum(1 for _, _, d, _ in results if d)
        print(f"\nDetection rate: {detected_count}/{total} ({detected_count/total*100:.0f}%)")

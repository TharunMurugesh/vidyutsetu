"""Validation Engine for VidyutSetu AMI Interoperability Workbench.
Validates Canonical and Vendor Payloads against:
- Schema rules
- Mandatory & optional fields
- Numeric ranges and physical electrical boundaries
- Timestamps and timezone sanity
- Monotonic energy accumulation (no negative step jumps)
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple
from backend.models.canonical import (
    CanonicalPayload,
    CanonicalMeterReading,
    DiagnosticIssue,
    EnergyRegisterType,
    IssueSeverity,
    QualityCode,
)

# Physical Electrical Sanity Limits (Grid standard: 230V L-N / 400V L-L, 50Hz)
MIN_VOLTAGE_V = 160.0
MAX_VOLTAGE_V = 300.0
MAX_CURRENT_A = 120.0
MIN_FREQUENCY_HZ = 47.0
MAX_FREQUENCY_HZ = 53.0
MAX_CLOCK_DRIFT_HOURS = 24.0


class ValidationEngine:
    """Rigorous semantic and physical validation engine for smart meter data."""

    @classmethod
    def validate_canonical_payload(cls, payload: CanonicalPayload) -> Tuple[List[DiagnosticIssue], int, int]:
        issues: List[DiagnosticIssue] = []
        valid_count = 0
        invalid_count = 0

        if not payload.readings and not payload.events:
            issues.append(DiagnosticIssue(
                code="EMPTY_PAYLOAD",
                severity=IssueSeverity.WARNING,
                message="Payload contains no meter readings or event notifications."
            ))

        now_utc = datetime.now(timezone.utc)
        meter_history: Dict[str, List[CanonicalMeterReading]] = {}

        for idx, reading in enumerate(payload.readings):
            item_issues: List[DiagnosticIssue] = []
            meter_id = reading.meter_serial_number

            # Check 1: Meter Identifier
            if not meter_id or meter_id.strip() in ("", "UNKNOWN", "null", "undefined"):
                item_issues.append(DiagnosticIssue(
                    code="INVALID_METER_SERIAL",
                    field=f"readings[{idx}].meter_serial_number",
                    severity=IssueSeverity.ERROR,
                    message="Missing or empty meter serial identifier.",
                    observed_value=meter_id,
                    suggested_fix="Assign valid alphanumeric utility meter serial number (e.g. 'MTR-100234')."
                ))

            # Check 2: Timestamp Sanity & Clock Drift
            ts = reading.timestamp
            if ts.tzinfo is None:
                # Naive timestamp warning
                item_issues.append(DiagnosticIssue(
                    code="NAIVE_TIMESTAMP",
                    field=f"readings[{idx}].timestamp",
                    severity=IssueSeverity.WARNING,
                    message=f"Timestamp {ts} has no explicit timezone offset. Assumed UTC.",
                    suggested_fix="Explicitly tag timestamps with ISO 8601 UTC offset (Z or +00:00)."
                ))
                ts = ts.replace(tzinfo=timezone.utc)

            time_diff = abs((ts - now_utc).total_seconds()) / 3600.0
            if time_diff > (MAX_CLOCK_DRIFT_HOURS * 30):  # More than 30 days drift
                item_issues.append(DiagnosticIssue(
                    code="EXCESSIVE_CLOCK_DRIFT",
                    field=f"readings[{idx}].timestamp",
                    severity=IssueSeverity.WARNING,
                    message=f"Reading timestamp {ts.isoformat()} deviates significantly from system time ({time_diff:.1f} hours).",
                    observed_value=ts.isoformat(),
                    suggested_fix="Synchronize meter internal RTC with HES NTP time."
                ))

            # Future timestamps
            if ts > (now_utc + timedelta(hours=1)):
                item_issues.append(DiagnosticIssue(
                    code="FUTURE_TIMESTAMP",
                    field=f"readings[{idx}].timestamp",
                    severity=IssueSeverity.ERROR,
                    message=f"Reading timestamp {ts.isoformat()} is in the future.",
                    observed_value=ts.isoformat(),
                    suggested_fix="Verify meter RTC clock and time synchronization."
                ))

            # Check 3: Cumulative Active Energy Import
            if reading.active_energy_import_kwh < 0.0:
                item_issues.append(DiagnosticIssue(
                    code="NEGATIVE_ACTIVE_ENERGY",
                    field=f"readings[{idx}].active_energy_import_kwh",
                    severity=IssueSeverity.ERROR,
                    message=f"Negative cumulative active import energy: {reading.active_energy_import_kwh} kWh",
                    observed_value=reading.active_energy_import_kwh,
                    suggested_fix="Energy registers must be non-negative cumulative values."
                ))

            # Check 4: Voltage Physical Limits
            if reading.voltage_v is not None:
                if reading.voltage_v < 50.0:
                    item_issues.append(DiagnosticIssue(
                        code="VOLTAGE_NEAR_ZERO",
                        field=f"readings[{idx}].voltage_v",
                        severity=IssueSeverity.WARNING,
                        message=f"Very low voltage detected ({reading.voltage_v} V). Possible outage or PT disconnect.",
                        observed_value=reading.voltage_v
                    ))
                elif reading.voltage_v < MIN_VOLTAGE_V or reading.voltage_v > MAX_VOLTAGE_V:
                    item_issues.append(DiagnosticIssue(
                        code="VOLTAGE_OUT_OF_BOUNDS",
                        field=f"readings[{idx}].voltage_v",
                        severity=IssueSeverity.WARNING,
                        message=f"RMS Voltage {reading.voltage_v}V exceeds grid nominal boundaries ({MIN_VOLTAGE_V}V - {MAX_VOLTAGE_V}V).",
                        observed_value=reading.voltage_v,
                        suggested_fix="Check if voltage represents phase-to-phase or check PT ratio multiplier."
                    ))

            # Check 5: Current Limits
            if reading.current_a is not None:
                if reading.current_a < 0.0:
                    item_issues.append(DiagnosticIssue(
                        code="NEGATIVE_CURRENT",
                        field=f"readings[{idx}].current_a",
                        severity=IssueSeverity.ERROR,
                        message=f"Negative current {reading.current_a} A observed on single phase register.",
                        observed_value=reading.current_a,
                        suggested_fix="RMS current magnitude should be positive; check current direction or reverse current flag."
                    ))
                elif reading.current_a > MAX_CURRENT_A:
                    item_issues.append(DiagnosticIssue(
                        code="OVERCURRENT_ALARM",
                        field=f"readings[{idx}].current_a",
                        severity=IssueSeverity.WARNING,
                        message=f"Current {reading.current_a} A exceeds direct-connected meter continuous rating ({MAX_CURRENT_A} A).",
                        observed_value=reading.current_a
                    ))

            # Check 6: Power Factor Limits
            if reading.power_factor is not None:
                if reading.power_factor < -1.0 or reading.power_factor > 1.0:
                    item_issues.append(DiagnosticIssue(
                        code="POWER_FACTOR_OUT_OF_RANGE",
                        field=f"readings[{idx}].power_factor",
                        severity=IssueSeverity.ERROR,
                        message=f"Power factor {reading.power_factor} outside valid range [-1.0, 1.0].",
                        observed_value=reading.power_factor,
                        suggested_fix="Ensure power factor is normalized to [-1.0, 1.0] rather than percentage (0-100%)."
                    ))

            # Check 7: Grid Frequency
            if reading.frequency_hz is not None:
                if reading.frequency_hz < MIN_FREQUENCY_HZ or reading.frequency_hz > MAX_FREQUENCY_HZ:
                    item_issues.append(DiagnosticIssue(
                        code="GRID_FREQUENCY_ABNORMAL",
                        field=f"readings[{idx}].frequency_hz",
                        severity=IssueSeverity.WARNING,
                        message=f"Grid frequency {reading.frequency_hz} Hz out of nominal Indian grid range (47.0 - 53.0 Hz).",
                        observed_value=reading.frequency_hz
                    ))

            # Group for sequence / monotonicity check
            meter_history.setdefault(meter_id, []).append(reading)

            if any(iss.severity == IssueSeverity.ERROR for iss in item_issues):
                invalid_count += 1
                reading.quality_code = QualityCode.MALFORMED
            else:
                valid_count += 1
                if any(iss.severity == IssueSeverity.WARNING for iss in item_issues):
                    reading.quality_code = QualityCode.SUSPECT
                else:
                    reading.quality_code = QualityCode.VALID

            issues.extend(item_issues)

        # Check 8: Monotonic Energy Accumulation & Sequence Check
        for meter_id, readings_list in meter_history.items():
            if len(readings_list) < 2:
                continue
            sorted_readings = sorted(readings_list, key=lambda r: r.timestamp)
            for i in range(1, len(sorted_readings)):
                prev = sorted_readings[i - 1]
                curr = sorted_readings[i]

                # Duplicate timestamps
                if curr.timestamp == prev.timestamp:
                    issues.append(DiagnosticIssue(
                        code="DUPLICATE_INTERVAL_TIMESTAMP",
                        field=f"meter[{meter_id}].timestamp",
                        severity=IssueSeverity.ERROR,
                        message=f"Duplicate reading timestamps ({curr.timestamp.isoformat()}) for meter {meter_id}.",
                        suggested_fix="Deduplicate interval blocks or verify interval sequencing."
                    ))

                # Monotonicity applies only to cumulative registers, not interval deltas
                if curr.register_type == EnergyRegisterType.CUMULATIVE and curr.active_energy_import_kwh < prev.active_energy_import_kwh:
                    drop = prev.active_energy_import_kwh - curr.active_energy_import_kwh
                    issues.append(DiagnosticIssue(
                        code="NON_MONOTONIC_ENERGY_REGISTER",
                        field=f"meter[{meter_id}].active_energy_import_kwh",
                        severity=IssueSeverity.ERROR,
                        message=f"Cumulative energy register decreased from {prev.active_energy_import_kwh} to {curr.active_energy_import_kwh} kWh (drop of {drop:.4f} kWh). Possible meter rollover or tamper reset.",
                        suggested_fix="Investigate meter reset event or implement rollover compensation."
                    ))

        return issues, valid_count, invalid_count

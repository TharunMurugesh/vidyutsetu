"""Vendor Beta Adapter: Flat CSV Load Survey HES format.

Beta HES exports load survey files in CSV format with typical Indian utility headers:
Columns: MTR_ID, RDG_TIME, KWH_IMP, KWH_EXP, KVARH_LAG, VRMS, IRMS, PF, FREQ, ALARM_CODE
Time format: DD-MM-YYYY HH:mm:ss (Indian Standard Time or local utility time)
"""

import io
import csv
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple
from backend.adapters.base import BaseAdapter
from backend.models.canonical import (
    CanonicalPayload,
    CanonicalMeterReading,
    CanonicalMeterEvent,
    DiagnosticIssue,
    IssueSeverity,
    ValidationStage,
    QualityCode,
    EventCode,
    EventSeverity
)
from backend.models.vendor import VendorProfile

DEFAULT_BETA_PROFILE = VendorProfile(
    vendor_id="beta-hes",
    name="Beta HES (Proprietary CSV)",
    system_type="HES",
    format_type="csv",
    protocol="PROPRIETARY_CSV",
    version="2.1",
    description="Flat CSV load survey records with legacy utility headers and local Indian timestamps (IST UTC+05:30).",
    event_mappings={
        "MAG_TAMPER": "TAMPER_MAGNETIC",
        "COV_OPEN": "TAMPER_COVER_OPEN",
        "PWR_FAIL": "POWER_OUTAGE",
        "PWR_RES": "POWER_RESTORED",
        "V_LOW": "VOLTAGE_SAG",
        "V_HIGH": "VOLTAGE_SWELL",
        "REV_CURR": "REVERSE_CURRENT"
    }
)

IST = timezone(timedelta(hours=5, minutes=30))

_CSV_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _sanitize_csv_cell(value: str) -> str:
    """Prevent CSV formula injection by prefixing dangerous cells with a single-quote."""
    if value and value[0] in _CSV_FORMULA_PREFIXES:
        return f"'{value}"
    return value


class BetaAdapter(BaseAdapter):
    """Adapter for Beta CSV Load Survey HES."""

    def __init__(self, profile: VendorProfile = None):
        super().__init__(profile or DEFAULT_BETA_PROFILE)

    REQUIRED_COLUMNS = {"MTR_ID", "RDG_TIME", "KWH_IMP"}

    def validate_source(self, raw_data: Any) -> List[DiagnosticIssue]:
        issues = super().validate_source(raw_data)
        if isinstance(raw_data, str) and raw_data.strip():
            lines = raw_data.strip().splitlines()
            if lines:
                headers = {h.strip() for h in lines[0].split(",")}
                missing = self.REQUIRED_COLUMNS - headers
                if missing:
                    issues.append(DiagnosticIssue(
                        code="SOURCE_MISSING_COLUMNS",
                        severity=IssueSeverity.ERROR,
                        message=f"CSV header missing required columns: {', '.join(sorted(missing))}.",
                        stage=ValidationStage.SOURCE,
                    ))
                if len(lines) < 2:
                    issues.append(DiagnosticIssue(
                        code="SOURCE_NO_DATA_ROWS",
                        severity=IssueSeverity.WARNING,
                        message="CSV has header but no data rows.",
                        stage=ValidationStage.SOURCE,
                    ))
        return issues

    def parse_to_canonical(self, raw_data: Any) -> Tuple[CanonicalPayload, List[DiagnosticIssue]]:
        issues: List[DiagnosticIssue] = []
        readings: List[CanonicalMeterReading] = []
        events: List[CanonicalMeterEvent] = []

        if not isinstance(raw_data, str):
            issues.append(DiagnosticIssue(
                code="INVALID_CSV_INPUT",
                severity=IssueSeverity.ERROR,
                message=f"Expected CSV string data, got {type(raw_data).__name__}"
            ))
            return CanonicalPayload(source_system=self.profile.vendor_id), issues

        try:
            f = io.StringIO(raw_data.strip())
            reader = csv.DictReader(f)
        except Exception as e:
            issues.append(DiagnosticIssue(
                code="CSV_PARSE_FAILED",
                severity=IssueSeverity.ERROR,
                message=f"Failed to read CSV text: {str(e)}",
                suggested_fix="Ensure valid comma-separated values with a header row."
            ))
            return CanonicalPayload(source_system=self.profile.vendor_id), issues

        fieldnames = [fn.strip() for fn in (reader.fieldnames or [])]
        expected_cols = {"MTR_ID", "RDG_TIME", "KWH_IMP"}
        missing_cols = expected_cols - set(fieldnames)
        if missing_cols:
            issues.append(DiagnosticIssue(
                code="MISSING_CSV_COLUMNS",
                severity=IssueSeverity.ERROR,
                message=f"Missing essential CSV headers: {list(missing_cols)}",
                suggested_fix="Ensure CSV header includes MTR_ID, RDG_TIME, and KWH_IMP."
            ))

        for row_idx, row in enumerate(reader, start=2):
            meter_id = row.get("MTR_ID", "").strip()
            if not meter_id:
                issues.append(DiagnosticIssue(
                    code="EMPTY_METER_ID",
                    field=f"Row {row_idx}: MTR_ID",
                    severity=IssueSeverity.ERROR,
                    message="Row missing MTR_ID",
                    suggested_fix="Provide non-empty MTR_ID value."
                ))
                continue

            # Parse timestamp: support DD-MM-YYYY HH:MM:SS or ISO
            time_str = row.get("RDG_TIME", "").strip()
            parsed_time = None
            for fmt in ("%d-%m-%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                try:
                    dt = datetime.strptime(time_str, fmt)
                    # Beta format represents Indian Standard Time (UTC+5:30)
                    dt_ist = dt.replace(tzinfo=IST)
                    parsed_time = dt_ist.astimezone(timezone.utc)
                    break
                except ValueError:
                    continue

            if not parsed_time:
                issues.append(DiagnosticIssue(
                    code="INVALID_CSV_TIMESTAMP",
                    field=f"Row {row_idx}: RDG_TIME",
                    severity=IssueSeverity.WARNING,
                    message=f"Could not parse timestamp '{time_str}', expected DD-MM-YYYY HH:mm:ss",
                    observed_value=time_str,
                    suggested_fix="Format as DD-MM-YYYY HH:mm:ss or ISO 8601"
                ))
                parsed_time = datetime.now(timezone.utc)

            # Parse energy and electrical registers
            def parse_float_safe(key: str, default: float = 0.0) -> float:
                val = row.get(key, "").strip()
                if not val:
                    return default
                try:
                    return float(val)
                except ValueError:
                    issues.append(DiagnosticIssue(
                        code="NUMBER_COERCION_ERROR",
                        field=f"Row {row_idx}: {key}",
                        severity=IssueSeverity.WARNING,
                        message=f"Cannot coerce '{val}' into numeric value",
                        observed_value=val
                    ))
                    return default

            kwh_imp = parse_float_safe("KWH_IMP", 0.0)
            kwh_exp = parse_float_safe("KWH_EXP", 0.0)
            kvarh_lag = parse_float_safe("KVARH_LAG", 0.0)
            vrms = parse_float_safe("VRMS", None) if "VRMS" in row and row["VRMS"].strip() else None
            irms = parse_float_safe("IRMS", None) if "IRMS" in row and row["IRMS"].strip() else None
            pf = parse_float_safe("PF", None) if "PF" in row and row["PF"].strip() else None
            freq = parse_float_safe("FREQ", 50.0) if "FREQ" in row and row["FREQ"].strip() else 50.0

            readings.append(CanonicalMeterReading(
                meter_serial_number=meter_id,
                timestamp=parsed_time,
                interval_minutes=int(row.get("INTERVAL_MIN", 15)),
                active_energy_import_kwh=round(kwh_imp, 4),
                active_energy_export_kwh=round(kwh_exp, 4),
                reactive_energy_kvarh=round(kvarh_lag, 4),
                voltage_v=round(vrms, 2) if vrms is not None else None,
                current_a=round(irms, 3) if irms is not None else None,
                power_factor=round(pf, 3) if pf is not None else None,
                frequency_hz=round(freq, 2),
                quality_code=QualityCode.VALID,
                raw_metadata={"csv_row_number": row_idx}
            ))

            # Alarm codes
            alarm_str = row.get("ALARM_CODE", "").strip()
            if alarm_str:
                for single_alarm in alarm_str.split(";"):
                    code = single_alarm.strip()
                    if not code:
                        continue
                    mapped_evt = self.profile.event_mappings.get(code, "OTHER_EVENT")
                    try:
                        enum_evt = EventCode(mapped_evt)
                    except ValueError:
                        enum_evt = EventCode.OTHER_EVENT

                    events.append(CanonicalMeterEvent(
                        meter_serial_number=meter_id,
                        event_code=enum_evt,
                        timestamp=parsed_time,
                        raw_vendor_code=code,
                        severity=EventSeverity.CRITICAL if "TAMPER" in enum_evt.value or "OUTAGE" in enum_evt.value else EventSeverity.WARNING,
                        description=f"Beta alarm: {code}"
                    ))

        return CanonicalPayload(
            source_system=self.profile.vendor_id,
            readings=readings,
            events=events
        ), issues

    def serialize_from_canonical(self, canonical: CanonicalPayload) -> str:
        """Serialize canonical model to Beta CSV format with IST timestamps."""
        output = io.StringIO()
        fieldnames = ["MTR_ID", "RDG_TIME", "KWH_IMP", "KWH_EXP", "KVARH_LAG", "VRMS", "IRMS", "PF", "FREQ", "ALARM_CODE"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for r in canonical.readings:
            # Convert UTC to IST for Beta output
            ist_time = r.timestamp.astimezone(IST)
            formatted_time = ist_time.strftime("%d-%m-%Y %H:%M:%S")

            matching_events = [e for e in canonical.events if e.meter_serial_number == r.meter_serial_number]
            rev_map = {v: k for k, v in self.profile.event_mappings.items()}
            alarms = [rev_map.get(e.event_code.value, "GENERIC") for e in matching_events]

            writer.writerow({
                "MTR_ID": _sanitize_csv_cell(r.meter_serial_number),
                "RDG_TIME": formatted_time,
                "KWH_IMP": f"{r.active_energy_import_kwh:.4f}",
                "KWH_EXP": f"{(r.active_energy_export_kwh or 0.0):.4f}",
                "KVARH_LAG": f"{(r.reactive_energy_kvarh or 0.0):.4f}",
                "VRMS": f"{r.voltage_v:.2f}" if r.voltage_v is not None else "",
                "IRMS": f"{r.current_a:.3f}" if r.current_a is not None else "",
                "PF": f"{r.power_factor:.3f}" if r.power_factor is not None else "",
                "FREQ": f"{(r.frequency_hz or 50.0):.2f}",
                "ALARM_CODE": ";".join(alarms)
            })

        return output.getvalue()

    def validate_target(self, serialized_output: Any) -> List[DiagnosticIssue]:
        issues = super().validate_target(serialized_output)
        if isinstance(serialized_output, str) and serialized_output.strip():
            lines = serialized_output.strip().splitlines()
            headers = {h.strip() for h in lines[0].split(",")}
            missing = self.REQUIRED_COLUMNS - headers
            if missing:
                issues.append(DiagnosticIssue(
                    code="TARGET_MISSING_COLUMNS",
                    severity=IssueSeverity.ERROR,
                    message=f"Target CSV missing required columns: {', '.join(sorted(missing))}.",
                    stage=ValidationStage.TARGET,
                ))
            if len(lines) < 2:
                issues.append(DiagnosticIssue(
                    code="TARGET_EMPTY_OUTPUT",
                    severity=IssueSeverity.WARNING,
                    message="Target CSV has header but no data rows.",
                    stage=ValidationStage.TARGET,
                ))
        return issues

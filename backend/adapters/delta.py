"""Vendor Delta Adapter: Legacy Proprietary JSON HES format.

Delta HES produces idiosyncratic flat JSON payloads:
- device_uid (meter serial number)
- ts_epoch_sec or timestamp
- act_wh (Active energy in Watt-hours, needing 0.001 multiplier to kWh)
- exp_wh (Export energy in Watt-hours)
- volt_mv (Voltage in millivolts, needing 0.001 multiplier to V)
- curr_ma (Current in milliamperes, needing 0.001 multiplier to A)
- p_fact_pct (Power factor in percentage 0-100, needing 0.01 multiplier)
- alarm_tag (Proprietary alarms: TAMPER_MAG, PWR_LOSS, etc.)
"""

import json
from datetime import datetime, timezone
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

DEFAULT_DELTA_PROFILE = VendorProfile(
    vendor_id="delta-legacy",
    name="Delta HES (Legacy Proprietary)",
    system_type="HES",
    format_type="json",
    protocol="PROPRIETARY_JSON",
    version="1.0.8-legacy",
    description="Legacy proprietary JSON using milli-units (Wh, mV, mA) and integer percentage power factor.",
    event_mappings={
        "TAMPER_MAG": "TAMPER_MAGNETIC",
        "TAMPER_BOX": "TAMPER_COVER_OPEN",
        "PWR_LOSS": "POWER_OUTAGE",
        "PWR_RESTORE": "POWER_RESTORED",
        "VOLT_DIP": "VOLTAGE_SAG",
        "VOLT_SPIKE": "VOLTAGE_SWELL"
    }
)


class DeltaAdapter(BaseAdapter):
    """Adapter for Delta Legacy Proprietary JSON HES."""

    def __init__(self, profile: VendorProfile = None):
        super().__init__(profile or DEFAULT_DELTA_PROFILE)

    def validate_source(self, raw_data: Any) -> List[DiagnosticIssue]:
        issues = super().validate_source(raw_data)
        data = raw_data
        if isinstance(raw_data, str):
            try:
                data = json.loads(raw_data)
            except Exception:
                issues.append(DiagnosticIssue(
                    code="SOURCE_JSON_INVALID",
                    severity=IssueSeverity.ERROR,
                    message="Delta payload is not valid JSON.",
                    stage=ValidationStage.SOURCE,
                ))
                return issues
        if isinstance(data, dict):
            readings_list = data.get("readings", [])
            if not isinstance(readings_list, list):
                issues.append(DiagnosticIssue(
                    code="SOURCE_MISSING_KEY",
                    severity=IssueSeverity.ERROR,
                    field="readings",
                    message="Delta payload missing required 'readings' array.",
                    stage=ValidationStage.SOURCE,
                ))
            else:
                for idx, rec in enumerate(readings_list):
                    if not isinstance(rec, dict):
                        continue
                    if not rec.get("device_uid"):
                        issues.append(DiagnosticIssue(
                            code="SOURCE_MISSING_FIELD",
                            severity=IssueSeverity.ERROR,
                            field=f"readings[{idx}].device_uid",
                            message=f"Record {idx} missing device_uid.",
                            stage=ValidationStage.SOURCE,
                        ))
        return issues

    def parse_to_canonical(self, raw_data: Any) -> Tuple[CanonicalPayload, List[DiagnosticIssue]]:
        issues: List[DiagnosticIssue] = []
        readings: List[CanonicalMeterReading] = []
        events: List[CanonicalMeterEvent] = []

        if isinstance(raw_data, str):
            try:
                data = json.loads(raw_data)
            except Exception as e:
                issues.append(DiagnosticIssue(
                    code="JSON_PARSE_ERROR",
                    severity=IssueSeverity.ERROR,
                    message=f"Failed to parse Delta JSON: {str(e)}"
                ))
                return CanonicalPayload(source_system=self.profile.vendor_id), issues
        elif isinstance(raw_data, dict):
            data = raw_data
        elif isinstance(raw_data, list):
            data = {"telemetry": raw_data}
        else:
            issues.append(DiagnosticIssue(
                code="UNSUPPORTED_DATA_TYPE",
                severity=IssueSeverity.ERROR,
                message=f"Expected JSON str, dict, or list for Delta, got {type(raw_data).__name__}"
            ))
            return CanonicalPayload(source_system=self.profile.vendor_id), issues

        records = data.get("telemetry") or data.get("records") or data.get("data")
        if records is None and isinstance(data, dict) and "device_uid" in data:
            records = [data]
        elif not isinstance(records, list):
            issues.append(DiagnosticIssue(
                code="INVALID_TELEMETRY_STRUCTURE",
                severity=IssueSeverity.ERROR,
                message="Expected 'telemetry' list in Delta JSON"
            ))
            records = []

        for idx, rec in enumerate(records):
            meter_id = rec.get("device_uid") or rec.get("meter_sn")
            if not meter_id:
                issues.append(DiagnosticIssue(
                    code="MISSING_DEVICE_UID",
                    field=f"telemetry[{idx}].device_uid",
                    severity=IssueSeverity.ERROR,
                    message="Missing device_uid in Delta record"
                ))
                continue

            # Timestamp parsing — guard against epoch in milliseconds
            ts_raw = rec.get("ts_epoch_sec") or rec.get("timestamp")
            dt = None
            if isinstance(ts_raw, (int, float)):
                epoch = float(ts_raw)
                if epoch > 1e12:
                    epoch = epoch / 1000.0
                try:
                    dt = datetime.fromtimestamp(epoch, tz=timezone.utc)
                except (ValueError, OSError, OverflowError):
                    issues.append(DiagnosticIssue(
                        code="INVALID_TIMESTAMP_FORMAT",
                        field=f"telemetry[{idx}].ts_epoch_sec",
                        severity=IssueSeverity.WARNING,
                        message=f"Epoch value {ts_raw} out of range",
                        observed_value=ts_raw,
                    ))
            elif isinstance(ts_raw, str):
                try:
                    dt = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                except Exception:
                    pass
            if not dt:
                dt = datetime.now(timezone.utc)

            def _safe_float(key: str, default=None):
                v = rec.get(key)
                if v is None:
                    return default
                try:
                    return float(v)
                except (ValueError, TypeError):
                    issues.append(DiagnosticIssue(
                        code="NUMBER_COERCION_ERROR",
                        field=f"telemetry[{idx}].{key}",
                        severity=IssueSeverity.WARNING,
                        message=f"Cannot coerce '{v}' to float",
                        observed_value=v,
                    ))
                    return default

            # Energy conversion from Wh -> kWh (0.001)
            raw_wh = _safe_float("act_wh")
            if raw_wh is None:
                issues.append(DiagnosticIssue(
                    code="MISSING_ACT_WH",
                    field=f"telemetry[{idx}].act_wh",
                    severity=IssueSeverity.ERROR,
                    message="Missing active energy act_wh in Delta record"
                ))
                raw_wh = 0.0

            act_kwh = raw_wh * 0.001
            exp_kwh = (_safe_float("exp_wh", 0.0)) * 0.001

            # Voltage in mV -> V
            raw_mv = _safe_float("volt_mv")
            volt_v = (raw_mv * 0.001) if raw_mv is not None else None

            # Current in mA -> A
            raw_ma = _safe_float("curr_ma")
            curr_a = (raw_ma * 0.001) if raw_ma is not None else None

            # PF in pct (0-100) -> 0.0 - 1.0
            raw_pf_pct = _safe_float("p_fact_pct")
            pf = (raw_pf_pct * 0.01) if raw_pf_pct is not None else None

            readings.append(CanonicalMeterReading(
                meter_serial_number=str(meter_id),
                timestamp=dt,
                interval_minutes=15,
                active_energy_import_kwh=round(act_kwh, 4),
                active_energy_export_kwh=round(exp_kwh, 4),
                voltage_v=round(volt_v, 2) if volt_v is not None else None,
                current_a=round(curr_a, 3) if curr_a is not None else None,
                power_factor=round(pf, 3) if pf is not None else None,
                frequency_hz=float(rec.get("freq_hz", 50.0)),
                quality_code=QualityCode.VALID
            ))

            # Alarms
            alarm = rec.get("alarm_tag")
            if alarm:
                mapped_code = self.profile.event_mappings.get(alarm, "OTHER_EVENT")
                try:
                    evt_enum = EventCode(mapped_code)
                except ValueError:
                    evt_enum = EventCode.OTHER_EVENT

                events.append(CanonicalMeterEvent(
                    meter_serial_number=str(meter_id),
                    event_code=evt_enum,
                    timestamp=dt,
                    raw_vendor_code=alarm,
                    severity=EventSeverity.CRITICAL if "TAMPER" in evt_enum.value or "OUTAGE" in evt_enum.value else EventSeverity.WARNING,
                    description=f"Delta alarm {alarm}"
                ))

        return CanonicalPayload(
            source_system=self.profile.vendor_id,
            readings=readings,
            events=events
        ), issues

    def serialize_from_canonical(self, canonical: CanonicalPayload) -> Dict[str, Any]:
        """Serialize canonical model to Delta legacy JSON format."""
        telemetry = []
        for r in canonical.readings:
            rec = {
                "device_uid": r.meter_serial_number,
                "ts_epoch_sec": int(r.timestamp.timestamp()),
                "act_wh": round(r.active_energy_import_kwh * 1000.0, 1),
                "exp_wh": round((r.active_energy_export_kwh or 0.0) * 1000.0, 1),
                "freq_hz": r.frequency_hz or 50.0
            }
            if r.voltage_v is not None:
                rec["volt_mv"] = round(r.voltage_v * 1000.0, 1)
            if r.current_a is not None:
                rec["curr_ma"] = round(r.current_a * 1000.0, 1)
            if r.power_factor is not None:
                rec["p_fact_pct"] = round(r.power_factor * 100.0, 1)

            # Match alarm
            matching_events = [e for e in canonical.events if e.meter_serial_number == r.meter_serial_number]
            if matching_events:
                rev_map = {v: k for k, v in self.profile.event_mappings.items()}
                rec["alarm_tag"] = rev_map.get(matching_events[0].event_code.value, "GEN_ALARM")

            telemetry.append(rec)

        return {
            "vendor": "delta-legacy",
            "count": len(telemetry),
            "telemetry": telemetry
        }

"""Vendor Alpha Adapter: DLMS/COSEM (IEC 62056 / IS 15959) OBIS code HES format.

Alpha HES communicates with smart meters via standard DLMS/COSEM OBIS registers:
- 1.0.1.8.0.255: Cumulative Active Energy Import (Wh or kWh with scaler)
- 1.0.2.8.0.255: Cumulative Active Energy Export
- 1.0.3.8.0.255: Cumulative Reactive Energy
- 1.0.12.7.0.255: Instantaneous Voltage (V * scaler)
- 1.0.11.7.0.255: Instantaneous Current (A * scaler)
- 1.0.13.7.0.255: Instantaneous Power Factor
- 1.0.14.7.0.255: Frequency (Hz)
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

DEFAULT_ALPHA_PROFILE = VendorProfile(
    vendor_id="alpha-hes",
    name="Alpha HES (DLMS/COSEM)",
    system_type="HES",
    format_type="json",
    protocol="DLMS/COSEM",
    version="1.4.0",
    description="DLMS/COSEM HES exchanging structured OBIS registers with scaler attributes per IS 15959.",
    obis_code_mappings={
        "1.0.1.8.0.255": "active_energy_import_kwh",
        "1.0.2.8.0.255": "active_energy_export_kwh",
        "1.0.3.8.0.255": "reactive_energy_kvarh",
        "1.0.9.8.0.255": "apparent_energy_kvah",
        "1.0.12.7.0.255": "voltage_v",
        "1.0.11.7.0.255": "current_a",
        "1.0.13.7.0.255": "power_factor",
        "1.0.14.7.0.255": "frequency_hz"
    },
    event_mappings={
        "EVT_DLMS_TAMPER_MAG": "TAMPER_MAGNETIC",
        "EVT_DLMS_COVER_OPEN": "TAMPER_COVER_OPEN",
        "EVT_DLMS_POWER_FAIL": "POWER_OUTAGE",
        "EVT_DLMS_POWER_RES": "POWER_RESTORED",
        "EVT_DLMS_VOLT_LOW": "VOLTAGE_SAG",
        "EVT_DLMS_VOLT_HIGH": "VOLTAGE_SWELL",
        "EVT_DLMS_CURR_REV": "REVERSE_CURRENT"
    }
)


class AlphaAdapter(BaseAdapter):
    """Adapter for Alpha DLMS/COSEM HES."""

    def __init__(self, profile: VendorProfile = None):
        super().__init__(profile or DEFAULT_ALPHA_PROFILE)

    def validate_source(self, raw_data: Any) -> List[DiagnosticIssue]:
        issues = super().validate_source(raw_data)
        if isinstance(raw_data, dict):
            if "meter_data" not in raw_data:
                issues.append(DiagnosticIssue(
                    code="SOURCE_MISSING_KEY",
                    severity=IssueSeverity.ERROR,
                    field="meter_data",
                    message="Alpha DLMS payload missing required 'meter_data' array.",
                    stage=ValidationStage.SOURCE,
                ))
            elif not isinstance(raw_data["meter_data"], list):
                issues.append(DiagnosticIssue(
                    code="SOURCE_WRONG_TYPE",
                    severity=IssueSeverity.ERROR,
                    field="meter_data",
                    message=f"'meter_data' must be an array, got {type(raw_data['meter_data']).__name__}.",
                    stage=ValidationStage.SOURCE,
                ))
            else:
                for idx, rec in enumerate(raw_data["meter_data"]):
                    if not isinstance(rec, dict):
                        continue
                    if not rec.get("meter_number") and not rec.get("meter_id"):
                        issues.append(DiagnosticIssue(
                            code="SOURCE_MISSING_FIELD",
                            severity=IssueSeverity.ERROR,
                            field=f"meter_data[{idx}].meter_number",
                            message=f"Record {idx} missing meter identifier.",
                            stage=ValidationStage.SOURCE,
                        ))
                    if "registers" not in rec or not isinstance(rec.get("registers"), dict):
                        issues.append(DiagnosticIssue(
                            code="SOURCE_MISSING_FIELD",
                            severity=IssueSeverity.WARNING,
                            field=f"meter_data[{idx}].registers",
                            message=f"Record {idx} missing 'registers' dict.",
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
                    message=f"Failed to parse Alpha DLMS JSON: {str(e)}",
                    suggested_fix="Ensure valid JSON string format."
                ))
                return CanonicalPayload(source_system=self.profile.vendor_id), issues
        elif isinstance(raw_data, dict):
            data = raw_data
        else:
            issues.append(DiagnosticIssue(
                code="UNSUPPORTED_DATA_TYPE",
                severity=IssueSeverity.ERROR,
                message=f"Expected JSON str or dict for Alpha DLMS, got {type(raw_data).__name__}"
            ))
            return CanonicalPayload(source_system=self.profile.vendor_id), issues

        source_system = data.get("system_id", self.profile.vendor_id)
        meter_records = data.get("meter_data", [])

        if not isinstance(meter_records, list):
            issues.append(DiagnosticIssue(
                code="INVALID_PAYLOAD_STRUCTURE",
                severity=IssueSeverity.ERROR,
                message="Expected 'meter_data' array in Alpha DLMS payload",
                suggested_fix="Structure payload with {'system_id': '...', 'meter_data': [...]}"
            ))
            meter_records = []

        for idx, item in enumerate(meter_records):
            meter_sn = item.get("meter_number") or item.get("meter_id")
            if not meter_sn:
                issues.append(DiagnosticIssue(
                    code="MISSING_METER_ID",
                    field=f"meter_data[{idx}].meter_number",
                    severity=IssueSeverity.ERROR,
                    message="Missing meter identifier in Alpha record",
                    suggested_fix="Add 'meter_number' string to record."
                ))
                continue

            # Parse timestamp
            ts_raw = item.get("clock") or item.get("timestamp")
            reading_time = None
            if ts_raw:
                try:
                    if isinstance(ts_raw, str):
                        reading_time = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                    elif isinstance(ts_raw, (int, float)):
                        reading_time = datetime.fromtimestamp(ts_raw, tz=timezone.utc)
                except Exception:
                    issues.append(DiagnosticIssue(
                        code="INVALID_TIMESTAMP_FORMAT",
                        field=f"meter_data[{idx}].clock",
                        severity=IssueSeverity.WARNING,
                        message=f"Could not parse clock timestamp '{ts_raw}', using current UTC time",
                        observed_value=ts_raw,
                        suggested_fix="Format timestamp as ISO-8601 UTC (e.g. 2026-03-31T10:00:00Z)"
                    ))
            if not reading_time:
                reading_time = datetime.now(timezone.utc)

            # Parse OBIS registers
            registers = item.get("registers", {})
            active_import = None
            active_export = 0.0
            reactive_kvarh = 0.0
            apparent_kvah = None
            voltage = None
            current = None
            pf = None
            frequency = 50.0

            # Scan registers: registers can be dict of obis -> {value, scaler, unit} or direct float
            for obis, reg_data in registers.items():
                val = 0.0
                scaler = 0
                if isinstance(reg_data, dict):
                    val = float(reg_data.get("value", 0.0))
                    scaler = int(reg_data.get("scaler", 0))
                    effective_val = val * (10 ** scaler)
                elif isinstance(reg_data, (int, float)):
                    effective_val = float(reg_data)
                else:
                    continue

                canonical_field = self.profile.obis_code_mappings.get(obis)
                if canonical_field == "active_energy_import_kwh":
                    active_import = effective_val
                elif canonical_field == "active_energy_export_kwh":
                    active_export = effective_val
                elif canonical_field == "reactive_energy_kvarh":
                    reactive_kvarh = effective_val
                elif canonical_field == "apparent_energy_kvah":
                    apparent_kvah = effective_val
                elif canonical_field == "voltage_v":
                    voltage = effective_val
                elif canonical_field == "current_a":
                    current = effective_val
                elif canonical_field == "power_factor":
                    pf = effective_val
                elif canonical_field == "frequency_hz":
                    frequency = effective_val

            if active_import is None:
                issues.append(DiagnosticIssue(
                    code="MISSING_ACTIVE_IMPORT_ENERGY",
                    field=f"meter_data[{idx}].registers['1.0.1.8.0.255']",
                    severity=IssueSeverity.ERROR,
                    message=f"Meter {meter_sn} missing mandatory Active Energy Import OBIS 1.0.1.8.0.255",
                    suggested_fix="Include OBIS 1.0.1.8.0.255 in registers map."
                ))
                active_import = 0.0

            readings.append(CanonicalMeterReading(
                meter_serial_number=str(meter_sn),
                timestamp=reading_time,
                interval_minutes=item.get("interval_minutes", 15),
                active_energy_import_kwh=round(active_import, 4),
                active_energy_export_kwh=round(active_export, 4) if active_export is not None else 0.0,
                reactive_energy_kvarh=round(reactive_kvarh, 4) if reactive_kvarh is not None else 0.0,
                apparent_energy_kvah=round(apparent_kvah, 4) if apparent_kvah is not None else None,
                obis_code="1.0.1.8.0.255",
                scaler_applied=True,
                voltage_v=round(voltage, 2) if voltage is not None else None,
                current_a=round(current, 3) if current is not None else None,
                power_factor=round(pf, 3) if pf is not None else None,
                frequency_hz=round(frequency, 2) if frequency is not None else 50.0,
                quality_code=QualityCode.VALID,
                raw_metadata={"raw_registers_count": len(registers)}
            ))

            # Process any alarms / events
            for raw_evt in item.get("events", []):
                evt_code_raw = raw_evt.get("code")
                evt_ts_raw = raw_evt.get("timestamp")
                evt_time = reading_time
                if evt_ts_raw:
                    try:
                        evt_time = datetime.fromisoformat(evt_ts_raw.replace("Z", "+00:00"))
                    except Exception:
                        pass

                mapped_code_str = self.profile.event_mappings.get(evt_code_raw, "OTHER_EVENT")
                try:
                    std_event = EventCode(mapped_code_str)
                except ValueError:
                    std_event = EventCode.OTHER_EVENT

                events.append(CanonicalMeterEvent(
                    meter_serial_number=str(meter_sn),
                    event_code=std_event,
                    timestamp=evt_time,
                    raw_vendor_code=evt_code_raw,
                    severity=EventSeverity.CRITICAL if "TAMPER" in std_event.value or "OUTAGE" in std_event.value else EventSeverity.WARNING,
                    description=raw_evt.get("description", f"DLMS event {evt_code_raw}")
                ))

        payload = CanonicalPayload(
            source_system=source_system,
            readings=readings,
            events=events
        )
        return payload, issues

    def serialize_from_canonical(self, canonical: CanonicalPayload) -> Dict[str, Any]:
        """Serialize canonical data back to Alpha DLMS JSON format."""
        meter_data = []
        for r in canonical.readings:
            item = {
                "meter_number": r.meter_serial_number,
                "clock": r.timestamp.isoformat(),
                "interval_minutes": r.interval_minutes,
                "registers": {
                    "1.0.1.8.0.255": {"value": round(r.active_energy_import_kwh, 4), "scaler": 0, "unit": "kWh"},
                    "1.0.2.8.0.255": {"value": round(r.active_energy_export_kwh or 0.0, 4), "scaler": 0, "unit": "kWh"},
                    "1.0.3.8.0.255": {"value": round(r.reactive_energy_kvarh or 0.0, 4), "scaler": 0, "unit": "kVArh"}
                },
                "events": []
            }
            if r.voltage_v is not None:
                item["registers"]["1.0.12.7.0.255"] = {"value": round(r.voltage_v, 2), "scaler": 0, "unit": "V"}
            if r.current_a is not None:
                item["registers"]["1.0.11.7.0.255"] = {"value": round(r.current_a, 3), "scaler": 0, "unit": "A"}
            if r.power_factor is not None:
                item["registers"]["1.0.13.7.0.255"] = {"value": round(r.power_factor, 3), "scaler": 0, "unit": ""}
            if r.frequency_hz is not None:
                item["registers"]["1.0.14.7.0.255"] = {"value": round(r.frequency_hz, 2), "scaler": 0, "unit": "Hz"}

            # Attach matching events
            matching_events = [e for e in canonical.events if e.meter_serial_number == r.meter_serial_number]
            for ev in matching_events:
                rev_map = {v: k for k, v in self.profile.event_mappings.items()}
                raw_code = rev_map.get(ev.event_code.value, "EVT_GENERIC")
                item["events"].append({
                    "code": raw_code,
                    "timestamp": ev.timestamp.isoformat(),
                    "description": ev.description
                })

            meter_data.append(item)

        return {
            "system_id": self.profile.vendor_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "format": "DLMS/COSEM OBIS IS15959",
            "meter_data": meter_data
        }

    def validate_target(self, serialized_output: Any) -> List[DiagnosticIssue]:
        issues = super().validate_target(serialized_output)
        if isinstance(serialized_output, dict):
            md = serialized_output.get("meter_data", [])
            if not isinstance(md, list) or len(md) == 0:
                issues.append(DiagnosticIssue(
                    code="TARGET_EMPTY_OUTPUT",
                    severity=IssueSeverity.WARNING,
                    message="Alpha target output contains no meter_data records.",
                    stage=ValidationStage.TARGET,
                ))
            for idx, rec in enumerate(md if isinstance(md, list) else []):
                if not isinstance(rec, dict):
                    continue
                regs = rec.get("registers", {})
                if "1.0.1.8.0.255" not in regs:
                    issues.append(DiagnosticIssue(
                        code="TARGET_MISSING_REGISTER",
                        severity=IssueSeverity.ERROR,
                        field=f"meter_data[{idx}].registers",
                        message=f"Record {idx} missing mandatory OBIS 1.0.1.8.0.255 (Active Import).",
                        stage=ValidationStage.TARGET,
                    ))
        return issues

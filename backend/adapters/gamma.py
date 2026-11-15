"""Vendor Gamma Adapter: CIM IEC 61968-9 Enterprise MDMS JSON format.

Gamma MDMS expects enterprise Common Information Model (CIM) messages conforming to IEC 61968-9:
- EndDevice: mRID (meter serial)
- MeterReading:
  - ReadingType: e.g. "12.0.0.0.4.1.12.0.0.0.0.0.0.0.0.3.72.0" (CIM reading type) or standard attribute names
  - IntervalBlocks:
    - IntervalReadings:
      - timeStamp: UTC ISO 8601
      - value: numeric value
      - ReadingQualities: standard quality indicators
- EndDeviceEvents:
  - createdDateTime: UTC ISO 8601
  - EndDeviceEventType: standard CIM event code
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

DEFAULT_GAMMA_PROFILE = VendorProfile(
    vendor_id="gamma-mdms",
    name="Gamma MDMS (CIM IEC 61968-9)",
    system_type="MDMS",
    format_type="json",
    protocol="CIM_IEC61968",
    version="Part 9 Ed. 2",
    description="Enterprise CIM IEC 61968-9 compliant nested JSON payloads with IntervalBlocks and ReadingQualities.",
    event_mappings={
        "CIM.ENDDEVICE.TAMPER.MAGNET": "TAMPER_MAGNETIC",
        "CIM.ENDDEVICE.TAMPER.COVER": "TAMPER_COVER_OPEN",
        "CIM.ENDDEVICE.OUTAGE.CONFIRMED": "POWER_OUTAGE",
        "CIM.ENDDEVICE.OUTAGE.RESTORED": "POWER_RESTORED",
        "CIM.ENDDEVICE.VOLTAGE.SAG": "VOLTAGE_SAG",
        "CIM.ENDDEVICE.VOLTAGE.SWELL": "VOLTAGE_SWELL",
        "CIM.ENDDEVICE.CURRENT.REVERSE": "REVERSE_CURRENT"
    }
)


class GammaAdapter(BaseAdapter):
    """Adapter for Gamma CIM IEC 61968-9 MDMS."""

    def __init__(self, profile: VendorProfile = None):
        super().__init__(profile or DEFAULT_GAMMA_PROFILE)

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
                    message="Gamma CIM payload is not valid JSON.",
                    stage=ValidationStage.SOURCE,
                ))
                return issues
        if isinstance(data, dict):
            if "MeterReadings" not in data and "EndDevices" not in data:
                issues.append(DiagnosticIssue(
                    code="SOURCE_MISSING_KEY",
                    severity=IssueSeverity.WARNING,
                    message="Gamma CIM payload missing 'MeterReadings' or 'EndDevices' key.",
                    stage=ValidationStage.SOURCE,
                ))
        return issues

    def parse_to_canonical(self, raw_data: Any) -> Tuple[CanonicalPayload, List[DiagnosticIssue]]:
        issues: List[DiagnosticIssue] = []
        readings_map: Dict[Tuple[str, str], Dict[str, Any]] = {}
        events: List[CanonicalMeterEvent] = []

        if isinstance(raw_data, str):
            try:
                data = json.loads(raw_data)
            except Exception as e:
                issues.append(DiagnosticIssue(
                    code="JSON_PARSE_ERROR",
                    severity=IssueSeverity.ERROR,
                    message=f"Failed to parse Gamma CIM JSON: {str(e)}",
                    suggested_fix="Ensure valid JSON string format."
                ))
                return CanonicalPayload(source_system=self.profile.vendor_id), issues
        elif isinstance(raw_data, dict):
            data = raw_data
        else:
            issues.append(DiagnosticIssue(
                code="UNSUPPORTED_DATA_TYPE",
                severity=IssueSeverity.ERROR,
                message=f"Expected JSON str or dict for Gamma CIM, got {type(raw_data).__name__}"
            ))
            return CanonicalPayload(source_system=self.profile.vendor_id), issues

        cim_message = data.get("MeterReadingsMessage") or data.get("Payload", {}).get("MeterReadingsMessage") or data
        meter_readings = cim_message.get("MeterReadings", [])
        if not isinstance(meter_readings, list):
            meter_readings = [meter_readings] if meter_readings else []

        for mr in meter_readings:
            meter_id = mr.get("meter_id") or mr.get("EndDevice", {}).get("mRID") or mr.get("mRID", "UNKNOWN_METER")
            interval_blocks = mr.get("IntervalBlocks", [])
            for ib in interval_blocks:
                reading_type = ib.get("readingType", "active_energy_import_kwh")
                interval_readings = ib.get("IntervalReadings", [])
                for ir in interval_readings:
                    ts_str = ir.get("timeStamp") or ir.get("time")
                    val = ir.get("value", 0.0)
                    key = (meter_id, ts_str)
                    if key not in readings_map:
                        readings_map[key] = {
                            "meter_id": meter_id,
                            "timestamp": ts_str,
                            "active_energy_import_kwh": None,
                            "active_energy_export_kwh": 0.0,
                            "reactive_energy_kvarh": 0.0,
                            "voltage_v": None,
                            "current_a": None,
                            "power_factor": None,
                            "frequency_hz": 50.0
                        }

                    # Determine metric from readingType
                    rt_str = str(reading_type).lower()
                    if "import" in rt_str or "active" in rt_str or "kwh" in rt_str:
                        readings_map[key]["active_energy_import_kwh"] = float(val)
                    elif "export" in rt_str:
                        readings_map[key]["active_energy_export_kwh"] = float(val)
                    elif "reactive" in rt_str or "kvarh" in rt_str:
                        readings_map[key]["reactive_energy_kvarh"] = float(val)
                    elif "voltage" in rt_str or "volt" in rt_str or rt_str.endswith(".v"):
                        readings_map[key]["voltage_v"] = float(val)
                    elif "current" in rt_str or "amp" in rt_str or rt_str.endswith(".a"):
                        readings_map[key]["current_a"] = float(val)
                    elif "pf" in rt_str or "powerfactor" in rt_str:
                        readings_map[key]["power_factor"] = float(val)
                    elif "freq" in rt_str:
                        readings_map[key]["frequency_hz"] = float(val)

        # Process EndDeviceEvents
        cim_events = cim_message.get("EndDeviceEvents", [])
        for cev in cim_events:
            ev_meter = cev.get("EndDevice", {}).get("mRID") or cev.get("meter_id", "UNKNOWN")
            ev_type = cev.get("EndDeviceEventType", "UNKNOWN")
            ev_time_str = cev.get("createdDateTime") or cev.get("timestamp")
            ev_dt = datetime.now(timezone.utc)
            if ev_time_str:
                try:
                    ev_dt = datetime.fromisoformat(ev_time_str.replace("Z", "+00:00"))
                except Exception:
                    pass
            mapped_evt = self.profile.event_mappings.get(ev_type, "OTHER_EVENT")
            try:
                enum_val = EventCode(mapped_evt)
            except ValueError:
                enum_val = EventCode.OTHER_EVENT

            events.append(CanonicalMeterEvent(
                meter_serial_number=str(ev_meter),
                event_code=enum_val,
                timestamp=ev_dt,
                raw_vendor_code=ev_type,
                severity=EventSeverity.CRITICAL if "TAMPER" in enum_val.value or "OUTAGE" in enum_val.value else EventSeverity.WARNING,
                description=cev.get("description", f"CIM event {ev_type}")
            ))

        # Build CanonicalMeterReading items
        readings: List[CanonicalMeterReading] = []
        for (meter_id, ts_str), data_dict in readings_map.items():
            parsed_ts = datetime.now(timezone.utc)
            if ts_str:
                try:
                    parsed_ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except Exception:
                    issues.append(DiagnosticIssue(
                        code="INVALID_CIM_TIMESTAMP",
                        severity=IssueSeverity.WARNING,
                        message=f"Could not parse CIM timestamp '{ts_str}'"
                    ))

            act_imp = data_dict["active_energy_import_kwh"]
            if act_imp is None:
                issues.append(DiagnosticIssue(
                    code="MISSING_CIM_ACTIVE_ENERGY",
                    severity=IssueSeverity.WARNING,
                    message=f"Meter {meter_id} at {ts_str} missing active energy reading",
                    suggested_fix="Verify CIM IntervalBlock readingType."
                ))
                act_imp = 0.0

            readings.append(CanonicalMeterReading(
                meter_serial_number=str(meter_id),
                timestamp=parsed_ts,
                interval_minutes=15,
                active_energy_import_kwh=round(act_imp, 4),
                active_energy_export_kwh=round(data_dict["active_energy_export_kwh"] or 0.0, 4),
                reactive_energy_kvarh=round(data_dict["reactive_energy_kvarh"] or 0.0, 4),
                voltage_v=round(data_dict["voltage_v"], 2) if data_dict["voltage_v"] is not None else None,
                current_a=round(data_dict["current_a"], 3) if data_dict["current_a"] is not None else None,
                power_factor=round(data_dict["power_factor"], 3) if data_dict["power_factor"] is not None else None,
                frequency_hz=round(data_dict["frequency_hz"], 2) if data_dict["frequency_hz"] is not None else 50.0,
                quality_code=QualityCode.VALID
            ))

        return CanonicalPayload(
            source_system=self.profile.vendor_id,
            readings=readings,
            events=events
        ), issues

    def serialize_from_canonical(self, canonical: CanonicalPayload) -> Dict[str, Any]:
        """Serialize canonical model to CIM IEC 61968-9 JSON structure."""
        meter_map: Dict[str, List[CanonicalMeterReading]] = {}
        for r in canonical.readings:
            meter_map.setdefault(r.meter_serial_number, []).append(r)

        meter_readings_payload = []
        for meter_id, readings_list in meter_map.items():
            import_blocks = []
            voltage_blocks = []
            current_blocks = []

            for r in readings_list:
                ts_iso = r.timestamp.isoformat()
                import_blocks.append({
                    "timeStamp": ts_iso,
                    "value": round(r.active_energy_import_kwh, 4),
                    "ReadingQualities": [{"quality": r.quality_code.value}]
                })
                if r.voltage_v is not None:
                    voltage_blocks.append({
                        "timeStamp": ts_iso,
                        "value": round(r.voltage_v, 2),
                        "ReadingQualities": [{"quality": "VALID"}]
                    })
                if r.current_a is not None:
                    current_blocks.append({
                        "timeStamp": ts_iso,
                        "value": round(r.current_a, 3),
                        "ReadingQualities": [{"quality": "VALID"}]
                    })

            blocks = [{
                "readingType": "IEC61968-9.ActiveEnergy.Import.kWh",
                "IntervalReadings": import_blocks
            }]
            if voltage_blocks:
                blocks.append({
                    "readingType": "IEC61968-9.Voltage.RMS.V",
                    "IntervalReadings": voltage_blocks
                })
            if current_blocks:
                blocks.append({
                    "readingType": "IEC61968-9.Current.RMS.A",
                    "IntervalReadings": current_blocks
                })

            meter_readings_payload.append({
                "EndDevice": {"mRID": meter_id},
                "IntervalBlocks": blocks
            })

        # Events
        cim_events = []
        rev_map = {v: k for k, v in self.profile.event_mappings.items()}
        for ev in canonical.events:
            c_code = rev_map.get(ev.event_code.value, "CIM.ENDDEVICE.GENERIC")
            cim_events.append({
                "EndDevice": {"mRID": ev.meter_serial_number},
                "EndDeviceEventType": c_code,
                "createdDateTime": ev.timestamp.isoformat(),
                "description": ev.description
            })

        return {
            "Header": {
                "verb": "reply",
                "noun": "MeterReadings",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "source": "VidyutSetu-CIM-Adapter",
                "standard": "IEC 61968-9 Ed 2"
            },
            "Payload": {
                "MeterReadingsMessage": {
                    "MeterReadings": meter_readings_payload,
                    "EndDeviceEvents": cim_events
                }
            }
        }

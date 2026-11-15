"""Unit tests for VidyutSetu Vendor Adapters."""

import pytest
from backend.adapters import get_adapter
from backend.models.canonical import CanonicalPayload, CanonicalMeterReading


def test_alpha_hes_roundtrip():
    adapter = get_adapter("alpha-hes")
    assert adapter is not None

    sample_alpha = {
        "system_id": "alpha-hes",
        "meter_data": [
            {
                "meter_number": "SM-TEST-001",
                "clock": "2026-03-31T14:00:00Z",
                "registers": {
                    "1.0.1.8.0.255": {"value": 150000, "scaler": -3, "unit": "kWh"},
                    "1.0.12.7.0.255": {"value": 2350, "scaler": -1, "unit": "V"}
                }
            }
        ]
    }

    canonical, issues = adapter.parse_to_canonical(sample_alpha)
    assert len(canonical.readings) == 1
    r = canonical.readings[0]
    assert r.meter_serial_number == "SM-TEST-001"
    assert r.active_energy_import_kwh == 150.0
    assert r.voltage_v == 235.0

    serialized = adapter.serialize_from_canonical(canonical)
    assert serialized["system_id"] == "alpha-hes"
    assert len(serialized["meter_data"]) == 1
    assert serialized["meter_data"][0]["registers"]["1.0.1.8.0.255"]["value"] == 150.0


def test_beta_hes_csv_roundtrip():
    adapter = get_adapter("beta-hes")
    assert adapter is not None

    csv_data = "MTR_ID,RDG_TIME,KWH_IMP,KWH_EXP,KVARH_LAG,VRMS,IRMS,PF,FREQ,ALARM_CODE\nSM-BETA-01,31-03-2026 10:00:00,120.50,0.00,10.20,230.10,5.200,0.950,50.00,MAG_TAMPER"
    canonical, issues = adapter.parse_to_canonical(csv_data)
    assert len(canonical.readings) == 1
    assert canonical.readings[0].meter_serial_number == "SM-BETA-01"
    assert canonical.readings[0].active_energy_import_kwh == 120.5
    assert len(canonical.events) == 1
    assert canonical.events[0].event_code.value == "TAMPER_MAGNETIC"

    serialized_csv = adapter.serialize_from_canonical(canonical)
    assert "SM-BETA-01" in serialized_csv
    assert "120.5000" in serialized_csv


def test_gamma_mdms_cim():
    adapter = get_adapter("gamma-mdms")
    assert adapter is not None

    sample_cim = {
        "MeterReadingsMessage": {
            "MeterReadings": [{
                "EndDevice": {"mRID": "SM-CIM-99"},
                "IntervalBlocks": [{
                    "readingType": "IEC61968-9.ActiveEnergy.Import.kWh",
                    "IntervalReadings": [
                        {"timeStamp": "2026-03-31T10:00:00Z", "value": 310.25}
                    ]
                }]
            }]
        }
    }
    canonical, issues = adapter.parse_to_canonical(sample_cim)
    assert len(canonical.readings) == 1
    assert canonical.readings[0].meter_serial_number == "SM-CIM-99"
    assert canonical.readings[0].active_energy_import_kwh == 310.25


def test_delta_legacy():
    adapter = get_adapter("delta-legacy")
    assert adapter is not None

    delta_payload = {
        "telemetry": [{
            "device_uid": "DELTA-001",
            "ts_epoch_sec": 1774944000,
            "act_wh": 50000,
            "volt_mv": 230000,
            "curr_ma": 4500,
            "p_fact_pct": 96
        }]
    }
    canonical, issues = adapter.parse_to_canonical(delta_payload)
    assert len(canonical.readings) == 1
    r = canonical.readings[0]
    assert r.meter_serial_number == "DELTA-001"
    assert r.active_energy_import_kwh == 50.0
    assert r.voltage_v == 230.0
    assert r.current_a == 4.5
    assert r.power_factor == 0.96

# VidyutSetu Architecture & Domain Research

## 1. Executive Summary
In modern power distribution utilities (such as Indian DISCOMs under RDSS, European DSOs, and US utilities), Advanced Metering Infrastructure (AMI) deployments integrate millions of smart meters communicating through multiple Head End Systems (HES) provided by various hardware and software vendors (e.g., CyanConnode, Trilliant, Landis+Gyr, Schneider, Secure Meters, Genus). These HES systems must feed meter data into central Meter Data Management Systems (MDMS) (e.g., Oracle MDM, Siemens EnergyIP).

A major challenge in AMI rollout is **vendor lock-in and interoperability failure**:
1. Different vendors report load profiles with conflicting units (Wh vs. kWh vs. MWh), scale factors, and register structures.
2. Timestamps differ in format (ISO 8601 UTC, local epoch milliseconds, unshifted Indian Standard Time `DD/MM/YYYY hh:mm:ss`).
3. OBIS codes (IEC 62056-6-1 / IS 15959) are parsed, truncated, or mapped inconsistently.
4. Alarm and event identifiers (e.g., tamper switch open, magnetic influence, phase reversal, power outage/restoration) use proprietary vendor codes rather than standard IEC 61968-9 `EndDeviceEventType`.

**VidyutSetu** is a completely software-based AMI Data Exchange Interoperability Testing Workbench. It provides a canonical reference model, multi-vendor transformation adapters, rigorous schema & semantic validation, transparent interoperability scoring, diagnostic suggestions, and automated test scenario execution without requiring physical smart meters.

---

## 2. Standards Research & Mapping

### 2.1 IEC 61968-9 (CIM for Distribution Management)
- **Scope**: System interfaces for meter reading and control.
- **Key Entities**:
  - `MeterReading`: Represents periodic measurement sets (active energy, reactive energy, voltage, current).
  - `ReadingQuality`: Quality codes (estimated, missing, suspect, valid).
  - `EndDeviceEvent`: Tamper, outage, power quality, and operational state changes.
  - `EndDeviceControl`: Remote connect/disconnect and load limiting commands.

### 2.2 DLMS/COSEM (IEC 62056) & Indian Standards (IS 16444 / IS 15959)
- **OBIS (Object Identification System)**:
  - `1.0.1.8.0.255`: Cumulative Active Energy Import (kWh)
  - `1.0.2.8.0.255`: Cumulative Active Energy Export (kWh)
  - `1.0.3.8.0.255`: Cumulative Reactive Energy (kVArh, Q1+Q2)
  - `1.0.4.8.0.255`: Cumulative Reactive Energy (kVArh, Q3+Q4)
  - `1.0.9.8.0.255`: Apparent Energy (kVAh)
  - `1.0.12.7.0.255`: Instantaneous RMS Voltage (Phase A / Single Phase, Volts)
  - `1.0.11.7.0.255`: Instantaneous RMS Current (Phase A / Single Phase, Amperes)
  - `1.0.13.7.0.255`: Instantaneous Power Factor (cos φ)
  - `1.0.14.7.0.255`: Grid Frequency (Hz)
  - `1.0.31.7.0.255`: Current Neutral (Amperes)

---

## 3. Supported Vendor Profiles

| Vendor ID | System Role | Primary Format | Characteristics & Real-World Quirks |
| :--- | :--- | :--- | :--- |
| **Alpha-HES** | Head End System | DLMS/COSEM OBIS XML / JSON | Uses hierarchical OBIS code tags (`1.0.1.8.0.255`), raw integer values with DLMS scalar attributes (`scaler: -3` for Wh to kWh), ISO UTC timestamps. |
| **Beta-HES** | Head End System | Flat CSV Load Survey | Comma-separated table with legacy utility abbreviations (`MTR_ID`, `RDG_TIME`, `KWH_IMP`, `VRMS`, `IRMS`), local IST timestamps (`DD-MM-YYYY HH:mm:ss`), milli-units. |
| **Gamma-MDMS**| MDMS Ingestion | CIM IEC 61968-9 JSON | Enterprise CIM nested structure (`MeterReadings`, `IntervalBlocks`, `IntervalReadings`, `ReadingType`), explicit UTC ISO 8601 timestamps, SI units (kWh, V, A). |
| **Delta-Legacy**| Proprietary HES | Idiosyncratic JSON | Flat JSON object with non-standard key names (`devId`, `ts_epoch_ms`, `act_pwr_w`, `pf_pct`), string numbers, mixed timezone offsets. |

---

## 4. VidyutSetu Canonical Data Model (CDM)

The Canonical Data Model standardizes all incoming AMI telemetry into a strictly typed, normalized representation:
1. **Header / Metadata**:
   - `message_id`: UUIDv4
   - `source_system`: Source vendor/HES identifier
   - `timestamp`: ISO 8601 UTC
   - `version`: CDM version (e.g., `1.0.0`)
2. **Meter Telemetry (`readings`)**:
   - `meter_serial_number`: Alphanumeric meter identifier
   - `timestamp`: UTC reading timestamp
   - `interval_minutes`: Interval duration (15, 30, or 60 min)
   - `active_energy_import_kwh`: Cumulative active import (Float)
   - `active_energy_export_kwh`: Cumulative active export (Float, optional for bi-directional)
   - `reactive_energy_kvarh`: Cumulative reactive energy (Float)
   - `apparent_energy_kvah`: Cumulative apparent energy (Float)
   - `voltage_v`: Instantaneous RMS voltage (Float, 0 - 500V range)
   - `current_a`: Instantaneous RMS current (Float, 0 - 200A range)
   - `power_factor`: Cos φ (-1.0 to 1.0)
   - `frequency_hz`: Grid frequency (Float, 45.0 - 55.0 Hz range)
   - `quality_code`: Conformance status (`VALID`, `ESTIMATED`, `SUSPECT`, `MALFORMED`)
3. **Meter Events / Alarms (`events`)**:
   - `event_id`: Unique event instance ID
   - `meter_serial_number`: Meter ID
   - `event_code`: Canonical event category (`TAMPER_MAGNETIC`, `TAMPER_COVER_OPEN`, `POWER_OUTAGE`, `POWER_RESTORED`, `VOLTAGE_SAG`, `VOLTAGE_SWELL`, `REVERSE_CURRENT`)
   - `timestamp`: Event trigger time (UTC)
   - `severity`: `CRITICAL`, `MAJOR`, `WARNING`, `INFO`
   - `raw_vendor_code`: Original vendor-reported alarm code
4. **Control Commands (`controls`)**:
   - `command_id`: Control transaction ID
   - `meter_serial_number`: Meter target
   - `action`: `DISCONNECT`, `RECONNECT`, `LIMIT_LOAD`
   - `parameter_value`: E.g., load threshold in kW
   - `status`: `PENDING`, `SUCCESS`, `REJECTED`, `TIMEOUT`

---

## 5. Compatibility Scoring & Diagnostic Algorithm

VidyutSetu computes an objective **Interoperability Compatibility Score (0 - 100%)** based on three weighted pillars:
- **Syntactic Conformance (30%)**:
  - Valid JSON/CSV structure, parseability, presence of mandatory envelope fields.
- **Semantic Conformance (40%)**:
  - Proper mapping of required telemetry fields, OBIS code validity, standard CIM unit conversions, recognition of alarm event codes.
- **Value Domain & Data Integrity (30%)**:
  - Range sanity checks (e.g. 180V <= Voltage <= 270V in nominal 230V Indian grid), monotonic non-decreasing cumulative energy registers, valid timestamp sequencing without future dates or excessive clock drift, duplicate record detection.

The **Diagnostic Engine** isolates discrepancies down to the exact field, explains the root cause, and auto-suggests remediation configurations (e.g., regex timestamp parser, multiplier scale adjustment, OBIS translation rule).

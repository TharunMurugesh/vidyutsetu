# VIDYUTSETU (विद्युतसेतु)
### AMI Data Exchange Interoperability Testing Workbench

![Conformance Status](https://img.shields.io/badge/Standards-IEC%2061968--9%20%7C%20IS%2015959%20%7C%20DLMS--COSEM-emerald)
![Architecture](https://img.shields.io/badge/Architecture-FastAPI%20%7C%20Pydantic%20v2%20%7C%20SQLite-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-slate)

**VidyutSetu** is an enterprise-grade, completely software-based **Advanced Metering Infrastructure (AMI) Data Exchange Interoperability Testing Workbench**. It enables electrical utilities (such as DISCOMs undergoing RDSS rollouts, European DSOs, and municipal utilities), AMI vendors, and system integrators to benchmark, validate, normalize, and cross-transform meter data exchanged between diverse Head End Systems (HES) and central Meter Data Management Systems (MDMS) without requiring physical smart meters.

---

## ⚡ Core Capabilities

- **Canonical Data Normalization**: Strict alignment with **IEC 61968-9** (CIM for Distribution), **DLMS/COSEM (IEC 62056)**, and **IS 15959 (Parts 1-3)** Indian smart metering companion specifications.
- **Multi-Vendor HES/MDMS Adapters**:
  - `Alpha HES`: DLMS/COSEM OBIS XML/JSON registers with scaler exponents (`1.0.1.8.0.255`, `1.0.12.7.0.255`, etc.).
  - `Beta HES`: Proprietary flat CSV load survey format with Indian Standard Time (`DD-MM-YYYY HH:mm:ss`, IST UTC+05:30).
  - `Gamma MDMS`: Enterprise CIM IEC 61968-9 Ed. 2 nested JSON with `IntervalBlocks` and `ReadingQualities`.
  - `Delta HES`: Legacy proprietary JSON with milli-units (`act_wh`, `volt_mv`, `curr_ma`) and percentage power factor.
- **Transparent 3-Pillar Conformance Scoring**:
  - **Syntactic Conformance (30%)**: Payload structure, parseability, schema envelopes.
  - **Semantic Conformance (40%)**: Standard OBIS codes, unit conversions, type coercion, timezone offsets.
  - **Data Integrity & Physical Sanity (30%)**: Monotonic non-decreasing energy accumulation, nominal grid electrical limits (160V - 300V), RTC clock drift audit.
- **Root-Cause Diagnostics & Auto-Remediation**: Field-level discrepancy isolation with actionable configuration recommendations.
- **Synthetic AMI Telemetry Generator**: Simulates realistic diurnal load curves, power factor variations, tamper events (magnetic influence, cover open), grid outages, and malformed payload injection.
- **Enterprise Dark-Themed UI Workbench**: Single-Page Application featuring live interactive transformation previews, split-pane source-to-canonical-to-target inspectors, and audit history.

---

## 🚀 Quickstart

### Prerequisites
- Python 3.10+ (tested on Python 3.12)
- pip

### 1. Installation
```bash
git clone https://github.com/PalaniappanR02/vidyutsetu.git
cd vidyutsetu
pip install -r requirements.txt
```

### 2. Run the Workbench
```bash
# Using uvicorn directly
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Or using the run script
chmod +x run.sh
./run.sh
```
Navigate to `http://localhost:8000` in your browser.

### 3. Run Automated Tests
```bash
pytest
```

---

## 🏛️ Architecture Overview

```
                                      ┌─────────────────────────────────┐
                                      │        Raw Vendor Ingestion      │
                                      │  (Alpha / Beta / Gamma / Delta) │
                                      └────────────────┬────────────────┘
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │     Bidirectional Adapters      │
                                      │   - Scalers & Unit Multipliers  │
                                      │   - Timezone Normalization      │
                                      │   - OBIS Code Registry          │
                                      └────────────────┬────────────────┘
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │      Canonical Data Model       │
                                      │      (IEC 61968-9 / IS 15959)   │
                                      └────────────────┬────────────────┘
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           ▼                                                       ▼
        ┌────────────────────────────────────┐                  ┌────────────────────────────────────┐
        │        Validation & Scoring        │                  │      Cross-Vendor Serialization    │
        │  - Electrical Range Checks         │                  │  - Serialize to Target Vendor      │
        │  - Monotonic Energy Registers      │                  │  - Export CSV / JSON Payloads      │
        │  - Diagnostic Auto-Remediation     │                  │  - Audit Persistence in SQLite     │
        └────────────────────────────────────┘                  └────────────────────────────────────┘
```

---

## 📊 Sample Datasets
The `samples/` directory provides realistic datasets for hands-on workbench testing:
- `samples/alpha_hes_normal.json`: DLMS/COSEM normal load profile.
- `samples/alpha_hes_tamper.json`: DLMS/COSEM with critical magnetic tamper and power outage alarms.
- `samples/beta_hes_normal.csv`: Beta HES CSV load survey with IST timestamps.
- `samples/beta_hes_anomaly.csv`: Beta HES with non-monotonic step-down and voltage swell.
- `samples/gamma_mdms_normal.json`: CIM IEC 61968-9 enterprise payload.
- `samples/delta_legacy_normal.json`: Delta proprietary milli-unit payload.

---

## 📄 Documentation Links
- [Architecture & Standards Research](docs/architecture_and_research.md)
- [User Guide](USER_GUIDE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Known Limitations](KNOWN_LIMITATIONS.md)

---

## ⚖️ Standards Disclaimer
VidyutSetu is an educational, testing, and engineering workbench for simulated AMI data exchange. It does not certify official compliance under formal standard-setting bodies nor does it represent proprietary integration with any specific commercial utility vendor.

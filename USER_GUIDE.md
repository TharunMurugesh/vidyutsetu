# VidyutSetu User Guide

Welcome to **VidyutSetu**, the AMI Data Exchange Interoperability Testing Workbench. This guide walks you through executing tests, evaluating interoperability scores, and simulating cross-vendor data exchange.

---

## 1. Navigating the Interface
- **Dashboard**: High-level overview of test metrics, active adapters, and the vendor interoperability conformance matrix.
- **Testing Workbench**: Core testing workspace where you can upload vendor files or generate synthetic AMI data.
- **Live Transformer**: Interactive reference mapping showing how vendor fields translate into canonical attributes.
- **Vendor Adapters**: Catalog of registered vendor profiles (Alpha, Beta, Gamma, Delta).
- **Audit History**: Historical audit log of all test runs with score breakdowns and diagnostic issues.
- **Standards Ref**: Reference guide for IS 15959, DLMS/COSEM, and IEC 61968-9 standards.

---

## 2. Running an Interoperability Test

### Step 1: Open the Testing Workbench
Click the **Testing Workbench** button in the navigation header.

### Step 2: Select Source Vendor & Ingestion Data
1. Select the **Source Vendor Format** (e.g., *Alpha HES (DLMS/COSEM)* or *Beta HES (CSV)*).
2. Choose one of two ways to supply data:
   - **Synthetic Generator**: Click **Generate Payload** to produce realistic multi-meter load curves. You can toggle *Inject Electrical Anomalies* or *Inject Tamper Alarms* to test edge-case handling.
   - **Upload or Paste**: Paste raw JSON/CSV directly into the text editor or click **Browse** to upload a file from your machine (such as one of the files in `samples/`).

### Step 3: Choose Destination Target System
Select the **Target Destination System** (e.g., *Gamma MDMS (CIM IEC 61968-9)*) or choose *Validate Only*.

### Step 4: Execute Test
Click **Execute Interoperability Validation & Transformation**.

### Step 5: Review Conformance & Diagnostics
The results panel will reveal:
- **Interoperability Conformance Score**: Composite score (0-100%) and Letter Grade (A+, A, B, C, F).
- **Score Breakdown**:
  - *Syntactic Conformance (30%)*: Envelope and parsing integrity.
  - *Semantic Conformance (40%)*: Proper unit conversions and OBIS code mapping.
  - *Data Integrity (30%)*: Non-monotonic energy, electrical boundaries (160V-300V), RTC clock drift.
- **Diagnostic Issues & Auto-Remediation**: Field-by-field problem explanations with concrete configuration suggestions.
- **Split-Pane Payloads**: Side-by-side view of the normalized **Canonical Data Model** and the serialized **Target Vendor Output**.

---

## 3. Presets & Demonstration Scenarios
Quick sample presets are available at the top of the Workbench:
- **Sample Alpha DLMS**: Structured OBIS registers per IS 15959.
- **Sample Beta CSV**: Flat CSV with Indian Standard Time (`DD-MM-YYYY HH:mm:ss`).
- **Sample Gamma CIM**: Enterprise IEC 61968-9 nested JSON.
- **Sample Delta Legacy**: Proprietary milli-unit values (`act_wh`, `volt_mv`).

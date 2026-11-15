# AGENTS.md — Guidelines for VidyutSetu Autonomous Development

## Overview
VidyutSetu is an enterprise-grade AMI (Advanced Metering Infrastructure) Data Exchange Interoperability Testing Workbench. It validates, normalizes, maps, and benchmarks smart meter telemetry and control messages exchanged between Head End Systems (HES) and Meter Data Management Systems (MDMS).

## Standards Alignment
- **IEC 61968-9**: Application integration at electric utilities – System interfaces for distribution management – Part 9: Interfaces for meter reading and control.
- **DLMS/COSEM (IEC 62056)**: Device Language Message Specification / Companion Specification for Energy Metering.
- **IS 16444 & IS 15959**: Indian standard companion specification for AC static direct connected and transformer operated smart meters (OBIS code mapping).

## Architecture & Directory Conventions
- `backend/`: FastAPI application, Pydantic schemas, canonical transformer engine, vendor adapters, SQLite database.
  - `backend/models/`: Canonical data model and validation schemas.
  - `backend/adapters/`: Vendor-specific HES/MDMS format adapters (bidirectional).
  - `backend/engine/`: Validation pipeline, normalization, scoring, auto-remediation.
  - `backend/generator/`: Synthetic AMI data generation engine.
  - `backend/db/`: SQLAlchemy models, session, and test run history persistence.
  - `backend/api/`: REST endpoints for workbench operations.
  - `backend/static/`: Enterprise frontend application (Vanilla ES6, Tailwind CSS, Chart.js, Lucide icons).
- `docs/`: Technical specifications, architecture decisions, canonical data dictionary, and standards mapping.
- `samples/`: Canonical and vendor-specific AMI datasets (Alpha, Beta, Gamma, Delta).
- `tests/`: Automated unit, integration, and UI verification test suite.

## Testing & Verification Commands
- Run backend tests: `pytest tests/ -v`
- Run UI verification test: `python3 -m pytest tests/test_ui.py`
- Run local server: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`

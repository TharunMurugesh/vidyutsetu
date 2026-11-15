# VidyutSetu Known Limitations & Future Scope

While VidyutSetu provides a comprehensive software simulation and testing workbench for AMI interoperability, the following real-world boundaries and design trade-offs apply:

1. **Simulated Protocols vs. Direct Physical Layer Communication**:
   - VidyutSetu operates at the **data exchange and payload integration level** (HES to MDMS). It processes structured JSON, CSV, and XML payloads.
   - It does not emulate low-level physical RF mesh, cellular (NB-IoT/4G), or optical probe protocols (HDLC, G3-PLC, DLMS Green Book physical layer framing).

2. **Standards Certification**:
   - Conformance scoring is benchmarked against standard published specifications (IEC 61968-9, DLMS UA Blue/Green books, IS 15959).
   - This workbench is an engineering test tool and does not substitute for formal certification from the DLMS User Association or CPRI (Central Power Research Institute).

3. **Vendor Formats**:
   - Alpha, Beta, Gamma, and Delta profiles represent archetype vendor formats derived from real-world AMI integration experience.
   - Specific commercial vendors often implement proprietary firmware variants, requiring custom mapping adjustments via the Workbench adapter configs.

4. **Security & Cryptography**:
   - DLMS Suite 0 / Suite 1 / Suite 2 AES-GCM encryption is expected to be terminated at the Head End System (HES) before reaching the interoperability test workbench.

5. **Persistence**:
   - By default, VidyutSetu uses a lightweight local SQLite database (`vidyutsetu.db`). For high-throughput enterprise load testing exceeding 100,000 meters, PostgreSQL or TimescaleDB is recommended.

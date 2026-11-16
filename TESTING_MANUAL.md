# VidyutSetu Testing Manual

A complete testing guide for anyone (no technical background needed). This manual focuses on **real-world usage**, **UI/UX quality**, and **edge case handling**.

---

## Table of Contents

1. [Setup & Prerequisites](#setup--prerequisites)
2. [Quick Start Test](#quick-start-test)
3. [Core Features Testing](#core-features-testing)
4. [Edge Cases & Error Handling](#edge-cases--error-handling)
5. [UI/UX Quality Checks](#uiux-quality-checks)
6. [Performance & Operational Tests](#performance--operational-tests)
7. [Issue Reporting Template](#issue-reporting-template)

---

## Setup & Prerequisites

### What You Need
- A computer with internet access
- A web browser (Chrome, Firefox, Safari, Edge)
- 10-15 minutes for setup

### How to Start Locally

**Terminal 1: Start the Backend**
```bash
cd /home/tm/documents/projects/vidyutsetu
npm run backend:dev
```
You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Terminal 2: Start the Frontend**
```bash
cd /home/tm/documents/projects/vidyutsetu
npm run dev
```
You should see:
```
VITE v8.3.8  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Open your browser** and go to: `http://localhost:5173`

You should see the VidyutSetu dashboard with a dark theme and green accent colors.

---

## Quick Start Test

### What to Do
1. **Click "Workbench" tab** (second tab at the top)
2. **Keep all default settings** (Alpha HES source, Gamma MDMS target)
3. **Click "Generate Scenario"** button
4. **Wait 2-3 seconds** for synthetic data to appear in the text area
5. **Click "Execute Interoperability Validation & Transformation"** button (green button at bottom-right)
6. **Wait for results** (should see a green "PASS" badge)

### What Should Happen
- ✅ Synthetic data populates in the text area
- ✅ Execute button changes to show "Executing..." with spinning icon
- ✅ Results appear below with conformance status (PASS/FAIL/etc.)
- ✅ No error messages or red warnings
- ✅ Execution time shown (e.g., "234 ms")

### If Something Goes Wrong
| Issue | Likely Cause |
|-------|-------------|
| Button doesn't respond | Backend not running (check Terminal 1) |
| "Failed to fetch" error | Backend on wrong port (should be 8000) |
| Blank page | Frontend not running (check Terminal 2) |
| Data doesn't appear | Wait longer (first generation is slower) |

**Success Criteria**: You see a green "PASS" badge with 0 Mandatory Fails and some number of Assertions Checked.

---

## Core Features Testing

### 1. Synthetic Data Generation

#### Test: Different Vendor Formats
**What to Do:**
1. Go to Workbench tab
2. Select "Beta HES (Columnar CSV Format)" from Source dropdown
3. Click "Generate Scenario"
4. Check the text area

**What to Look For:**
- Beta HES should show CSV format (comma-separated values with headers: MTR_ID, RDG_TIME, etc.)
- Should NOT be JSON
- Should have column headers
- Should have at least 3 rows of data

**Repeat for:**
- Gamma MDMS (should be JSON with nested structure)
- Delta Legacy (should be JSON with different field names like `act_wh`, `volt_mv`)

#### Test: Inject Anomalies
**What to Do:**
1. Check the box "Inject Grid Physical Faults (Negative kWh, Voltage OOB)"
2. Click "Generate Scenario"
3. Execute the test

**What to Look For:**
- **Anomaly Heatmap tab** should appear in results
- Should show some amber/orange cells (anomalies detected)
- Flagged readings list should show at least 1 anomaly
- Each anomaly should have a score (0.0-1.0) and description

**Expected**: With injected faults, you should NOT see a "PASS" status. Should be "CONDITIONAL" or "FAIL".

#### Test: Reproducible Seed
**What to Do:**
1. Enter "42" in the "RNG Reproducibility Seed" field
2. Click "Generate Scenario" → note the data
3. Click "Generate Scenario" again (seed still "42")
4. Compare the two datasets

**What to Look For:**
- Both generations should produce **identical data**
- Timestamps should match
- Energy values should match exactly
- If different, test has failed

---

### 2. Data Validation Pipeline

#### Test: Valid Data → PASS
**What to Do:**
1. Generate synthetic data (Alpha HES, no anomalies)
2. Execute test
3. Click "Diagnostic Issues" tab

**What to Look For:**
- Status badge shows "PASS" (green)
- "Zero Conformance Violations" message appears
- No red error boxes

#### Test: Stage-by-Stage Blame Attribution
**What to Do:**
1. Execute any test
2. Look at the 4-box pipeline visualization:
   - Stage A: Source Schema
   - Stage B: Adapter Mapping
   - Stage C: Canonical Model
   - Stage D: Target Serializer

**What to Look For:**
- Each stage shows a colored dot (green = clean, red = errors, amber = warnings)
- Clicking each stage filters the issues list to show only issues from that stage
- Error counts match (e.g., "2 Err / 1 Warn")

#### Test: View Canonical Output
**What to Do:**
1. Execute any test
2. Click "Canonical Payload (IEC 61968-9)" tab

**What to Look For:**
- JSON structure with:
  - `header` (message_id, source_system, created_at, version)
  - `readings` array (each with meter_serial_number, timestamp, energy values, etc.)
  - `events` array (should be empty if no events)
  - `controls` array (should be empty if no controls)
- Energy values in kWh
- Timestamps in ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
- Anomaly fields present (`anomaly_score`, `is_anomaly`)

---

### 3. ML Anomaly Detection (Stage E)

#### Test: Heatmap Display
**What to Do:**
1. Generate data with "Inject Grid Physical Faults"
2. Execute test
3. Click "ML Anomaly Heatmap (Stage E)" tab

**What to Look For:**
- Grid of colored boxes (each = one reading)
- Green boxes = normal readings
- Amber/orange boxes = anomalies (marked with ⚠)
- Boxes are interactive (hover shows tooltip with meter ID and score)
- Below: "Flagged Telemetry Anomalies" list with details

**Edge Case**: Test with 50+ readings
- Heatmap should still render smoothly
- Should be scrollable
- Boxes should be clickable

#### Test: Anomaly Score Range
**What to Do:**
1. Look at any anomaly in the flagged list
2. Check the score value

**What to Look For:**
- Score is between 0.000 and 1.000
- Higher score = more anomalous
- 0.5 or above is typically flagged

---

### 4. Contracts & Standards

#### Test: View All Contracts
**What to Do:**
1. Click "Contracts" tab (top navigation)
2. Wait for contracts to load

**What to Look For:**
- 4 contract cards appear (Alpha, Beta, Gamma, Delta)
- Each card shows:
  - Vendor name
  - Format type (JSON or CSV)
  - Protocol (DLMS/COSEM, CIM IEC 61968-9, etc.)
  - OBIS code mappings
  - Event mappings

#### Test: Contract Diff
**What to Do:**
1. In Contracts tab, scroll down to "Contract Comparison Tool"
2. Select "Alpha HES" and "Gamma MDMS"
3. Click "Run Diff"

**What to Look For:**
- Format Match: "No" (JSON ≠ proprietary)
- Protocol Match: "No"
- OBIS Codes section shows:
  - "Only in Alpha" (codes unique to Alpha)
  - "Shared" (codes both have)
  - "Only in Gamma" (codes unique to Gamma)

---

### 5. Test History & Regression Comparison

#### Test: History Records
**What to Do:**
1. Execute 2-3 different tests in Workbench
2. Click "History" tab
3. Look at the table

**What to Look For:**
- Each row shows: Run ID, Timestamp, Source Vendor, Target Vendor, Status
- Table is sorted by most recent first
- "View Detail" button opens a modal with full results
- Run IDs are unique and consistent

#### Test: Regression Comparison
**What to Do:**
1. Execute test #1 → note the Run ID
2. Execute test #2 → note the second Run ID
3. In History tab, scroll down to "Regression Comparison Tool"
4. Paste both Run IDs
5. Click "Run Comparison"

**What to Look For:**
- Baseline & Candidate cards show conformance status
- "Resolved Issues", "New Issues", "Persistent Issues" boxes with counts
- If both tests are PASS, should show "NO CHANGE"
- If test #2 is worse, should show "REGRESSION DETECTED"

---

## Edge Cases & Error Handling

### Error Case 1: Missing Required Field

**What to Do:**
1. Go to Workbench
2. Clear the text area
3. Paste this minimal invalid JSON:
   ```json
   {"meter_data": []}
   ```
4. Click Execute

**What Should Happen:**
- Status should be "FAIL" (red)
- Diagnostic Issues tab should show errors about missing fields
- Error messages should be specific (e.g., "MISSING_METER_ID")
- Suggested fixes should appear

---

### Error Case 2: Invalid Data Types

**What to Do:**
1. Generate data, but modify it:
   - Find a numeric value (e.g., `150.5`)
   - Change it to text (e.g., `"abc"`)
2. Click Execute

**What Should Happen:**
- Status should be "FAIL"
- Error should mention type mismatch or parsing error
- Should specify which field is wrong

---

### Error Case 3: Out-of-Range Values

**What to Do:**
1. Generate data, modify:
   - Change voltage to `500` (normal is 160-300V)
   - Change current to `300` (normal is 0-200A)
2. Click Execute

**What Should Happen:**
- Should NOT fail (values are still numbers)
- Anomaly Heatmap should flag these as anomalies
- Diagnostic Issues should warn about out-of-bounds
- Status might be "CONDITIONAL"

---

### Error Case 4: Non-Monotonic Energy

**What to Do:**
1. Generate data with same meter (3 meters, 6 intervals)
2. Find rows with same meter and modify energy to decrease:
   - Row 1: 100 kWh
   - Row 2: 110 kWh
   - Row 3: 90 kWh (goes DOWN - error!)
3. Execute

**What Should Happen:**
- Status should be "FAIL"
- Diagnostic Issues should show "NON_MONOTONIC_ENERGY_REGISTER"
- Should suggest "Energy registers must be cumulative"

---

### Error Case 5: Duplicate Timestamps

**What to Do:**
1. Generate data, modify:
   - Find two rows with the same meter
   - Change second timestamp to match the first
2. Execute

**What Should Happen:**
- Status should be "CONDITIONAL" (warning)
- Issue code: "DUPLICATE_INTERVAL_TIMESTAMP"
- Should warn about duplicate readings

---

### Error Case 6: Future Timestamps

**What to Do:**
1. Generate data, modify:
   - Change a timestamp to 1 year in the future (2027-11-16)
2. Execute

**What Should Happen:**
- Should flag as anomaly or warning
- Conformance might drop

---

### Error Case 7: Malformed JSON/CSV

**What to Do:**
1. Clear text area
2. Paste invalid JSON:
   ```json
   {meter_data: [{"meter_number": "MTR-001"
   ```
   (missing closing braces)
3. Click Execute

**What Should Happen:**
- Status should be "INCOMPLETE"
- Error message should mention "JSON parsing failed" or similar
- NO crash or white screen

---

### Error Case 8: Empty File

**What to Do:**
1. Clear text area
2. Try to Execute with empty input

**What Should Happen:**
- Toast/error message: "Please provide raw payload text or upload a file"
- Button should be disabled until input is provided

---

### Error Case 9: Very Large Payload

**What to Do:**
1. Generate data with:
   - 20 meters
   - 48 intervals
   - Both anomalies and tampers injected
2. Execute

**What Should Happen:**
- Should handle without crashing
- Might take 5-10 seconds
- Results should still be accurate
- Heatmap with 960 cells should still render smoothly

---

## UI/UX Quality Checks

### Visual Design
- [ ] Dark theme is consistent (no bright white areas that hurt eyes)
- [ ] Text is readable (high contrast between text and background)
- [ ] Buttons are clearly clickable (hover state changes them)
- [ ] No broken images or missing icons
- [ ] Tab buttons clearly show which tab is active

### Responsiveness
**What to Do:**
1. Resize browser window to half-width
2. Try on mobile device (if available)

**What to Look For:**
- Layout should adapt (not be squeezed)
- Text should not be cut off
- Buttons should still be clickable on mobile
- Scrollbars appear when needed

### Navigation
- [ ] All tabs load without lag
- [ ] Clicking a tab immediately shows that tab's content
- [ ] No "page not found" errors
- [ ] Breadcrumbs or clear indication of current section

### Forms & Inputs
- [ ] Dropdowns have clear labels
- [ ] Number inputs accept numbers only
- [ ] Buttons disable while loading (don't double-click)
- [ ] Clear error messages (not technical jargon)

### Accessibility
- [ ] Can navigate using Tab key
- [ ] Can interact with mouse or keyboard
- [ ] Font sizes are readable (not tiny)
- [ ] Colors are not the only way to convey information (labels + colors)

---

## Performance & Operational Tests

### Speed Tests

#### Test: Page Load Time
**What to Do:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh page (Ctrl+R)
4. Watch the network requests

**What to Look For:**
- Page fully loads in < 3 seconds
- No red errors (404s)
- No hanging requests

#### Test: Synthetic Data Generation Speed
**What to Do:**
1. Set 20 meters, 48 intervals
2. Time how long "Generate" takes

**What to Look For:**
- Should complete in < 2 seconds
- UI should not freeze

#### Test: Execution Speed
**What to Do:**
1. Execute test with 20 meters × 48 intervals (960 readings)
2. Time how long execution takes

**What to Look For:**
- Should complete in < 10 seconds
- Duration displayed should match actual time

### Stability Tests

#### Test: Multiple Executions
**What to Do:**
1. Run the same test 5 times in a row
2. Check each result

**What to Look For:**
- No memory leaks (browser should not slow down)
- Results should be identical
- No crashed browser tabs

#### Test: Browser Refresh During Execution
**What to Do:**
1. Click Execute
2. While it's running, press Ctrl+R

**What to Look For:**
- Should handle gracefully (not crash)
- May lose current results (acceptable)
- Backend should still be running

#### Test: Long Session
**What to Do:**
1. Keep the app open for 30 minutes
2. Use it normally
3. Run a test at the end

**What to Look For:**
- No lag or slowdown over time
- Results still accurate
- No connection errors

---

## Issue Reporting Template

If you find a problem, please report it like this:

```markdown
## Issue: [Brief Title]

### Environment
- OS: (Windows / Mac / Linux)
- Browser: (Chrome / Firefox / Safari / Edge)
- Backend URL: (Local / Staging / Production)
- Date & Time: (YYYY-MM-DD HH:MM:SS)

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [What you expected to happen]
4. [What actually happened]

### Expected Behavior
[Description of what should have happened]

### Actual Behavior
[What actually happened instead]

### Screenshots
[Paste screenshots here if applicable]

### Error Messages
[Copy any error messages from console (F12 → Console)]

### Impact
- [ ] Critical (app crashes, data loss)
- [ ] High (feature doesn't work)
- [ ] Medium (feature works but incorrectly)
- [ ] Low (cosmetic issue)
```

---

## Checklist: Before Shipping

Use this checklist before deploying to production:

- [ ] All Quick Start Test items pass
- [ ] Synthetic data generates for all 4 vendors
- [ ] Validation pipeline shows correct blame attribution
- [ ] Anomaly detection flags actual anomalies
- [ ] Contract viewing and comparison work
- [ ] History records tests correctly
- [ ] Regression comparison detects regressions
- [ ] All 7 error cases are handled gracefully
- [ ] No red console errors (F12 → Console)
- [ ] Performance tests show < 10 seconds for large payloads
- [ ] Stability test shows no memory leaks
- [ ] Mobile layout works (at least tablet size)
- [ ] All buttons have hover states
- [ ] Error messages are helpful, not cryptic

---

## Success Criteria

A passing test suite means:

✅ **Functional**: All features work as designed
✅ **Robust**: Edge cases handled gracefully
✅ **Fast**: Completes in reasonable time
✅ **Clear**: Users understand what happened
✅ **Stable**: No crashes or memory leaks
✅ **Accessible**: Can be used on different devices

If all items above are ✅, the application is ready for production.

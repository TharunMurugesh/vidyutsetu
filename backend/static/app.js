/**
 * VidyutSetu Enterprise Frontend Application Logic
 */

let activeTab = 'dashboard';
let currentVendors = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  await loadVendors();
  await refreshDashboard();
});

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.remove('bg-brand-600', 'text-white', 'shadow-sm');
    el.classList.add('text-slate-400');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-tab-${tabId}`) || document.getElementById(`tab-btn-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('bg-brand-600', 'text-white', 'shadow-sm');
  }

  if (window.lucide) lucide.createIcons();

  if (tabId === 'dashboard') refreshDashboard();
  if (tabId === 'history') loadHistoryRuns();
  if (tabId === 'vendors') renderVendorCards();
  if (tabId === 'contracts') loadContracts();
}

async function loadVendors() {
  try {
    const res = await fetch('/api/vendors');
    currentVendors = await res.json();
  } catch (e) {
    console.error('Failed to load vendors', e);
  }
}

async function refreshDashboard() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    document.getElementById('stat-total-runs').innerText = data.total_test_runs || 0;
    document.getElementById('stat-avg-score').innerText = data.average_interoperability_score || 0;
    document.getElementById('stat-adapters').innerText = data.active_vendor_adapters || 4;

    const tbody = document.getElementById('recent-runs-table-body');
    tbody.innerHTML = '';
    if (!data.recent_runs || data.recent_runs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500 font-sans">No test runs executed yet. Launch a test from the Workbench tab!</td></tr>`;
      return;
    }

    data.recent_runs.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition cursor-pointer';
      tr.onclick = () => viewRunDetail(r.run_id);
      const st = r.conformance_status || 'UNKNOWN';
      const badgeColor = conformanceBadgeClass(st);
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-semibold text-brand-400">${r.run_id}</td>
        <td class="py-2.5 px-3 text-slate-300 font-sans">${new Date(r.execution_time).toLocaleTimeString()}</td>
        <td class="py-2.5 px-3 font-sans text-slate-200">${r.source_vendor}</td>
        <td class="py-2.5 px-3 font-sans text-slate-400">${r.target_vendor || 'None'}</td>
        <td class="py-2.5 px-3 text-slate-200">${r.total_records}</td>
        <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeColor}">${st}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Failed to refresh dashboard stats', e);
  }
}

async function generateSyntheticIntoWorkbench() {
  const vendorId = document.getElementById('source-vendor-select').value;
  const meters = document.getElementById('gen-meters').value || 3;
  const intervals = document.getElementById('gen-intervals').value || 4;
  const anomalies = document.getElementById('gen-inject-anomalies').checked;
  const tampers = document.getElementById('gen-inject-tampers').checked;

  try {
    const url = `/api/generate?vendor_id=${vendorId}&meter_count=${meters}&intervals=${intervals}&inject_anomalies=${anomalies}&inject_tampers=${tampers}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    const payload = data.payload;

    const editor = document.getElementById('raw-payload-input');
    if (typeof payload === 'string') {
      editor.value = payload;
    } else {
      editor.value = JSON.stringify(payload, null, 2);
    }
  } catch (e) {
    alert('Failed to generate synthetic data: ' + e.message);
  }
}

async function loadSamplePreset(vendorId) {
  document.getElementById('source-vendor-select').value = vendorId;
  const editor = document.getElementById('raw-payload-input');

  let sampleFile = '';
  if (vendorId === 'alpha-hes') sampleFile = 'alpha_hes_normal.json';
  else if (vendorId === 'beta-hes') sampleFile = 'beta_hes_normal.csv';
  else if (vendorId === 'gamma-mdms') sampleFile = 'gamma_mdms_normal.json';
  else if (vendorId === 'delta-legacy') sampleFile = 'delta_legacy_normal.json';

  try {
    const res = await fetch(`/api/generate?vendor_id=${vendorId}&meter_count=2&intervals=4`);
    const data = await res.json();
    if (typeof data.payload === 'string') {
      editor.value = data.payload;
    } else {
      editor.value = JSON.stringify(data.payload, null, 2);
    }
  } catch (e) {
    console.error('Preset load error', e);
  }
}

async function runWorkbenchExecution() {
  const sourceVendor = document.getElementById('source-vendor-select').value;
  const targetVendor = document.getElementById('target-vendor-select').value;
  const rawPayload = document.getElementById('raw-payload-input').value;
  const fileInput = document.getElementById('file-upload-input');

  const formData = new FormData();
  formData.append('source_vendor', sourceVendor);
  formData.append('target_vendor', targetVendor);

  if (fileInput.files.length > 0) {
    formData.append('file', fileInput.files[0]);
  } else if (rawPayload.trim()) {
    formData.append('raw_payload', rawPayload);
  } else {
    alert('Please provide a payload or upload a file first.');
    return;
  }

  const btn = document.getElementById('btn-run-workbench');
  btn.disabled = true;
  btn.innerHTML = `<span class="animate-spin inline-block mr-2">⚙</span> Validating & Normalizing...`;

  try {
    const res = await fetch('/api/workbench/execute', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    btn.disabled = false;
    btn.innerHTML = `<span>Execute Interoperability Validation & Transformation</span>`;

    if (res.status !== 200) {
      alert('Execution failed: ' + (result.detail || 'Unknown error'));
      return;
    }

    displayExecutionResults(result);
  } catch (e) {
    btn.disabled = false;
    btn.innerHTML = `<span>Execute Interoperability Validation & Transformation</span>`;
    alert('Error running test: ' + e.message);
  }
}

function conformanceBadgeClass(status) {
  if (status === 'PASS')        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (status === 'CONDITIONAL') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (status === 'FAIL')        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  return 'text-slate-400 bg-slate-500/10 border-slate-500/20'; // INCOMPLETE / UNKNOWN
}

function displayExecutionResults(res) {
  const container = document.getElementById('results-container');
  container.classList.remove('hidden');

  const cf = res.conformance || {};
  const status = cf.status || 'INCOMPLETE';

  document.getElementById('res-run-id').innerText = res.run_id;
  document.getElementById('res-duration').innerText = res.duration_ms + ' ms';
  document.getElementById('res-total-score').innerText = `${cf.total_assertions || 0} assertion(s)`;
  document.getElementById('res-summary-text').innerText = cf.summary || '';

  const badge = document.getElementById('res-grade-badge');
  badge.innerText = status;
  badge.className = 'px-3 py-1 rounded-lg text-lg font-extrabold border ' + conformanceBadgeClass(status).replace(/text-/g, 'text-').replace('bg-', 'bg-').replace('border-', 'border-');

  document.getElementById('res-syntactic-score').innerText = cf.total_assertions || 0;
  document.getElementById('res-semantic-score').innerText = cf.mandatory_failure_count || 0;
  document.getElementById('res-integrity-score').innerText = cf.warning_count || 0;

  // Blame attribution summary
  const blameEl = document.getElementById('res-blame-summary');
  if (blameEl && res.blame_attribution) {
    const stages = ['SOURCE', 'ADAPTER', 'CANONICAL', 'TARGET'];
    const labels = { SOURCE: 'Source Schema', ADAPTER: 'Adapter Mapping', CANONICAL: 'Canonical Validation', TARGET: 'Target Contract' };
    const colors = { SOURCE: 'cyan', ADAPTER: 'blue', CANONICAL: 'violet', TARGET: 'orange' };
    blameEl.innerHTML = stages.filter(s => res.blame_attribution[s]).map(s => {
      const b = res.blame_attribution[s];
      const c = colors[s];
      return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-${c}-500/10 text-${c}-400 border border-${c}-500/20">${labels[s]}: ${b.error_count}E / ${b.warning_count}W</span>`;
    }).join(' ');
  }

  // Issues & Suggestions
  const issuesList = document.getElementById('res-issues-list');
  issuesList.innerHTML = '';
  document.getElementById('res-issues-count').innerText = res.issues.length;

  if (res.issues.length === 0) {
    issuesList.innerHTML = `<div class="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center space-x-2">
      <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i>
      <span>Zero conformance violations detected! Full IEC 61968-9 and physical grid criteria satisfied.</span>
    </div>`;
  } else {
    const stageColors = { ADAPTER: 'blue', CANONICAL: 'violet', TARGET: 'orange', SOURCE: 'cyan' };
    res.issues.forEach(iss => {
      const issDiv = document.createElement('div');
      const isErr = iss.severity === 'ERROR';
      const bgBorder = isErr ? 'bg-rose-950/40 border-rose-900/60' : 'bg-amber-950/40 border-amber-900/60';
      const textCol = isErr ? 'text-rose-400' : 'text-amber-400';
      const sc = stageColors[iss.stage] || 'slate';

      issDiv.className = `p-3 rounded-lg border ${bgBorder} text-xs space-y-1`;
      issDiv.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold ${textCol} flex items-center space-x-1.5 font-mono">
            <span>[${iss.severity}] ${iss.code}</span>
            <span class="text-${sc}-400 bg-${sc}-500/10 px-1.5 py-0.5 rounded text-[10px] border border-${sc}-500/20">${iss.stage || 'CANONICAL'}</span>
          </span>
          <span class="text-slate-400 text-[11px] font-mono">${iss.field || 'Envelope'}</span>
        </div>
        <p class="text-slate-200">${iss.message}</p>
        ${iss.suggested_fix ? `<div class="text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800 text-[11px] mt-1">
          <span class="text-brand-400 font-semibold">Suggested Remediation:</span> ${iss.suggested_fix}
        </div>` : ''}
      `;
      issuesList.appendChild(issDiv);
    });
  }

  // Stage E: Anomaly Detection heatmap
  const anomalySection = document.getElementById('res-anomaly-section');
  const anomaly = res.anomaly_detection;
  if (anomalySection && anomaly) {
    anomalySection.classList.remove('hidden');
    const rateStr = (anomaly.anomaly_rate * 100).toFixed(1);
    const countBadge = anomaly.has_anomalies
      ? `<span class="text-amber-400 font-bold">${anomaly.anomaly_count} anomal${anomaly.anomaly_count === 1 ? 'y' : 'ies'} detected</span>`
      : `<span class="text-emerald-400 font-bold">No anomalies detected</span>`;
    const readings = (res.canonical_payload || {}).readings || [];
    const cells = readings.map((r, i) => {
      const score = r.anomaly_score != null ? r.anomaly_score : 0;
      const isAnom = r.is_anomaly;
      const opacity = Math.round(score * 10) / 10;
      const bg = isAnom ? `rgba(251,146,60,${0.15 + opacity * 0.65})` : `rgba(16,185,129,${0.07 + opacity * 0.2})`;
      const border = isAnom ? 'border-amber-500/50' : 'border-slate-700/40';
      const title = `Meter: ${r.meter_serial_number}\nScore: ${score.toFixed(3)}\nAnomaly: ${isAnom ? 'YES' : 'no'}`;
      return `<div title="${title}" class="w-6 h-6 rounded cursor-pointer border ${border} flex items-center justify-center text-[9px] font-mono" style="background:${bg};">${isAnom ? '⚠' : ''}</div>`;
    }).join('');

    document.getElementById('res-anomaly-section').innerHTML = `
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-200 font-sans flex items-center gap-2">
            <span class="text-amber-400">◉</span> ML Anomaly Detection (Stage E)
          </h3>
          <span class="text-[11px] text-slate-400">${anomaly.total_readings} reading(s) · ${rateStr}% anomaly rate · ${countBadge}</span>
        </div>
        <div class="flex flex-wrap gap-1">${cells || '<span class="text-slate-500 text-xs">No readings to display.</span>'}</div>
        ${anomaly.flagged_readings.length > 0 ? `
          <div class="space-y-1 max-h-36 overflow-y-auto">
            ${anomaly.flagged_readings.map(a => `
              <div class="flex items-start gap-2 p-2 rounded bg-amber-950/30 border border-amber-800/40 text-[11px]">
                <span class="text-amber-400 font-bold shrink-0">⚠ idx[${a.reading_index}]</span>
                <span class="text-slate-300 font-mono">${a.meter_serial_number}</span>
                <span class="text-amber-300">score=${a.anomaly_score.toFixed(3)}</span>
                <span class="text-slate-400">${a.description}</span>
                ${a.contributing_features.length > 0 ? `<span class="text-blue-400">[${a.contributing_features.join(', ')}]</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="flex items-center gap-4 text-[10px] text-slate-500">
          <span>■ <span style="color:rgba(16,185,129,0.6)">Green</span> = normal</span>
          <span>■ <span style="color:rgba(251,146,60,0.7)">Amber</span> = anomaly (brighter = higher score)</span>
          <span>Hover for meter/score details</span>
        </div>
      </div>
    `;
  }

  // Canonical viewer
  document.getElementById('res-canonical-code').innerText = JSON.stringify(res.canonical_payload, null, 2);

  // Target output
  document.getElementById('res-target-vendor-name').innerText = res.target_vendor || 'None';
  const targetCode = document.getElementById('res-target-code');
  if (typeof res.target_output === 'string') {
    targetCode.innerText = res.target_output;
  } else if (res.target_output) {
    targetCode.innerText = JSON.stringify(res.target_output, null, 2);
  } else {
    targetCode.innerText = '// No target transformation selected (Validation Only)';
  }

  if (window.lucide) lucide.createIcons();
  container.scrollIntoView({ behavior: 'smooth' });
}

async function runQuickDemo(source, target) {
  switchTab('workbench');
  document.getElementById('source-vendor-select').value = source;
  document.getElementById('target-vendor-select').value = target;
  await generateSyntheticIntoWorkbench();
  await runWorkbenchExecution();
}

async function loadHistoryRuns() {
  try {
    const res = await fetch('/api/test-runs');
    const runs = await res.json();
    const tbody = document.getElementById('history-runs-body');
    tbody.innerHTML = '';

    if (!runs || runs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-6 text-center text-slate-500 font-sans">No historical test runs recorded yet.</td></tr>`;
      return;
    }

    runs.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition text-xs';
      const st = r.conformance_status || 'UNKNOWN';
      tr.innerHTML = `
        <td class="py-3 px-3 font-semibold text-brand-400">${r.run_id}</td>
        <td class="py-3 px-3 text-slate-300 font-sans">${new Date(r.execution_time).toLocaleString()}</td>
        <td class="py-3 px-3 text-white font-sans">${r.source_vendor}</td>
        <td class="py-3 px-3 text-slate-400 font-sans">${r.target_vendor || 'None'}</td>
        <td class="py-3 px-3 text-slate-300">${r.valid_records} / ${r.total_records}</td>
        <td class="py-3 px-3"><span class="px-2 py-0.5 rounded font-bold border ${conformanceBadgeClass(st)}">${st}</span></td>
        <td class="py-3 px-3 text-slate-400">${r.duration_ms} ms</td>
        <td class="py-3 px-3">
          <button onclick="viewRunDetail('${r.run_id}')" class="text-brand-400 hover:text-brand-300 font-sans font-semibold">View Detail</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Failed to load history', e);
  }
}

async function viewRunDetail(runId) {
  try {
    const res = await fetch(`/api/test-runs/${runId}`);
    const r = await res.json();

    document.getElementById('modal-title').innerText = `Test Run Audit: ${r.run_id}`;
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div><strong class="text-slate-400">Source:</strong> <span class="text-white">${r.source_vendor}</span></div>
          <div><strong class="text-slate-400">Target:</strong> <span class="text-white">${r.target_vendor || 'None'}</span></div>
          <div><strong class="text-slate-400">Conformance:</strong>
            <span class="font-bold border px-2 py-0.5 rounded ml-1 ${conformanceBadgeClass((r.conformance || {}).status || 'UNKNOWN')}">${(r.conformance || {}).status || 'UNKNOWN'}</span>
          </div>
          <div><strong class="text-slate-400">Duration:</strong> <span class="text-slate-300">${r.duration_ms} ms</span></div>
        </div>

        <div>
          <h4 class="font-bold text-slate-300 mb-2 font-sans">Diagnostic Issues Found (${r.issues.length}):</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto pr-2">
            ${r.issues.map(iss => `
              <div class="p-2 rounded bg-slate-950 border border-slate-800 text-[11px]">
                <div class="text-rose-400 font-bold">[${iss.severity}] ${iss.code}</div>
                <div class="text-slate-300">${iss.message}</div>
                ${iss.suggested_fix ? `<div class="text-brand-400 mt-1">Fix: ${iss.suggested_fix}</div>` : ''}
              </div>
            `).join('') || '<div class="text-emerald-400 text-xs">No issues recorded.</div>'}
          </div>
        </div>

        <div>
          <h4 class="font-bold text-slate-300 mb-2 font-sans">Raw Payload Preview:</h4>
          <pre class="bg-slate-950 p-3 rounded text-slate-400 text-[11px] overflow-x-auto max-h-40 border border-slate-800">${r.raw_preview || '// None'}</pre>
        </div>
      </div>
    `;

    document.getElementById('detail-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    alert('Failed to load run details: ' + e.message);
  }
}

function closeModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

function renderVendorCards() {
  const container = document.getElementById('vendor-cards-grid');
  container.innerHTML = '';

  Object.values(currentVendors).forEach(v => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4';
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <span class="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold uppercase">${v.system_type}</span>
          <h3 class="text-lg font-bold text-white mt-1">${v.name}</h3>
          <p class="text-xs text-slate-400 font-mono">ID: ${v.vendor_id} | v${v.version}</p>
        </div>
        <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono uppercase">${v.format_type}</span>
      </div>

      <p class="text-xs text-slate-300 leading-relaxed">${v.description}</p>

      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <span class="text-slate-400">Protocol: <strong class="text-slate-200">${v.protocol}</strong></span>
        <button onclick="runQuickDemo('${v.vendor_id}', 'gamma-mdms')" class="text-brand-400 hover:text-brand-300 font-medium flex items-center space-x-1">
          <span>Test in Workbench</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
  if (window.lucide) lucide.createIcons();
}

function copyCode(elementId) {
  const text = document.getElementById(elementId).innerText;
  navigator.clipboard.writeText(text);
  alert('Payload copied to clipboard!');
}

async function loadContracts() {
  try {
    const res = await fetch('/api/contracts');
    const data = await res.json();
    const grid = document.getElementById('contracts-grid');
    grid.innerHTML = '';

    data.contracts.forEach(c => {
      const card = document.createElement('div');
      card.className = 'bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3';
      const obisKeys = Object.keys(c.obis_code_mappings || {});
      const eventKeys = Object.keys(c.event_mappings || {});
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-sm font-bold text-white">${c.name}</h3>
            <p class="text-[11px] text-slate-400 font-mono">${c.vendor_id} v${c.version}</p>
          </div>
          <span class="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[11px] font-mono uppercase">${c.format_type}</span>
        </div>
        <p class="text-xs text-slate-300">${c.description}</p>
        <div class="grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-900 p-2 rounded border border-slate-800">
            <span class="text-slate-400">Protocol:</span>
            <span class="text-white font-mono ml-1">${c.protocol}</span>
          </div>
          <div class="bg-slate-900 p-2 rounded border border-slate-800">
            <span class="text-slate-400">System:</span>
            <span class="text-white font-mono ml-1">${c.system_type}</span>
          </div>
        </div>
        ${obisKeys.length > 0 ? `
          <div class="text-[11px]">
            <span class="text-slate-400 font-semibold">OBIS Registers (${obisKeys.length}):</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${obisKeys.map(k => `<span class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">${k}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div class="text-[11px]">
          <span class="text-slate-400 font-semibold">Event Mappings (${eventKeys.length}):</span>
          <div class="flex flex-wrap gap-1 mt-1">
            ${eventKeys.map(k => `<span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">${k}</span>`).join('')}
          </div>
        </div>
        <details class="text-[11px]">
          <summary class="text-slate-400 cursor-pointer hover:text-white">Source Schema</summary>
          <pre class="bg-slate-900 p-2 mt-1 rounded text-slate-300 font-mono overflow-x-auto border border-slate-800">${JSON.stringify(c.source_schema, null, 2)}</pre>
        </details>
      `;
      grid.appendChild(card);
    });
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error('Failed to load contracts', e);
  }
}

async function runContractDiff() {
  const a = document.getElementById('diff-vendor-a').value;
  const b = document.getElementById('diff-vendor-b').value;
  try {
    const res = await fetch(`/api/contracts/diff/${a}/${b}`);
    const data = await res.json();
    const el = document.getElementById('diff-result');
    el.classList.remove('hidden');

    const fmtMatch = data.format_match ? '<span class="text-emerald-400">Yes</span>' : '<span class="text-rose-400">No</span>';
    const protoMatch = data.protocol_match ? '<span class="text-emerald-400">Yes</span>' : '<span class="text-rose-400">No</span>';

    el.innerHTML = `
      <div class="flex gap-4">
        <div class="flex-1 bg-slate-900 p-3 rounded border border-slate-800">
          <div class="text-slate-400 mb-1">Format Match: ${fmtMatch}</div>
          <div class="text-slate-400">Protocol Match: ${protoMatch}</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <span class="text-rose-400 font-semibold">Only in ${a} (${data.obis_codes.only_a.length})</span>
          <div class="mt-1 space-y-0.5">${data.obis_codes.only_a.map(c => `<div class="font-mono text-slate-300">${c}</div>`).join('') || '<div class="text-slate-500">None</div>'}</div>
        </div>
        <div>
          <span class="text-emerald-400 font-semibold">Shared (${data.obis_codes.shared.length})</span>
          <div class="mt-1 space-y-0.5">${data.obis_codes.shared.map(c => `<div class="font-mono text-slate-300">${c}</div>`).join('') || '<div class="text-slate-500">None</div>'}</div>
        </div>
        <div>
          <span class="text-amber-400 font-semibold">Only in ${b} (${data.obis_codes.only_b.length})</span>
          <div class="mt-1 space-y-0.5">${data.obis_codes.only_b.map(c => `<div class="font-mono text-slate-300">${c}</div>`).join('') || '<div class="text-slate-500">None</div>'}</div>
        </div>
      </div>
      <div>
        <span class="text-slate-400 font-semibold">Event Mapping Diff:</span>
        <div class="grid grid-cols-3 gap-3 mt-1">
          <div><span class="text-rose-400">Only ${a}:</span> ${data.event_mappings.only_a.join(', ') || 'None'}</div>
          <div><span class="text-emerald-400">Shared:</span> ${data.event_mappings.shared.length} mappings</div>
          <div><span class="text-amber-400">Only ${b}:</span> ${data.event_mappings.only_b.join(', ') || 'None'}</div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Failed to run contract diff', e);
  }
}

async function runRegressionCompare() {
  const runA = document.getElementById('compare-run-a').value.trim();
  const runB = document.getElementById('compare-run-b').value.trim();
  if (!runA || !runB) {
    alert('Enter both baseline and candidate Run IDs.');
    return;
  }
  try {
    const res = await fetch(`/api/test-runs/compare?run_a=${encodeURIComponent(runA)}&run_b=${encodeURIComponent(runB)}`);
    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || 'Comparison failed.');
      return;
    }
    const data = await res.json();
    const el = document.getElementById('regression-result');
    el.classList.remove('hidden');

    const regBadge = data.regression_detected
      ? '<span class="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold">REGRESSION DETECTED</span>'
      : data.improvement_detected
        ? '<span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">IMPROVEMENT</span>'
        : '<span class="text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded border border-slate-500/20 font-bold">NO CHANGE</span>';

    el.innerHTML = `
      <div class="flex items-center gap-4 mb-3">
        <div class="flex-1 bg-slate-900 p-3 rounded border border-slate-800">
          <div class="text-slate-400 text-[11px]">Baseline</div>
          <div class="font-mono text-white">${data.baseline.run_id}</div>
          <span class="px-1.5 py-0.5 rounded text-[11px] font-bold border ${conformanceBadgeClass(data.baseline.conformance_status)}">${data.baseline.conformance_status}</span>
        </div>
        <div class="text-slate-500 text-lg">→</div>
        <div class="flex-1 bg-slate-900 p-3 rounded border border-slate-800">
          <div class="text-slate-400 text-[11px]">Candidate</div>
          <div class="font-mono text-white">${data.candidate.run_id}</div>
          <span class="px-1.5 py-0.5 rounded text-[11px] font-bold border ${conformanceBadgeClass(data.candidate.conformance_status)}">${data.candidate.conformance_status}</span>
        </div>
      </div>
      <div class="mb-3">${regBadge}</div>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-emerald-950/30 p-3 rounded border border-emerald-800/40">
          <span class="text-emerald-400 font-semibold">Resolved</span>
          <div class="text-2xl font-bold text-white">${data.summary.resolved_count}</div>
          <div class="mt-1 max-h-24 overflow-y-auto space-y-0.5">
            ${data.resolved_issues.map(i => `<div class="font-mono text-emerald-300">${i.code}</div>`).join('') || '<div class="text-slate-500">-</div>'}
          </div>
        </div>
        <div class="bg-rose-950/30 p-3 rounded border border-rose-800/40">
          <span class="text-rose-400 font-semibold">New Issues</span>
          <div class="text-2xl font-bold text-white">${data.summary.new_count}</div>
          <div class="mt-1 max-h-24 overflow-y-auto space-y-0.5">
            ${data.new_issues.map(i => `<div class="font-mono text-rose-300">${i.code}</div>`).join('') || '<div class="text-slate-500">-</div>'}
          </div>
        </div>
        <div class="bg-slate-900 p-3 rounded border border-slate-800">
          <span class="text-slate-400 font-semibold">Persistent</span>
          <div class="text-2xl font-bold text-white">${data.summary.persistent_count}</div>
          <div class="mt-1 max-h-24 overflow-y-auto space-y-0.5">
            ${data.persistent_issues.map(i => `<div class="font-mono text-slate-300">${i.code}</div>`).join('') || '<div class="text-slate-500">-</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Failed to compare runs', e);
    alert('Comparison failed: ' + e.message);
  }
}

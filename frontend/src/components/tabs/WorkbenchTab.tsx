import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Download,
  Code2,
  Layers,
  ArrowRight,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Zap,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  TestExecutionResult,
  ConformanceStatusType,
  ValidationStageType,
  IssueSeverityType,
} from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { Tooltip } from '../Tooltip';

interface WorkbenchTabProps {
  initialSourceVendor?: string;
  initialTargetVendor?: string;
  autoRun?: boolean;
}

type DataInputMode = 'generate' | 'upload' | 'paste';

const VENDORS = [
  { id: 'alpha-hes', name: 'Alpha HES', format: 'DLMS/COSEM', type: 'HES', desc: 'IS 15959 OBIS JSON format' },
  { id: 'beta-hes', name: 'Beta HES', format: 'CSV', type: 'HES', desc: 'Columnar telemetry format' },
  { id: 'gamma-mdms', name: 'Gamma MDMS', format: 'CIM JSON', type: 'MDMS', desc: 'IEC 61968-9 standard' },
  { id: 'delta-legacy', name: 'Delta HES', format: 'Legacy JSON', type: 'HES', desc: 'Epoch milliseconds format' },
];

const TARGET_OPTIONS = [
  { id: 'none', name: 'Validate Only', desc: 'No output format, just validate' },
  { id: 'gamma-mdms', name: 'Gamma MDMS', desc: 'IEC 61968-9 CIM JSON' },
  { id: 'alpha-hes', name: 'Alpha HES', desc: 'DLMS/COSEM JSON' },
  { id: 'beta-hes', name: 'Beta HES', desc: 'CSV format' },
  { id: 'delta-legacy', name: 'Delta HES', desc: 'Legacy format' },
];

export const WorkbenchTab: React.FC<WorkbenchTabProps> = ({
  initialSourceVendor = 'alpha-hes',
  initialTargetVendor = 'gamma-mdms',
  autoRun = false,
}) => {
  const { toast, success, error } = useToast();

  const [sourceVendor, setSourceVendor] = useState<string>(initialSourceVendor);
  const [targetVendor, setTargetVendor] = useState<string>(initialTargetVendor);
  const [dataMode, setDataMode] = useState<DataInputMode>('generate');
  const [payloadText, setPayloadText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Generator params
  const [meterCount, setMeterCount] = useState<number>(3);
  const [intervals, setIntervals] = useState<number>(4);
  const [injectAnomalies, setInjectAnomalies] = useState<boolean>(false);
  const [injectTampers, setInjectTampers] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [generated, setGenerated] = useState<boolean>(false);

  // Execution
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<TestExecutionResult | null>(null);

  // Results tabs
  const [activeResultTab, setActiveResultTab] = useState<'issues' | 'anomaly' | 'canonical' | 'target' | 'raw'>('issues');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IssueSeverityType>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | ValidationStageType>('ALL');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!payloadText && !uploadedFile) {
      handleGenerateSynthetic(initialSourceVendor);
    }
  }, []);

  useEffect(() => {
    if (autoRun && payloadText) {
      handleExecute();
    }
  }, [autoRun, payloadText]);

  const handleGenerateSynthetic = async (vendorId: string = sourceVendor, overrideAnomalies?: boolean) => {
    setGenerating(true);
    setGenerated(false);
    try {
      const parsedSeed = seed.trim() ? parseInt(seed.trim(), 10) : undefined;
      const res = await api.generateSynthetic({
        vendorId,
        meterCount,
        intervals,
        injectAnomalies: overrideAnomalies ?? injectAnomalies,
        injectTampers,
        seed: isNaN(parsedSeed as any) ? undefined : parsedSeed,
      });
      const formatted = typeof res.payload === 'string' ? res.payload : JSON.stringify(res.payload, null, 2);
      setPayloadText(formatted);
      setUploadedFile(null);
      setGenerated(true);
      success('Data Generated', `${meterCount} meter${meterCount > 1 ? 's' : ''} · ${intervals} intervals each`);
    } catch (e: any) {
      error('Generation Failed', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!uploadedFile && !payloadText.trim()) {
      error('No Data', 'Please generate, upload, or paste meter data first.');
      return;
    }
    setExecuting(true);
    const formData = new FormData();
    formData.append('source_vendor', sourceVendor);
    formData.append('target_vendor', targetVendor);
    if (uploadedFile) {
      formData.append('file', uploadedFile);
    } else {
      formData.append('raw_payload', payloadText);
    }
    try {
      const res = await api.executeWorkbench(formData);
      setResult(res);
      success('Test Complete', `Result: ${res.conformance.status} — Run ID #${res.run_id.split('-')[0].toUpperCase()}`);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (e: any) {
      error('Test Failed', e.message);
    } finally {
      setExecuting(false);
    }
  };

  const formatPayload = () => {
    try {
      setPayloadText(JSON.stringify(JSON.parse(payloadText), null, 2));
      success('Formatted', 'JSON prettified.');
    } catch {
      toast('info', 'Not JSON', 'Payload is not valid JSON.');
    }
  };

  const getStatusBadge = (status: ConformanceStatusType, large = false) => {
    const base = large ? 'px-4 py-2 rounded-xl text-sm font-extrabold' : 'px-2.5 py-1 rounded-lg text-xs font-bold';
    switch (status) {
      case 'PASS':
        return <span className={`inline-flex items-center gap-2 ${base} bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30`}><CheckCircle2 className={large ? 'w-5 h-5' : 'w-4 h-4'} />Test Passed ✓</span>;
      case 'CONDITIONAL':
        return <span className={`inline-flex items-center gap-2 ${base} bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30`}><AlertTriangle className={large ? 'w-5 h-5' : 'w-4 h-4'} />Conditional Pass</span>;
      case 'FAIL':
        return <span className={`inline-flex items-center gap-2 ${base} bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30`}><XCircle className={large ? 'w-5 h-5' : 'w-4 h-4'} />Test Failed</span>;
      default:
        return <span className={`inline-flex items-center gap-2 ${base} bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700`}><HelpCircle className={large ? 'w-5 h-5' : 'w-4 h-4'} />Incomplete</span>;
    }
  };

  const filteredIssues = result?.issues.filter((iss) => {
    if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
    if (stageFilter !== 'ALL' && iss.stage !== stageFilter) return false;
    return true;
  });

  const sourceInfo = VENDORS.find(v => v.id === sourceVendor);
  const targetInfo = TARGET_OPTIONS.find(v => v.id === targetVendor);

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Run a Validation Test</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose your vendor systems, prepare meter data, then run validation.
          </p>
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 shrink-0 mt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">1</span>
            Choose Vendors
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">2</span>
            Prepare Data
          </span>
          <span className="text-slate-300 dark:text-slate-600">—</span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] flex items-center justify-center font-bold">3</span>
            Results
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT — Step 1: Vendor Selection + Step 2: Data */}
        <div className="lg:col-span-5 space-y-4">

          {/* Step 1 — Vendor Selection */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold shrink-0">1</span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Choose Vendor Systems</h3>
              <Tooltip content="The source is where your meter data comes from. The target is where it needs to go." position="right">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              </Tooltip>
            </div>

            {/* Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Source — Where is the data from?
              </label>
              <select
                value={sourceVendor}
                onChange={(e) => {
                  const v = e.target.value;
                  setSourceVendor(v);
                  setResult(null);
                  handleGenerateSynthetic(v);
                }}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-emerald-500 transition cursor-pointer"
              >
                {VENDORS.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.format}</option>
                ))}
              </select>
              {sourceInfo && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 ml-1">{sourceInfo.desc}</p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ArrowRight className="w-3.5 h-3.5" />
                converts to
              </div>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Target */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Target — Where should it go?
              </label>
              <select
                value={targetVendor}
                onChange={(e) => { setTargetVendor(e.target.value); setResult(null); }}
                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-emerald-500 transition cursor-pointer"
              >
                {TARGET_OPTIONS.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              {targetInfo && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 ml-1">{targetInfo.desc}</p>
              )}
            </div>
          </div>

          {/* Step 2 — Data Input */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center font-bold shrink-0">2</span>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Prepare Meter Data</h3>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800/60 p-1 gap-1">
              {([
                { key: 'generate' as const, label: '✨ Generate', tip: 'Create synthetic meter data automatically' },
                { key: 'upload' as const, label: '↑ Upload', tip: 'Upload a JSON or CSV file from your device' },
                { key: 'paste' as const, label: '</> Paste', tip: 'Paste raw data directly' },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDataMode(tab.key)}
                  title={tab.tip}
                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                    dataMode === tab.key
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Generate Mode */}
            {dataMode === 'generate' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      How many meters?
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={meterCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) setMeterCount(1);
                        else setMeterCount(Math.min(100, Math.max(1, val)));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-0.5">1 to 100 meters</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Readings per meter
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={96}
                      value={intervals}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) setIntervals(1);
                        else setIntervals(Math.min(96, Math.max(1, val)));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 ml-0.5">1 to 96 readings</p>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox" checked={injectAnomalies}
                      onChange={(e) => setInjectAnomalies(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Include edge cases</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">Negative kWh, voltage spikes</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                    <input
                      type="checkbox" checked={injectTampers}
                      onChange={(e) => setInjectTampers(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Simulate tamper events</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">Cover open, magnet alarm events</div>
                    </div>
                  </label>
                </div>

                {/* Advanced (seed) */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  >
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Advanced options
                  </button>
                  {showAdvanced && (
                    <div className="mt-2">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                        Reproducibility Seed (optional)
                      </label>
                      <input
                        type="text" placeholder="e.g. 42 — same seed = same data"
                        value={seed} onChange={(e) => setSeed(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleGenerateSynthetic()}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-amber-500 ${generating ? 'animate-spin' : ''}`} />
                  {generating ? 'Generating…' : generated ? 'Regenerate Data' : 'Generate Sample Data'}
                </button>

                {generated && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Data ready — {meterCount} meter{meterCount > 1 ? 's' : ''} generated
                  </div>
                )}
              </div>
            )}

            {/* Upload Mode */}
            {dataMode === 'upload' && (
              <div>
                <input
                  ref={fileInputRef} type="file" className="hidden"
                  accept=".json,.csv,.txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const file = e.target.files[0];
                      setUploadedFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) setPayloadText(ev.target.result as string);
                      };
                      reader.readAsText(file);
                      success('File Loaded', file.name);
                    }
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
                >
                  <Upload className="w-8 h-8 opacity-50" />
                  <div className="text-center">
                    <p className="text-sm font-semibold">Click to upload a file</p>
                    <p className="text-xs mt-0.5">Supports .json, .csv, .txt</p>
                  </div>
                </button>
                {uploadedFile && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    {uploadedFile.name}
                  </div>
                )}
              </div>
            )}

            {/* Paste Mode */}
            {dataMode === 'paste' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">{payloadText.length} chars · {payloadText.split('\n').length} lines</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={formatPayload} className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer">Format JSON</button>
                    <button onClick={() => setPayloadText('')} className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 transition cursor-pointer">Clear</button>
                  </div>
                </div>
                <textarea
                  value={payloadText}
                  onChange={(e) => { setPayloadText(e.target.value); setUploadedFile(null); }}
                  placeholder="Paste JSON or CSV meter data here…"
                  className="w-full h-52 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-900 dark:text-slate-200 font-mono resize-y focus:border-emerald-500 leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Data Preview + Run Button */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="card p-5 flex flex-col flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Data Preview</h3>
                {payloadText && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    {payloadText.length.toLocaleString()} chars
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={formatPayload}
                  disabled={!payloadText}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-40"
                >
                  Format
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(payloadText); success('Copied', 'Data copied to clipboard'); }}
                  disabled={!payloadText}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-40"
                >
                  <Copy className="w-3 h-3" />Copy
                </button>
              </div>
            </div>

            <textarea
              value={payloadText}
              onChange={(e) => { setPayloadText(e.target.value); setUploadedFile(null); setDataMode('paste'); }}
              placeholder="Your meter data will appear here. Use the panel on the left to generate or upload data."
              className="flex-1 min-h-[320px] w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-900 dark:text-slate-200 font-mono resize-y focus:border-emerald-500 leading-relaxed placeholder:text-slate-300 dark:placeholder:text-slate-600 transition"
              spellCheck={false}
            />

            {/* Run Button */}
            <div className="pt-2">
              <button
                onClick={handleExecute}
                disabled={executing || (!payloadText.trim() && !uploadedFile)}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/50 dark:disabled:bg-emerald-900/30 text-white shadow-lg shadow-emerald-600/20 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className={`w-4 h-4 fill-current ${executing ? 'animate-spin' : ''}`} />
                {executing ? 'Running Validation…' : 'Run Validation Test'}
              </button>
              {!payloadText.trim() && !uploadedFile && (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  ← Generate or upload data to enable the run button
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      
        {result && (
          <div
            ref={resultsRef}
            className="space-y-4 pt-2 fade-in"
          >
            {/* Result Banner */}
            <div className="card p-5 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-700/60">
                <div className="space-y-2">
                  {getStatusBadge(result.conformance.status, true)}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                    {result.conformance.summary}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {result.source_vendor} → {result.target_vendor || 'Canonical'} · completed in{' '}
                    <strong className="text-slate-700 dark:text-slate-200">{result.duration_ms}ms</strong>
                    {' '}·{' '}
                    <span className="font-mono text-slate-500 dark:text-slate-400">
                      Run #{result.run_id.split('-')[0].toUpperCase()}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(result.run_id); success('Copied', 'Run ID copied'); }}
                      className="ml-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      <Copy className="w-3 h-3 inline" />
                    </button>
                  </p>
                </div>

                {/* Metric badges */}
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  {[
                    { label: 'Checks Run', value: result.conformance.total_assertions, color: 'slate' },
                    { label: 'Errors', value: result.conformance.mandatory_failure_count, color: result.conformance.mandatory_failure_count > 0 ? 'rose' : 'slate' },
                    { label: 'Warnings', value: result.conformance.warning_count, color: result.conformance.warning_count > 0 ? 'amber' : 'slate' },
                  ].map((m) => (
                    <div key={m.label} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{m.label}</div>
                      <div className={`text-xl font-extrabold mt-1 ${
                        m.color === 'rose' ? 'text-rose-600 dark:text-rose-400' :
                        m.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                        'text-slate-900 dark:text-white'
                      }`}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Stages */}
              <div className="pt-5">
                <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-emerald-500" />
                  Where did issues occur?
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'SOURCE', label: 'Source Parser', sub: 'Format & syntax' },
                    { key: 'ADAPTER', label: 'Field Adapter', sub: 'Unit conversion' },
                    { key: 'CANONICAL', label: 'Standard Model', sub: 'IEC 61968-9 rules' },
                    { key: 'TARGET', label: 'Target Output', sub: 'Serialization' },
                  ].map((stg) => {
                    const blame = result.blame_attribution[stg.key] || { error_count: 0, warning_count: 0 };
                    const hasErr = blame.error_count > 0;
                    const hasWarn = blame.warning_count > 0;
                    const isClean = !hasErr && !hasWarn;
                    return (
                      <button
                        key={stg.key}
                        onClick={() => { setActiveResultTab('issues'); setStageFilter(stg.key as any); }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                          stageFilter === stg.key
                            ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50 dark:bg-emerald-500/10'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{stg.label}</span>
                          <span className={`w-2 h-2 rounded-full ${isClean ? 'bg-emerald-500' : hasErr ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{stg.sub}</div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono">
                          <span className={hasErr ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}>
                            {blame.error_count} err
                          </span>
                          <span className={hasWarn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                            {blame.warning_count} warn
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Result Tabs */}
            <div className="card overflow-hidden">
              <div className="flex items-center gap-0 border-b border-slate-100 dark:border-slate-700/60 overflow-x-auto">
                {[
                  { key: 'issues' as const, label: 'Issues', count: result.issues.length },
                  { key: 'anomaly' as const, label: 'Anomalies', count: result.anomaly_detection.has_anomalies ? result.anomaly_detection.anomaly_count : null },
                  { key: 'canonical' as const, label: 'Standard Output', count: null },
                  { key: 'target' as const, label: `Target (${result.target_vendor || 'None'})`, count: null },
                  { key: 'raw' as const, label: 'Raw Input', count: null },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveResultTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                      activeResultTab === tab.key
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                        tab.key === 'anomaly' && tab.count
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* Issues Tab */}
                {activeResultTab === 'issues' && (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/40 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Severity:</span>
                        {(['ALL', 'ERROR', 'WARNING'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setSeverityFilter(s)}
                            className={`px-2 py-0.5 rounded cursor-pointer transition ${
                              severityFilter === s
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            {s === 'ALL' ? 'All' : s === 'ERROR' ? '🔴 Error' : '🟡 Warning'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Stage:</span>
                        {(['ALL', 'SOURCE', 'ADAPTER', 'CANONICAL', 'TARGET', 'ANOMALY'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStageFilter(s as any)}
                            className={`px-2 py-0.5 rounded font-mono cursor-pointer transition ${
                              stageFilter === s
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          >
                            {s === 'ALL' ? 'All' : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredIssues && filteredIssues.length > 0 ? (
                      <div className="space-y-3">
                        {filteredIssues.map((iss, idx) => {
                          const isErr = iss.severity === 'ERROR';
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border space-y-2 ${
                                isErr
                                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30'
                                  : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                                    isErr
                                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/30'
                                      : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-400/30'
                                  }`}>
                                    {iss.severity}
                                  </span>
                                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{iss.code}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    {iss.stage}
                                  </span>
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  Field: <strong className="text-slate-700 dark:text-slate-200">{iss.field}</strong>
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{iss.message}</p>
                              {iss.suggested_fix && (
                                <div className="p-3 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                    <Zap className="w-3 h-3" />
                                    Suggested fix:
                                  </div>
                                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{iss.suggested_fix}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700/40">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">All checks passed!</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No issues found for the current filters.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Anomaly Tab */}
                {activeResultTab === 'anomaly' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          Anomaly Detection (ML)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Isolation Forest algorithm with Z-score fallback.
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {(result.anomaly_detection.anomaly_rate * 100).toFixed(1)}% anomaly rate
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {result.anomaly_detection.anomaly_count} of {result.anomaly_detection.total_readings} readings
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Reading Heatmap</h5>
                      <div className="flex flex-wrap gap-1.5 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/40">
                        {result.canonical_payload.readings.map((r, i) => (
                          <div
                            key={i}
                            title={`Reading #${i + 1} · Meter: ${r.meter_serial_number} · Anomaly: ${r.is_anomaly ? 'YES' : 'no'}`}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono cursor-pointer border transition-transform hover:scale-110 ${
                              r.is_anomaly
                                ? 'bg-amber-500/20 border-amber-500/60 text-amber-700 dark:text-amber-300'
                                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {r.is_anomaly ? '⚠' : i + 1}
                          </div>
                        ))}
                      </div>
                    </div>

                    {result.anomaly_detection.flagged_readings.length > 0 && (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {result.anomaly_detection.flagged_readings.map((a, i) => (
                          <div key={i} className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 font-mono font-bold text-amber-700 dark:text-amber-400">
                                Reading #{a.reading_index} · {a.meter_serial_number}
                                <span className="text-[10px] text-slate-500 font-normal">{a.method}</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 mt-0.5">{a.description}</p>
                            </div>
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 shrink-0">
                              Score: {a.anomaly_score.toFixed(3)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Canonical Tab */}
                {activeResultTab === 'canonical' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">IEC 61968-9 Normalized Output</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(JSON.stringify(result.canonical_payload, null, 2)); success('Copied', 'Canonical payload copied'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy JSON
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px] leading-relaxed">
                      {JSON.stringify(result.canonical_payload, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Target Tab */}
                {activeResultTab === 'target' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Target format: {result.target_vendor || 'None selected'}
                      </span>
                      {result.target_output && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              const text = typeof result.target_output === 'string' ? result.target_output : JSON.stringify(result.target_output, null, 2);
                              navigator.clipboard.writeText(text);
                              success('Copied', 'Target output copied');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                          <button
                            onClick={() => {
                              const text = typeof result.target_output === 'string' ? result.target_output : JSON.stringify(result.target_output, null, 2);
                              const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = `vidyutsetu_${result.run_id}_target.txt`; a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      )}
                    </div>
                    <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[460px] leading-relaxed">
                      {result.target_output
                        ? typeof result.target_output === 'string'
                          ? result.target_output
                          : JSON.stringify(result.target_output, null, 2)
                        : '// No target adapter chosen — Validation Only mode'}
                    </pre>
                  </div>
                )}

                {/* Raw Tab */}
                {activeResultTab === 'raw' && (
                  <div className="space-y-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Original ingested payload</span>
                    <pre className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed">
                      {payloadText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
};

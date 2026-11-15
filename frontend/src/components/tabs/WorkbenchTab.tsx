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
} from 'lucide-react';
import { api } from '../../services/api';
import {
  TestExecutionResult,
  ConformanceStatusType,
  ValidationStageType,
  IssueSeverityType,
} from '../../types/api';
import { useToast } from '../../context/ToastContext';

interface WorkbenchTabProps {
  initialSourceVendor?: string;
  initialTargetVendor?: string;
  autoRun?: boolean;
}

export const WorkbenchTab: React.FC<WorkbenchTabProps> = ({
  initialSourceVendor = 'alpha-hes',
  initialTargetVendor = 'gamma-mdms',
  autoRun = false,
}) => {
  const { toast, success, error } = useToast();

  const [sourceVendor, setSourceVendor] = useState<string>(initialSourceVendor);
  const [targetVendor, setTargetVendor] = useState<string>(initialTargetVendor);
  const [payloadText, setPayloadText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Generator parameters
  const [showGenPanel, setShowGenPanel] = useState<boolean>(true);
  const [meterCount, setMeterCount] = useState<number>(3);
  const [intervals, setIntervals] = useState<number>(4);
  const [injectAnomalies, setInjectAnomalies] = useState<boolean>(false);
  const [injectTampers, setInjectTampers] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  // Execution states
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<TestExecutionResult | null>(null);

  // Results display tab
  const [activeResultTab, setActiveResultTab] = useState<
    'issues' | 'anomaly' | 'canonical' | 'target' | 'raw'
  >('issues');

  // Issue filters
  const [severityFilter, setSeverityFilter] = useState<'ALL' | IssueSeverityType>('ALL');
  const [stageFilter, setStageFilter] = useState<'ALL' | ValidationStageType>('ALL');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load sample or synthetic on mount if empty
  useEffect(() => {
    if (!payloadText && !uploadedFile) {
      handleGenerateSynthetic(initialSourceVendor);
    }
  }, []);

  const handleGenerateSynthetic = async (
    targetVendorId: string = sourceVendor,
    overrideAnomalies?: boolean
  ) => {
    setGenerating(true);
    try {
      const parsedSeed = seed.trim() ? parseInt(seed.trim(), 10) : undefined;
      const res = await api.generateSynthetic({
        vendorId: targetVendorId,
        meterCount,
        intervals,
        injectAnomalies: overrideAnomalies ?? injectAnomalies,
        injectTampers,
        seed: isNaN(parsedSeed as any) ? undefined : parsedSeed,
      });

      const formatted =
        typeof res.payload === 'string'
          ? res.payload
          : JSON.stringify(res.payload, null, 2);

      setPayloadText(formatted);
      setUploadedFile(null);
      success('Synthetic Data Generated', `${targetVendorId} scenario created successfully.`);
    } catch (e: any) {
      error('Generation Failed', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!uploadedFile && !payloadText.trim()) {
      error('Missing Input', 'Please provide raw payload text or upload a file.');
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
      success(
        'Test Executed Successfully',
        `Run ID ${res.run_id} evaluated with ${res.conformance.status} status.`
      );
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e: any) {
      error('Execution Error', e.message);
    } finally {
      setExecuting(false);
    }
  };

  const formatPayload = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setPayloadText(JSON.stringify(parsed, null, 2));
      success('Formatted', 'JSON payload formatted.');
    } catch {
      toast('info', 'Not JSON', 'Payload is not JSON or is malformed.');
    }
  };

  const getStatusBadge = (status: ConformanceStatusType) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
            PASS
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4" />
            CONDITIONAL
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-4 h-4" />
            FAIL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-extrabold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <HelpCircle className="w-4 h-4" />
            INCOMPLETE
          </span>
        );
    }
  };

  const filteredIssues = result?.issues.filter((iss) => {
    if (severityFilter !== 'ALL' && iss.severity !== severityFilter) return false;
    if (stageFilter !== 'ALL' && iss.stage !== stageFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Workbench Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Interoperability Testing Workbench</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Contract & Conformance Engine
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Validate physical grid plausibility, OBIS register conformance, and auto-remediate transformation anomalies.
          </p>
        </div>
      </div>

      {/* Main Testing Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Vendor Format Selectors */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>1. System Adapters Selection</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Source Vendor System (Ingestion)
                </label>
                <select
                  value={sourceVendor}
                  onChange={(e) => {
                    const newSource = e.target.value;
                    setSourceVendor(newSource);
                    handleGenerateSynthetic(newSource);
                  }}
                  className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="alpha-hes">Alpha HES (DLMS/COSEM JSON - IS 15959)</option>
                  <option value="beta-hes">Beta HES (Columnar CSV Format)</option>
                  <option value="gamma-mdms">Gamma MDMS (IEC 61968-9 CIM JSON)</option>
                  <option value="delta-legacy">Delta HES (Legacy Epoch Milliseconds JSON)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Target Destination System (Serialization)
                </label>
                <select
                  value={targetVendor}
                  onChange={(e) => setTargetVendor(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="none">None (Canonical Validation Only)</option>
                  <option value="gamma-mdms">Gamma MDMS (IEC 61968-9 CIM JSON)</option>
                  <option value="alpha-hes">Alpha HES (DLMS/COSEM JSON)</option>
                  <option value="beta-hes">Beta HES (CSV Format)</option>
                  <option value="delta-legacy">Delta HES (Legacy Format)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Synthetic Data Generator Panel */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>2. Synthetic Test Scenario Generator</span>
              </h2>
              <button
                onClick={() => setShowGenPanel(!showGenPanel)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                {showGenPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showGenPanel && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Meters Count</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={meterCount}
                      onChange={(e) => setMeterCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Intervals / Meter</label>
                    <input
                      type="number"
                      min={1}
                      max={48}
                      value={intervals}
                      onChange={(e) => setIntervals(parseInt(e.target.value) || 1)}
                      className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={injectAnomalies}
                      onChange={(e) => setInjectAnomalies(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Inject Grid Physical Faults (Negative kWh, Voltage OOB)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={injectTampers}
                      onChange={(e) => setInjectTampers(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>Inject Tamper Events (Cover Open, Magnet Alarm)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    RNG Reproducibility Seed (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 42"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder:text-slate-600"
                  />
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateSynthetic()}
                    disabled={generating}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${generating ? 'animate-spin' : ''}`} />
                    <span>Generate Scenario</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Editor & Action Panel */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3. Telemetry Payload Buffer
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={formatPayload}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Format JSON"
                >
                  Format
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(payloadText);
                    success('Copied', 'Payload copied to clipboard');
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => setPayloadText('')}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* File Drag & Drop Bar */}
            <div className="my-3 flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".json,.csv,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-700/80 text-slate-300 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Upload Sample File (.json, .csv)</span>
              </button>
              {uploadedFile && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {uploadedFile.name}
                </span>
              )}
            </div>

            {/* Code / Text Area */}
            <div className="relative flex-1 min-h-[320px]">
              <textarea
                value={payloadText}
                onChange={(e) => {
                  setPayloadText(e.target.value);
                  setUploadedFile(null);
                }}
                placeholder="Paste JSON or CSV AMI message payload here, or generate above..."
                className="w-full h-full min-h-[320px] bg-[#0B0F17] border border-slate-800 rounded-lg p-3.5 text-xs text-slate-200 font-mono resize-y focus:outline-none focus:border-emerald-500/80 leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Execute Button */}
            <div className="pt-4 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">
                {payloadText.length} characters · {payloadText.split('\n').length} lines
              </span>
              <button
                onClick={handleExecute}
                disabled={executing || (!payloadText.trim() && !uploadedFile)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className={`w-4 h-4 fill-current ${executing ? 'animate-spin' : ''}`} />
                <span>
                  {executing
                    ? 'Executing Conformance Pipeline...'
                    : 'Execute Interoperability Validation & Transformation'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Results Section */}
      {result && (
        <div ref={resultsRef} className="space-y-6 pt-4 fade-in">
          {/* Hero Result Banner */}
          <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {getStatusBadge(result.conformance.status)}
                  <span className="text-xs text-slate-400 font-mono">
                    Run ID:{' '}
                    <strong className="text-slate-200">{result.run_id}</strong>
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.run_id);
                      success('Copied', 'Run ID copied');
                    }}
                    className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {result.conformance.summary}
                </h2>
                <p className="text-xs text-slate-400">
                  Transformed {result.source_vendor} → {result.target_vendor || 'Canonical'}{' '}
                  in <strong className="text-slate-200">{result.duration_ms} ms</strong>.
                </p>
              </div>

              {/* Score / Metrics Badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Assertions Checked</div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {result.conformance.total_assertions}
                  </div>
                </div>
                <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-rose-400 font-medium">Mandatory Fails</div>
                  <div className="text-xl font-extrabold text-rose-400 mt-1">
                    {result.conformance.mandatory_failure_count}
                  </div>
                </div>
                <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-amber-400 font-medium">Warnings</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1">
                    {result.conformance.warning_count}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage Blame Attribution Pipeline Visualization */}
            <div className="pt-6">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Blame Attribution Flow (Pipeline Diagnostics)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'SOURCE', label: 'Stage A: Source Schema', sub: 'Parser & Syntax' },
                  { key: 'ADAPTER', label: 'Stage B: Adapter Mapping', sub: 'Field Multipliers' },
                  { key: 'CANONICAL', label: 'Stage C: Canonical Model', sub: 'IEC 61968-9 Plausibility' },
                  { key: 'TARGET', label: 'Stage D: Target Serializer', sub: 'Target Format Schema' },
                ].map((stg) => {
                  const blame = result.blame_attribution[stg.key] || {
                    error_count: 0,
                    warning_count: 0,
                  };
                  const hasErr = blame.error_count > 0;
                  const hasWarn = blame.warning_count > 0;
                  const isClean = !hasErr && !hasWarn;

                  return (
                    <button
                      key={stg.key}
                      onClick={() => {
                        setActiveResultTab('issues');
                        setStageFilter(stg.key as any);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        stageFilter === stg.key
                          ? 'ring-2 ring-emerald-500 border-transparent bg-slate-800/80'
                          : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200">
                          {stg.label}
                        </span>
                        {isClean ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        ) : hasErr ? (
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{stg.sub}</div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            hasErr ? 'bg-rose-500/10 text-rose-400' : 'text-slate-500'
                          }`}
                        >
                          {blame.error_count} Err
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            hasWarn ? 'bg-amber-500/10 text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {blame.warning_count} Warn
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Navigation Bar */}
          <div className="flex items-center gap-1 border-b border-slate-800 bg-[#111827] px-4 rounded-t-xl overflow-x-auto">
            <button
              onClick={() => setActiveResultTab('issues')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeResultTab === 'issues'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Diagnostic Issues</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                {result.issues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveResultTab('anomaly')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeResultTab === 'anomaly'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>ML Anomaly Heatmap (Stage E)</span>
              {result.anomaly_detection.has_anomalies && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300">
                  {result.anomaly_detection.anomaly_count}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveResultTab('canonical')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeResultTab === 'canonical'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Canonical Payload (IEC 61968-9)</span>
            </button>

            <button
              onClick={() => setActiveResultTab('target')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeResultTab === 'target'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Target Output ({result.target_vendor || 'None'})</span>
            </button>

            <button
              onClick={() => setActiveResultTab('raw')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeResultTab === 'raw'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Raw Input</span>
            </button>
          </div>

          {/* Result Content Body */}
          <div className="bg-[#111827] border border-t-0 border-slate-800 rounded-b-xl p-6 shadow-sm">
            {/* TAB: ISSUES & AUTO-REMEDIATION */}
            {activeResultTab === 'issues' && (
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-xs">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400 font-medium">Filter Severity:</span>
                    {(['ALL', 'ERROR', 'WARNING'] as const).map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setSeverityFilter(sev)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                          severityFilter === sev
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Stage:</span>
                    {(['ALL', 'SOURCE', 'ADAPTER', 'CANONICAL', 'TARGET', 'ANOMALY'] as const).map(
                      (stg) => (
                        <button
                          key={stg}
                          onClick={() => setStageFilter(stg as any)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition ${
                            stageFilter === stg
                              ? 'bg-slate-800 text-white'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {stg}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Issues List */}
                {filteredIssues && filteredIssues.length > 0 ? (
                  <div className="space-y-3">
                    {filteredIssues.map((iss, idx) => {
                      const isErr = iss.severity === 'ERROR';
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border space-y-2.5 transition ${
                            isErr
                              ? 'bg-rose-950/20 border-rose-900/40 text-slate-200'
                              : 'bg-amber-950/20 border-amber-900/40 text-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase font-mono ${
                                  isErr
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {iss.severity}
                              </span>
                              <span className="font-mono text-xs font-bold text-white">
                                {iss.code}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                {iss.stage}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              Field: <strong className="text-slate-200">{iss.field}</strong>
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed">{iss.message}</p>

                          {iss.suggested_fix && (
                            <div className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800/80 text-xs">
                              <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5" />
                                <span>Suggested Auto-Remediation:</span>
                              </div>
                              <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                                {iss.suggested_fix}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-[#0B0F17] rounded-xl border border-slate-800 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <span className="font-semibold text-white">Zero Conformance Violations</span>
                    <p className="text-slate-400 mt-1">
                      All criteria passed according to IEC 61968-9 and IS 15959 specs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ML ANOMALY HEATMAP */}
            {activeResultTab === 'anomaly' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#0B0F17] p-4 rounded-xl border border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Stage E: Machine Learning Telemetry Anomaly Detection</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Isolation Forest algorithm with automated fallback to multi-feature Z-score detection.
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono">
                      Anomaly Rate:{' '}
                      <strong className="text-amber-400">
                        {(result.anomaly_detection.anomaly_rate * 100).toFixed(1)}%
                      </strong>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {result.anomaly_detection.anomaly_count} of{' '}
                      {result.anomaly_detection.total_readings} readings flagged
                    </div>
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Reading Cells Heatmap:</h4>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-[#0B0F17] rounded-xl border border-slate-800">
                    {result.canonical_payload.readings.map((r, i) => {
                      const isAnom = r.is_anomaly;
                      const score = r.anomaly_score ?? 0;
                      return (
                        <div
                          key={i}
                          title={`Reading #${i}\nMeter: ${r.meter_serial_number}\nTimestamp: ${r.timestamp}\nAnomaly Score: ${score.toFixed(3)}\nIs Anomaly: ${isAnom ? 'YES' : 'NO'}`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-mono cursor-pointer border transition-transform hover:scale-110 ${
                            isAnom
                              ? 'bg-amber-500/25 border-amber-500/60 text-amber-300 shadow-sm shadow-amber-500/20'
                              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                          }`}
                        >
                          {isAnom ? '⚠' : i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40" />
                      <span>Normal Telemetry Reading</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60" />
                      <span>Anomalous Reading (Spike / Inversion)</span>
                    </span>
                  </div>
                </div>

                {/* Flagged Readings Details */}
                {result.anomaly_detection.flagged_readings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2">Flagged Telemetry Anomalies:</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {result.anomaly_detection.flagged_readings.map((a, i) => (
                        <div
                          key={i}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-[#0B0F17] border border-amber-500/30 gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-bold font-mono">
                                Reading #{a.reading_index}
                              </span>
                              <span className="text-slate-400 font-mono">
                                Meter: {a.meter_serial_number}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                                Method: {a.method}
                              </span>
                            </div>
                            <p className="text-slate-300">{a.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-amber-400">
                              Score: {a.anomaly_score.toFixed(3)}
                            </span>
                            {a.contributing_features.length > 0 && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Features: {a.contributing_features.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CANONICAL PAYLOAD */}
            {activeResultTab === 'canonical' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    IEC 61968-9 Normalized Canonical Data Object
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(result.canonical_payload, null, 2)
                      );
                      success('Copied', 'Canonical payload copied');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Canonical JSON</span>
                  </button>
                </div>
                <pre className="p-4 bg-[#0B0F17] rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px] leading-relaxed">
                  {JSON.stringify(result.canonical_payload, null, 2)}
                </pre>
              </div>
            )}

            {/* TAB: TARGET SERIALIZATION OUTPUT */}
            {activeResultTab === 'target' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Serialized Format for Target System: {result.target_vendor || 'None'}
                  </span>
                  {result.target_output && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const text =
                            typeof result.target_output === 'string'
                              ? result.target_output
                              : JSON.stringify(result.target_output, null, 2);
                          navigator.clipboard.writeText(text);
                          success('Copied', 'Target output copied');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Output</span>
                      </button>
                      <button
                        onClick={() => {
                          const text =
                            typeof result.target_output === 'string'
                              ? result.target_output
                              : JSON.stringify(result.target_output, null, 2);
                          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `vidyutsetu_${result.run_id}_target.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B0F17] hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}
                </div>
                <pre className="p-4 bg-[#0B0F17] rounded-xl border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto max-h-[460px] leading-relaxed">
                  {result.target_output
                    ? typeof result.target_output === 'string'
                      ? result.target_output
                      : JSON.stringify(result.target_output, null, 2)
                    : '// No target adapter chosen (Validation Only)'}
                </pre>
              </div>
            )}

            {/* TAB: RAW INPUT */}
            {activeResultTab === 'raw' && (
              <div className="space-y-4">
                <span className="text-xs text-slate-400">Original Ingested Message Payload</span>
                <pre className="p-4 bg-[#0B0F17] rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-[460px] leading-relaxed">
                  {payloadText}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

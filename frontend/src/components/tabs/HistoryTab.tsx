import React, { useEffect, useState } from 'react';
import {
  History,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  ExternalLink,
  X,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  TestRunSummary,
  ConformanceStatusType,
  RegressionComparison,
} from '../../types/api';
import { useToast } from '../../context/ToastContext';

interface HistoryTabProps {
  initialAuditRunId?: string | null;
  onClearInitialAudit?: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  initialAuditRunId,
  onClearInitialAudit,
}) => {
  const { toast, success, error } = useToast();

  const [runs, setRuns] = useState<TestRunSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Detail Modal
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Comparator states
  const [baselineRunId, setBaselineRunId] = useState<string>('');
  const [candidateRunId, setCandidateRunId] = useState<string>('');
  const [comparing, setComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<RegressionComparison | null>(null);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getTestRuns(50);
      setRuns(data);
      if (data.length >= 2 && !baselineRunId && !candidateRunId) {
        setBaselineRunId(data[1].run_id);
        setCandidateRunId(data[0].run_id);
      }
    } catch (e: any) {
      toast('error', 'Failed to load test history', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (initialAuditRunId) {
      handleInspect(initialAuditRunId);
      if (onClearInitialAudit) onClearInitialAudit();
    }
  }, [initialAuditRunId]);

  const handleInspect = async (runId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await api.getTestRunDetail(runId);
      setSelectedRun(detail);
    } catch (e: any) {
      error('Failed to load run details', e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRunCompare = async () => {
    if (!baselineRunId.trim() || !candidateRunId.trim()) {
      error('Missing Run IDs', 'Enter both Baseline and Candidate Run IDs.');
      return;
    }
    setComparing(true);
    try {
      const cmp = await api.compareTestRuns(baselineRunId.trim(), candidateRunId.trim());
      setComparisonResult(cmp);
      success('Comparison Complete', 'Evaluated assertion deltas.');
    } catch (e: any) {
      error('Comparison Failed', e.message);
    } finally {
      setComparing(false);
    }
  };

  const getStatusBadge = (status: ConformanceStatusType) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            PASS
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            CONDITIONAL
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            FAIL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            INCOMPLETE
          </span>
        );
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (statusFilter !== 'ALL' && r.conformance_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.run_id.toLowerCase().includes(q) ||
        r.source_vendor.toLowerCase().includes(q) ||
        (r.target_vendor && r.target_vendor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Audit History & Regression Comparator</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Audit Logs & Diff
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical validation trace with assertion-level regression detection between test builds.
          </p>
        </div>
        <button
          onClick={loadRuns}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Runs</span>
        </button>
      </div>

      {/* Regression & Improvement Comparator Card */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Automated Regression / Improvement Comparator
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Compare any two test runs to verify bug fixes, identify newly introduced contract breaches, and track assertion progression.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Baseline Run ID (Reference)
            </label>
            <input
              type="text"
              placeholder="e.g. RUN-A1B2C3D4E5"
              value={baselineRunId}
              onChange={(e) => setBaselineRunId(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Candidate Run ID (Under Test)
            </label>
            <input
              type="text"
              placeholder="e.g. RUN-F6G7H8I9J0"
              value={candidateRunId}
              onChange={(e) => setCandidateRunId(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              onClick={handleRunCompare}
              disabled={comparing || !baselineRunId || !candidateRunId}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
            >
              <GitCompare className={`w-3.5 h-3.5 ${comparing ? 'animate-spin' : ''}`} />
              <span>Compare</span>
            </button>
          </div>
        </div>

        {/* Comparison Result Display */}
        {comparisonResult && (
          <div className="pt-4 border-t border-slate-800 space-y-4 fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F17] p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px]">Baseline</span>
                  <span className="font-mono text-white font-bold">
                    {comparisonResult.baseline.run_id}
                  </span>
                  <div className="mt-1">
                    {getStatusBadge(comparisonResult.baseline.conformance_status)}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />

                <div className="text-xs">
                  <span className="text-slate-500 block text-[10px]">Candidate</span>
                  <span className="font-mono text-white font-bold">
                    {comparisonResult.candidate.run_id}
                  </span>
                  <div className="mt-1">
                    {getStatusBadge(comparisonResult.candidate.conformance_status)}
                  </div>
                </div>
              </div>

              <div>
                {comparisonResult.regression_detected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <TrendingDown className="w-4 h-4" />
                    REGRESSION DETECTED
                  </span>
                ) : comparisonResult.improvement_detected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4" />
                    IMPROVEMENT DETECTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    NO STATUS DRIFT
                  </span>
                )}
              </div>
            </div>

            {/* Assertion Deltas 3-Column Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-400 block">
                  Resolved Issues ({comparisonResult.summary.resolved_count})
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {comparisonResult.resolved_issues.length > 0 ? (
                    comparisonResult.resolved_issues.map((iss, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded"
                      >
                        {iss.code} [{iss.field}]
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">None</span>
                  )}
                </div>
              </div>

              <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-rose-400 block">
                  New Issues ({comparisonResult.summary.new_count})
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {comparisonResult.new_issues.length > 0 ? (
                    comparisonResult.new_issues.map((iss, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-mono text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded"
                      >
                        {iss.code} [{iss.field}]
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">None</span>
                  )}
                </div>
              </div>

              <div className="bg-[#0B0F17] border border-slate-800 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-400 block">
                  Persistent Issues ({comparisonResult.summary.persistent_count})
                </span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {comparisonResult.persistent_issues.length > 0 ? (
                    comparisonResult.persistent_issues.map((iss, i) => (
                      <div
                        key={i}
                        className="text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded"
                      >
                        {iss.code} [{iss.field}]
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Log Table */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Recorded Validation Runs</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">
              Showing {filteredRuns.length} runs
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search run ID or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0B0F17] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0B0F17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASS">PASS Only</option>
              <option value="CONDITIONAL">CONDITIONAL</option>
              <option value="FAIL">FAIL Only</option>
              <option value="INCOMPLETE">INCOMPLETE</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F17]/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source System</th>
                <th className="py-3 px-4">Target System</th>
                <th className="py-3 px-4">Valid / Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRuns.length > 0 ? (
                filteredRuns.map((r) => (
                  <tr key={r.run_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span>{r.run_id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(r.run_id);
                            success('Copied', 'Run ID copied');
                          }}
                          className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {r.execution_time ? new Date(r.execution_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">{r.source_vendor}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {r.target_vendor || 'Validation'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {r.valid_records ?? r.total_records} / {r.total_records}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(r.conformance_status)}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{r.duration_ms} ms</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspect(r.run_id)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No matching runs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 bg-[#0B0F17]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden fade-in">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Run Audit Detail:</span>
                  <span className="font-mono text-emerald-400">{selectedRun.run_id}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Executed at {new Date(selectedRun.execution_time).toLocaleString()} · Duration:{' '}
                  {selectedRun.duration_ms} ms
                </p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F17] p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Source System</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {selectedRun.source_vendor}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Target System</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {selectedRun.target_vendor || 'Canonical Only'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Status</span>
                  <div className="mt-0.5">
                    {getStatusBadge(selectedRun.conformance?.status || 'UNKNOWN')}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Records</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {selectedRun.valid_records} / {selectedRun.total_records}
                  </span>
                </div>
              </div>

              {/* Diagnostic Issues in Modal */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">
                  Diagnostic Issues ({selectedRun.issues?.length || 0}):
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedRun.issues && selectedRun.issues.length > 0 ? (
                    selectedRun.issues.map((iss: any, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-[#0B0F17] border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-rose-400 font-bold">
                            [{iss.severity}] {iss.code}
                          </span>
                          <span className="font-mono text-slate-500">{iss.field}</span>
                        </div>
                        <p className="text-slate-300">{iss.message}</p>
                        {iss.suggested_fix && (
                          <div className="text-[11px] text-emerald-400 bg-emerald-950/20 p-2 rounded mt-1">
                            Fix: {iss.suggested_fix}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-emerald-400">Zero issues detected.</div>
                  )}
                </div>
              </div>

              {/* Raw Preview in Modal */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">Raw Payload Snapshot:</h4>
                <pre className="p-3 bg-[#0B0F17] rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-40 overflow-x-auto">
                  {selectedRun.raw_preview || '// None'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

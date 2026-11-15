import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Play,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { WorkbenchStats, ConformanceStatusType, TestRunSummary } from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { TabKey } from '../Header';

interface DashboardTabProps {
  onNavigate: (tab: TabKey, params?: any) => void;
  onAuditRun: (runId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate, onAuditRun }) => {
  const [stats, setStats] = useState<WorkbenchStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast, success } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e: any) {
      toast('error', 'Failed to fetch dashboard metrics', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: ConformanceStatusType) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            PASS
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            CONDITIONAL
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            FAIL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <HelpCircle className="w-3.5 h-3.5" />
            INCOMPLETE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Interoperability Overview</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Live Health
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time validation metrics across Indian Smart Meter rollouts and IEC 61968-9 standards compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
          <button
            onClick={() => onNavigate('workbench')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Test Workbench</span>
          </button>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Validations</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.total_test_runs ?? 0}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">runs recorded</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400">●</span> Automated regression auditing enabled
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Mean Conformance Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.average_interoperability_score ?? 0}%
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">benchmark score</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400">●</span> IS 15959 & IEC criteria
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Vendor Adapters</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats?.active_vendor_adapters ?? 4}
            </span>
            <span className="text-xs text-slate-500 ml-2 font-mono">registered formats</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Alpha DLMS, Beta CSV, Gamma CIM, Delta Legacy
          </p>
        </div>

        <div className="bg-[#111827] border border-slate-800/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Standard Scope</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">IEC 61968-9</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            + IS 15959 Parts 1-3 Companion
          </p>
        </div>
      </div>

      {/* Quick Launch & Workflows Bar */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" />
          <span>Quick Benchmark Scenarios</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('workbench', { sourceVendor: 'alpha-hes', targetVendor: 'gamma-mdms', autoRun: true })}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition text-left group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                Alpha DLMS → Gamma CIM
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                IS 15959 OBIS to IEC 61968-9 MeterReadings
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => onNavigate('workbench', { sourceVendor: 'beta-hes', targetVendor: 'canonical', autoRun: true })}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition text-left group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                Beta CSV → Canonical
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Columnar telemetry normalization & unit multiplier
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => onNavigate('workbench', { sourceVendor: 'alpha-hes', injectAnomalies: true, autoRun: true })}
            className="flex items-center justify-between p-3.5 rounded-lg bg-[#0B0F17] hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 transition text-left group cursor-pointer"
          >
            <div>
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                ML Anomaly Injection Test
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Simulate reverse energy spikes & voltage surges
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Recent Test Runs Audit Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Recent Interoperability Audits</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit history with stage-by-stage blame attribution.
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Audit Log</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B0F17]/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Source System</th>
                <th className="py-3 px-4">Target System</th>
                <th className="py-3 px-4">Records</th>
                <th className="py-3 px-4">Conformance Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {stats?.recent_runs && stats.recent_runs.length > 0 ? (
                stats.recent_runs.map((run: TestRunSummary) => (
                  <tr
                    key={run.run_id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span>{run.run_id}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(run.run_id);
                            success('Copied', `Run ID ${run.run_id} copied to clipboard`);
                          }}
                          className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                          title="Copy Run ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {run.execution_time
                        ? new Date(run.execution_time).toLocaleTimeString()
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      {run.source_vendor}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {run.target_vendor || 'Validation Only'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {run.total_records}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(run.conformance_status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onAuditRun(run.run_id)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-slate-500 text-xs"
                  >
                    No test runs logged yet. Launch a test from the Workbench tab!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

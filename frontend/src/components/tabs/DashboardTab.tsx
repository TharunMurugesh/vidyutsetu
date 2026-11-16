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
  X,
  Sparkles,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { WorkbenchStats, ConformanceStatusType, TestRunSummary } from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { TabKey } from '../Sidebar';
import { Tooltip } from '../Tooltip';

interface DashboardTabProps {
  onNavigate: (tab: TabKey, params?: any) => void;
  onAuditRun: (runId: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({ onNavigate, onAuditRun }) => {
  const [stats, setStats] = useState<WorkbenchStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState<boolean>(() => {
    return localStorage.getItem('vs-welcome-dismissed') === 'true';
  });
  const { toast, success } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e: any) {
      toast('error', 'Failed to fetch metrics', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    localStorage.setItem('vs-welcome-dismissed', 'true');
  };

  const getStatusBadge = (status: ConformanceStatusType) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Pass
          </span>
        );
      case 'CONDITIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> Conditional
          </span>
        );
      case 'FAIL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Fail
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <HelpCircle className="w-3 h-3" /> Incomplete
          </span>
        );
    }
  };

  const shortRunId = (id: string) => id.split('-')[0].toUpperCase();

  return (
    <div className="space-y-5 pb-10 fade-in">
      {/* Welcome Banner */}
      {!welcomeDismissed && (
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/60 dark:border-emerald-800/40 transition-all duration-300">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Welcome to VidyutSetu!
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                Get started by running a quick test — pick a scenario below, or go to{' '}
                <strong>Run a Test</strong> to upload your own meter data.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('workbench')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shrink-0 cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run your first test
          </button>
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Interoperability Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live metrics across Indian Smart Meter rollouts and IEC 61968-9 compliance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => onNavigate('workbench')}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run a Test
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Tests Run',
            tip: 'Total number of validation tests executed',
            value: stats?.total_test_runs ?? 0,
            unit: 'all time',
            sub: 'Automated regression auditing',
            icon: <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
            iconBg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Pass Rate',
            tip: 'Average conformance score across all test runs',
            value: `${stats?.average_interoperability_score ?? 0}%`,
            unit: 'benchmark',
            sub: 'IS 15959 & IEC criteria',
            icon: <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
            iconBg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Vendor Profiles',
            tip: 'Number of meter/MDMS vendor formats currently supported',
            value: stats?.active_vendor_adapters ?? 4,
            unit: 'formats',
            sub: 'Alpha, Beta, Gamma, Delta',
            icon: <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
            iconBg: 'bg-purple-500/10 border-purple-500/20',
          },
          {
            label: 'Standard',
            tip: 'The international standard this workbench validates against',
            value: 'IEC 61968-9',
            unit: '',
            sub: '+ IS 15959 Parts 1–3',
            icon: <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />,
            iconBg: 'bg-cyan-500/10 border-cyan-500/20',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="card p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <Tooltip content={card.tip}>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-help">
                  {card.label}
                  <HelpCircle className="w-3 h-3 opacity-50" />
                </span>
              </Tooltip>
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.iconBg}`}>
                {card.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{card.unit}</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 leading-tight">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Scenarios */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Quick Test Scenarios</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">— One click to run</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: 'Alpha → Gamma',
              sub: 'DLMS to CIM format conversion',
              color: 'emerald' as const,
              params: { sourceVendor: 'alpha-hes', targetVendor: 'gamma-mdms', autoRun: true },
            },
            {
              label: 'Beta → Standard',
              sub: 'Normalize CSV telemetry data',
              color: 'emerald' as const,
              params: { sourceVendor: 'beta-hes', targetVendor: 'canonical', autoRun: true },
            },
            {
              label: 'Anomaly Detection',
              sub: 'Simulate energy spikes & tampers',
              color: 'amber' as const,
              params: { sourceVendor: 'alpha-hes', injectAnomalies: true, autoRun: true },
            },
          ].map((scenario) => (
            <button
              key={scenario.label}
              onClick={() => onNavigate('workbench', scenario.params)}
              className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 hover:border-emerald-400/40 dark:hover:border-emerald-500/30 transition text-left cursor-pointer"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {scenario.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{scenario.sub}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Recent Test Runs
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Click Inspect to view full results.
            </p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            View all
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile cards / Desktop table */}
        {stats?.recent_runs && stats.recent_runs.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-700/60">
                  <tr>
                    <th className="py-3 px-5">Run ID</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Records</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {stats.recent_runs.map((run: TestRunSummary) => (
                    <tr
                      key={run.run_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => onAuditRun(run.run_id)}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1.5">
                          <Tooltip content={run.run_id} position="right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 cursor-help">
                              #{shortRunId(run.run_id)}
                            </span>
                          </Tooltip>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(run.run_id);
                              success('Copied', `Run ID copied`);
                            }}
                            className="text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded cursor-pointer"
                            title="Copy full Run ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {run.execution_time
                          ? new Date(run.execution_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                        {run.source_vendor}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                        {run.target_vendor || 'Validate Only'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {run.total_records}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(run.conformance_status)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-xs">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700/40">
              {stats.recent_runs.map((run: TestRunSummary) => (
                <div
                  key={run.run_id}
                  onClick={() => onAuditRun(run.run_id)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      #{shortRunId(run.run_id)}
                    </span>
                    {getStatusBadge(run.conformance_status)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {run.source_vendor} → {run.target_vendor || 'Validate Only'} · {run.total_records} records
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-14 text-center px-6">
            <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No test runs yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Head over to <strong>Run a Test</strong> to get started!
            </p>
            <button
              onClick={() => onNavigate('workbench')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run your first test
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

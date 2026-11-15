import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, TabKey } from './components/Sidebar';
import { DashboardTab } from './components/tabs/DashboardTab';
import { WorkbenchTab } from './components/tabs/WorkbenchTab';
import { TransformerTab } from './components/tabs/TransformerTab';
import { VendorsTab } from './components/tabs/VendorsTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { ContractsTab } from './components/tabs/ContractsTab';
import { StandardsTab } from './components/tabs/StandardsTab';
import { ShieldCheck, Zap } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [workbenchParams, setWorkbenchParams] = useState<{
    sourceVendor?: string;
    targetVendor?: string;
    injectAnomalies?: boolean;
    autoRun?: boolean;
  }>({});
  const [auditRunId, setAuditRunId] = useState<string | null>(null);

  const handleNavigate = (tab: TabKey, params?: any) => {
    if (tab === 'workbench' && params) {
      setWorkbenchParams(params);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuditRun = (runId: string) => {
    setAuditRunId(runId);
    setActiveTab('history');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getTabTitle = (tab: TabKey) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview & Real-time Metrics';
      case 'workbench':
        return 'Testing Workbench & Conformance Engine';
      case 'transformer':
        return 'Live Canonical Field Transformer';
      case 'vendors':
        return 'Registered Vendor Adapters';
      case 'history':
        return 'Audit History & Regression Comparator';
      case 'contracts':
        return 'Adapter Contracts & Schema Diff';
      case 'standards':
        return 'AMI Standards & OBIS Registry';
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Fixed Left Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area (offset by left sidebar width) */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {getTabTitle(activeTab)}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IS 15959 & IEC 61968-9 Conforming</span>
            </div>
          </div>
        </header>

        {/* Tab View Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">
          {activeTab === 'dashboard' && (
            <DashboardTab onNavigate={handleNavigate} onAuditRun={handleAuditRun} />
          )}

          {activeTab === 'workbench' && (
            <WorkbenchTab
              initialSourceVendor={workbenchParams.sourceVendor || 'alpha-hes'}
              initialTargetVendor={workbenchParams.targetVendor || 'gamma-mdms'}
              autoRun={workbenchParams.autoRun || false}
            />
          )}

          {activeTab === 'transformer' && <TransformerTab />}

          {activeTab === 'vendors' && <VendorsTab onNavigate={handleNavigate} />}

          {activeTab === 'history' && (
            <HistoryTab
              initialAuditRunId={auditRunId}
              onClearInitialAudit={() => setAuditRunId(null)}
            />
          )}

          {activeTab === 'contracts' && <ContractsTab />}

          {activeTab === 'standards' && <StandardsTab />}
        </main>

        {/* Enterprise Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B0F17] py-5 px-6 mt-auto transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">VIDYUTSETU</span>
              <span>·</span>
              <span>AMI Data Exchange Interoperability & Conformance Workbench</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                IS 15959 / IEC 61968-9
              </span>
              <span>·</span>
              <span>CEA RDSS Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;

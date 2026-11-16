import React, { useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
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

const TAB_TITLES: Record<TabKey, { title: string; desc: string }> = {
  dashboard: { title: 'Overview', desc: 'Real-time metrics & recent test runs' },
  workbench: { title: 'Run a Test', desc: 'Validate AMI meter data end-to-end' },
  transformer: { title: 'Field Mapping', desc: 'Convert data fields between vendor formats' },
  vendors: { title: 'Vendor Profiles', desc: 'Supported HES & MDMS adapters' },
  history: { title: 'Test History', desc: 'Review and compare past runs' },
  contracts: { title: 'Data Contracts', desc: 'Expected register schemas per vendor' },
  standards: { title: 'Standards Guide', desc: 'IEC 61968-9 & IS 15959 reference' },
};

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const { title, desc } = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen flex bg-[#f5f6f8] dark:bg-[#111827] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Main — offset by sidebar on lg+ */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top Header with Frosted Glass Effect */}
        <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70 px-4 md:px-6 flex items-center justify-between transition-colors">
          {/* Left — hamburger + title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger (mobile only) */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                {title}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block leading-tight mt-0.5 truncate">
                {desc}
              </p>
            </div>
          </div>

          {/* Right — conformance badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/8 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>IEC 61968-9 Conforming</span>
          </div>
        </header>

        {/* Page Content with fluid fade-in */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-6">
          <div key={activeTab} className="fade-in">
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
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-700/40 bg-white dark:bg-[#131c2e] py-4 px-4 md:px-6 mt-auto transition-colors">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600 dark:text-slate-400">VidyutSetu</span>
              <span>·</span>
              <span>AMI Data Exchange Conformance Workbench</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-500">IS 15959 / IEC 61968-9</span>
              <span>·</span>
              <span>CEA RDSS Compliant</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </ThemeProvider>
);

export default App;

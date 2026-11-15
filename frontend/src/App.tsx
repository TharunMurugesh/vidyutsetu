import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { Header, TabKey } from './components/Header';
import { DashboardTab } from './components/tabs/DashboardTab';
import { WorkbenchTab } from './components/tabs/WorkbenchTab';
import { TransformerTab } from './components/tabs/TransformerTab';
import { VendorsTab } from './components/tabs/VendorsTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { ContractsTab } from './components/tabs/ContractsTab';
import { StandardsTab } from './components/tabs/StandardsTab';
import { ShieldCheck, Heart } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 selection:bg-emerald-500 selection:text-white">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
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
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-400">VIDYUTSETU</span>
            <span>·</span>
            <span>AMI Data Exchange Interoperability & Conformance Workbench</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IS 15959 / IEC 61968-9</span>
            </span>
            <span>·</span>
            <span>CEA RDSS Compliant</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;


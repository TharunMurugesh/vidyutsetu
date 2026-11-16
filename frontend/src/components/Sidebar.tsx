import React, { useEffect, useState } from 'react';
import {
  Zap,
  LayoutDashboard,
  PlayCircle,
  ArrowLeftRight,
  Cpu,
  History,
  FileCheck2,
  BookOpen,
  Sun,
  Moon,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export type TabKey =
  | 'dashboard'
  | 'workbench'
  | 'transformer'
  | 'vendors'
  | 'history'
  | 'contracts'
  | 'standards';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems: {
  key: TabKey;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  badge?: string;
  tip: string;
}[] = [
  {
    key: 'dashboard',
    label: 'Overview',
    subLabel: 'At-a-glance metrics',
    icon: <LayoutDashboard className="w-4 h-4" />,
    tip: 'See your overall pass rate and recent test runs',
  },
  {
    key: 'workbench',
    label: 'Run a Test',
    subLabel: 'Validate meter data',
    icon: <PlayCircle className="w-4 h-4" />,
    badge: 'Core',
    tip: 'Upload or generate data and run a conformance test',
  },
  {
    key: 'transformer',
    label: 'Field Mapping',
    subLabel: 'Convert between formats',
    icon: <ArrowLeftRight className="w-4 h-4" />,
    tip: 'See how each data field translates across vendor formats',
  },
  {
    key: 'vendors',
    label: 'Vendor Profiles',
    subLabel: 'HES & MDMS adapters',
    icon: <Cpu className="w-4 h-4" />,
    badge: '4',
    tip: 'Browse all supported meter systems and their capabilities',
  },
  {
    key: 'history',
    label: 'Test History',
    subLabel: 'View past results',
    icon: <History className="w-4 h-4" />,
    tip: 'Review and compare previous test runs',
  },
  {
    key: 'contracts',
    label: 'Data Contracts',
    subLabel: 'Register definitions',
    icon: <FileCheck2 className="w-4 h-4" />,
    tip: 'Inspect the expected field schemas for each vendor',
  },
  {
    key: 'standards',
    label: 'Standards Guide',
    subLabel: 'IEC / IS reference',
    icon: <BookOpen className="w-4 h-4" />,
    tip: 'Reference for IEC 61968-9 and IS 15959 standards',
  },
];

const SidebarContent: React.FC<SidebarProps> = ({ activeTab, onTabChange, onMobileClose }) => {
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const start = performance.now();
      try {
        await api.getHealth();
        setLatency(Math.round(performance.now() - start));
        setIsOnline(true);
      } catch {
        setIsOnline(false);
        setLatency(null);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNav = (key: TabKey) => {
    onTabChange(key);
    onMobileClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand Header with Frosted Glass Border */}
      <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1.5px] shadow-md shadow-emerald-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/30" />
              </div>
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-slate-900 dark:text-white text-sm leading-none">
                VidyutSetu
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                AMI Conformance
              </div>
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onMobileClose}
            className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Standards badge with subtle glassmorphism */}
        <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xs">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            IEC 61968-9 · IS 15959 · DLMS
          </span>
        </div>
      </div>

      {/* Nav with Uniform Full-Width Rows */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="section-label px-3 mb-2.5">Navigation</p>

        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <div key={item.key} className="w-full">
              <button
                onClick={() => handleNav(item.key)}
                title={item.tip}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group cursor-pointer border ${
                  isActive
                    ? 'bg-emerald-500/12 dark:bg-emerald-500/15 backdrop-blur-md border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs shadow-emerald-500/10'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60 hover:backdrop-blur-md hover:border-slate-300/40 dark:hover:border-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/80 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight truncate">{item.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5 truncate">
                      {item.subLabel}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-emerald-200/80 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-200/80 dark:bg-slate-700/70 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer with Frosted Glass Appearance */}
      <div className="px-3 py-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
            <span className="text-xs font-semibold">{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
          </div>
        </button>

        {/* Status Row */}
        <div className="flex items-center justify-between px-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono">
              {isOnline ? (latency ? `${latency}ms` : 'Online') : 'Offline'}
            </span>
          </div>
          <span className="font-mono text-slate-400 dark:text-slate-500">v1.1.0</span>
        </div>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <>
      {/* Desktop — fixed frosted glass panel */}
      <aside className="hidden lg:flex w-64 fixed inset-y-0 left-0 z-40 flex-col bg-white/80 dark:bg-[#111827]/85 backdrop-blur-xl border-r border-slate-200/70 dark:border-slate-800/70 transition-colors duration-200 select-none">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile — overlay drawer with CSS transition */}
      {props.mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={props.onMobileClose}
        />
      )}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white/95 dark:bg-[#111827]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 select-none transition-transform duration-300 ease-out shadow-2xl ${
          props.mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  );
};

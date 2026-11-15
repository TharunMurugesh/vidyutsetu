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
  CheckCircle2,
  Activity,
  Layers,
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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
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

  const navItems: {
    key: TabKey;
    label: string;
    subLabel: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      subLabel: 'Overview & Metrics',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      key: 'workbench',
      label: 'Testing Workbench',
      subLabel: 'Validation & Anomaly Engine',
      icon: <PlayCircle className="w-4 h-4" />,
      badge: 'Core',
    },
    {
      key: 'transformer',
      label: 'Live Transformer',
      subLabel: 'Two-Way Field Mappings',
      icon: <ArrowLeftRight className="w-4 h-4" />,
    },
    {
      key: 'vendors',
      label: 'Vendor Adapters',
      subLabel: 'HES & MDMS Profiles',
      icon: <Cpu className="w-4 h-4" />,
      badge: '4',
    },
    {
      key: 'history',
      label: 'Audit & Diff',
      subLabel: 'Historical Regression Comparator',
      icon: <History className="w-4 h-4" />,
    },
    {
      key: 'contracts',
      label: 'Contracts & Schemas',
      subLabel: 'Declarative Register Diffing',
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      key: 'standards',
      label: 'Standards Reference',
      subLabel: 'IS 15959 & IEC 61968-9',
      icon: <BookOpen className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 fixed inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-[#0F172A] border-r border-slate-200 dark:border-slate-800/80 transition-colors duration-200 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-md shadow-emerald-500/20 shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base">
                VIDYUTSETU
              </span>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                AMI Conformance
              </span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono leading-tight">
          IEC 61968-9 · IS 15959 · DLMS
        </p>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Main Modules
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold shadow-sm border border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                    {item.subLabel}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                    isActive
                      ? 'bg-emerald-200 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Area: Theme Switcher & Status */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 bg-slate-50/70 dark:bg-[#0B0F17]/50">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500">
            {theme}
          </span>
        </button>

        {/* Health Status & Version */}
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-[10px]">
              {isOnline ? (latency ? `${latency}ms OK` : 'Online') : 'Offline'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">v1.1.0</span>
        </div>
      </div>
    </aside>
  );
};


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
  Activity,
} from 'lucide-react';
import { api } from '../services/api';

export type TabKey =
  | 'dashboard'
  | 'workbench'
  | 'transformer'
  | 'vendors'
  | 'history'
  | 'contracts'
  | 'standards';

interface HeaderProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
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

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'workbench', label: 'Workbench', icon: <PlayCircle className="w-4 h-4" /> },
    { key: 'transformer', label: 'Transformer', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { key: 'vendors', label: 'Adapters', icon: <Cpu className="w-4 h-4" /> },
    { key: 'history', label: 'Audit & Diff', icon: <History className="w-4 h-4" /> },
    { key: 'contracts', label: 'Contracts', icon: <FileCheck2 className="w-4 h-4" /> },
    { key: 'standards', label: 'Standards Ref', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1px] shadow-lg shadow-emerald-500/15">
            <div className="w-full h-full bg-[#0B0F17] rounded-[11px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">VIDYUTSETU</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AMI Conformance
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
              IEC 61968-9 · IS 15959 · DLMS/COSEM Interoperability Suite
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#111827]/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Status indicator */}
        <div className="hidden lg:flex items-center gap-2.5 text-xs">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-mono text-[11px]">
              {isOnline ? (latency ? `${latency}ms` : 'Online') : 'Offline'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">v1.1.0</span>
        </div>
      </div>
    </header>
  );
};


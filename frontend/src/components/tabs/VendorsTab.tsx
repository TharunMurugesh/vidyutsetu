import React, { useEffect, useState } from 'react';
import { Cpu, ArrowRight, Layers, FileCode, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { VendorProfile } from '../../types/api';
import { useToast } from '../../context/ToastContext';
import { TabKey } from '../Header';

interface VendorsTabProps {
  onNavigate: (tab: TabKey, params?: any) => void;
}

export const VendorsTab: React.FC<VendorsTabProps> = ({ onNavigate }) => {
  const [vendors, setVendors] = useState<Record<string, VendorProfile>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await api.getVendors();
      setVendors(data);
    } catch (e: any) {
      toast('error', 'Failed to load vendors', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Vendor Adapters Catalog</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Registered Connectors
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pluggable protocol adapters for Head-End Systems (HES) and Meter Data Management Systems (MDMS).
          </p>
        </div>
        <button
          onClick={loadVendors}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Adapters</span>
        </button>
      </div>

      {/* Grid of Vendor Adapters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Object.values(vendors).map((v) => {
          const obisCount = Object.keys(v.obis_code_mappings || {}).length;
          const eventCount = Object.keys(v.event_mappings || {}).length;

          return (
            <div
              key={v.vendor_id}
              className="bg-[#111827] border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {v.system_type}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                        {v.format_type}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-1.5">{v.name}</h2>
                    <p className="text-[11px] text-slate-500 font-mono">
                      ID: {v.vendor_id} · v{v.version}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{v.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Protocol
                    </span>
                    <span className="font-mono text-slate-200 text-[11px]">{v.protocol}</span>
                  </div>
                  <div className="bg-[#0B0F17] p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                      Mappings
                    </span>
                    <span className="font-mono text-slate-200 text-[11px]">
                      {obisCount} OBIS / {eventCount} Events
                    </span>
                  </div>
                </div>

                {obisCount > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Standard OBIS Registers:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                      {Object.keys(v.obis_code_mappings).slice(0, 6).map((code) => (
                        <span
                          key={code}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          {code}
                        </span>
                      ))}
                      {obisCount > 6 && (
                        <span className="text-[10px] text-slate-500 font-mono self-center">
                          +{obisCount - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() =>
                    onNavigate('workbench', {
                      sourceVendor: v.vendor_id,
                      targetVendor: v.system_type === 'HES' ? 'gamma-mdms' : 'alpha-hes',
                      autoRun: true,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/90 hover:bg-emerald-600 text-white transition shadow-sm cursor-pointer"
                >
                  <span>Test in Workbench</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

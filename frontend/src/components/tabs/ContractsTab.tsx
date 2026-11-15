import React, { useEffect, useState } from 'react';
import {
  FileCheck2,
  GitCompare,
  Layers,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { VendorProfile, ContractDiffResult } from '../../types/api';
import { useToast } from '../../context/ToastContext';

export const ContractsTab: React.FC = () => {
  const { toast, success, error } = useToast();

  const [contracts, setContracts] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Contract diff states
  const [vendorA, setVendorA] = useState<string>('alpha-hes');
  const [vendorB, setVendorB] = useState<string>('gamma-mdms');
  const [diffing, setDiffing] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<ContractDiffResult | null>(null);

  // Expanded schemas in contract cards
  const [expandedSchema, setExpandedSchema] = useState<Record<string, boolean>>({});

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await api.getContracts();
      setContracts(data.contracts || []);
    } catch (e: any) {
      toast('error', 'Failed to load contracts', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleDiff = async () => {
    if (vendorA === vendorB) {
      toast('info', 'Same Vendor', 'Select two different vendors to compare.');
      return;
    }
    setDiffing(true);
    try {
      const res = await api.diffContracts(vendorA, vendorB);
      setDiffResult(res);
      success('Diff Complete', `Compared ${vendorA} vs ${vendorB}`);
    } catch (e: any) {
      error('Diff Failed', e.message);
    } finally {
      setDiffing(false);
    }
  };

  const toggleSchema = (vendorId: string) => {
    setExpandedSchema((prev) => ({ ...prev, [vendorId]: !prev[vendorId] }));
  };

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Adapter Contracts & Schemas</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Versioned Specifications
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Declarative data contracts and semantic schema comparison between utility systems.
          </p>
        </div>
        <button
          onClick={loadContracts}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Contracts</span>
        </button>
      </div>

      {/* Contract Diff Tool */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Vendor Contract Diffing Tool
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Compare registers and event dictionaries across any two systems to discover coverage gaps.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Vendor System A
            </label>
            <select
              value={vendorA}
              onChange={(e) => setVendorA(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="alpha-hes">Alpha HES (DLMS)</option>
              <option value="beta-hes">Beta HES (CSV)</option>
              <option value="gamma-mdms">Gamma MDMS (CIM)</option>
              <option value="delta-legacy">Delta Legacy HES</option>
            </select>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Vendor System B
            </label>
            <select
              value={vendorB}
              onChange={(e) => setVendorB(e.target.value)}
              className="w-full bg-[#0B0F17] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="gamma-mdms">Gamma MDMS (CIM)</option>
              <option value="alpha-hes">Alpha HES (DLMS)</option>
              <option value="beta-hes">Beta HES (CSV)</option>
              <option value="delta-legacy">Delta Legacy HES</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              onClick={handleDiff}
              disabled={diffing}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer disabled:opacity-50"
            >
              <GitCompare className={`w-3.5 h-3.5 ${diffing ? 'animate-spin' : ''}`} />
              <span>Diff Contracts</span>
            </button>
          </div>
        </div>

        {/* Diff Result Card */}
        {diffResult && (
          <div className="pt-4 border-t border-slate-800 space-y-4 fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Format Compatibility:</span>
                {diffResult.format_match ? (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Direct Match
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Requires Adapter Conversion
                  </span>
                )}
              </div>
              <div className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">Protocol Matching:</span>
                {diffResult.protocol_match ? (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Same Protocol
                  </span>
                ) : (
                  <span className="text-purple-400 font-bold text-xs flex items-center gap-1">
                    Cross-Protocol Bridge
                  </span>
                )}
              </div>
            </div>

            {/* OBIS Comparison 3 Columns */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                OBIS Register Alignment:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl">
                  <span className="text-xs font-bold text-rose-400 block mb-1">
                    Only in {diffResult.vendor_a} ({diffResult.obis_codes.only_a.length})
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {diffResult.obis_codes.only_a.map((c, i) => (
                      <div key={i} className="text-[11px] font-mono text-rose-300">
                        {c}
                      </div>
                    ))}
                    {diffResult.obis_codes.only_a.length === 0 && (
                      <span className="text-[11px] text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl">
                  <span className="text-xs font-bold text-emerald-400 block mb-1">
                    Shared Registers ({diffResult.obis_codes.shared.length})
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {diffResult.obis_codes.shared.map((c, i) => (
                      <div key={i} className="text-[11px] font-mono text-emerald-300">
                        {c}
                      </div>
                    ))}
                    {diffResult.obis_codes.shared.length === 0 && (
                      <span className="text-[11px] text-slate-500">None</span>
                    )}
                  </div>
                </div>

                <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-xl">
                  <span className="text-xs font-bold text-amber-400 block mb-1">
                    Only in {diffResult.vendor_b} ({diffResult.obis_codes.only_b.length})
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {diffResult.obis_codes.only_b.map((c, i) => (
                      <div key={i} className="text-[11px] font-mono text-amber-300">
                        {c}
                      </div>
                    ))}
                    {diffResult.obis_codes.only_b.length === 0 && (
                      <span className="text-[11px] text-slate-500">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contract Declarations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {contracts.map((c) => {
          const isExpanded = !!expandedSchema[c.vendor_id];
          const obisKeys = Object.keys(c.obis_code_mappings || {});
          const eventKeys = Object.keys(c.event_mappings || {});

          return (
            <div
              key={c.vendor_id}
              className="bg-[#111827] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{c.name}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {c.vendor_id} · v{c.version}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {c.format_type}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#0B0F17] p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">Protocol:</span>
                    <span className="text-white font-mono">{c.protocol}</span>
                  </div>
                  <div className="bg-[#0B0F17] p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">System Type:</span>
                    <span className="text-white font-mono">{c.system_type}</span>
                  </div>
                </div>

                {obisKeys.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      OBIS Registers ({obisKeys.length}):
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto">
                      {obisKeys.map((k) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Source Schema Accordion */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => toggleSchema(c.vendor_id)}
                  className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-white py-1 cursor-pointer transition-colors"
                >
                  <span className="font-mono">Inspect Source JSON Schema</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isExpanded && (
                  <pre className="p-3 bg-[#0B0F17] rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 mt-2 max-h-48 overflow-x-auto leading-relaxed fade-in">
                    {JSON.stringify(c.source_schema, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

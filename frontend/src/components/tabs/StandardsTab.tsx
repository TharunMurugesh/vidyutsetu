import React, { useState } from 'react';
import { BookOpen, Bookmark, Layers, Search, Shield, Zap, ExternalLink } from 'lucide-react';

interface ObisEntry {
  obis: string;
  name: string;
  category: 'Energy' | 'Instantaneous' | 'Tamper' | 'Billing';
  description: string;
  is15959Part: string;
  scale: string;
}

const OBIS_REGISTRY: ObisEntry[] = [
  {
    obis: '1.0.1.8.0.255',
    name: 'Active Energy Import (Total)',
    category: 'Energy',
    description: 'Cumulative active import energy register delivered to load',
    is15959Part: 'Part 1 / Part 2',
    scale: 'kWh (multiplier 10^-3 from Wh)',
  },
  {
    obis: '1.0.2.8.0.255',
    name: 'Active Energy Export (Total)',
    category: 'Energy',
    description: 'Cumulative active export energy register fed back into grid (solar/DG)',
    is15959Part: 'Part 1 / Part 2',
    scale: 'kWh (multiplier 10^-3 from Wh)',
  },
  {
    obis: '1.0.5.8.0.255',
    name: 'Reactive Energy Lag (Total)',
    category: 'Energy',
    description: 'Cumulative inductive reactive energy register',
    is15959Part: 'Part 1 / Part 2',
    scale: 'kVarh (multiplier 10^-3 from Varh)',
  },
  {
    obis: '1.0.8.8.0.255',
    name: 'Reactive Energy Lead (Total)',
    category: 'Energy',
    description: 'Cumulative capacitive reactive energy register',
    is15959Part: 'Part 1 / Part 2',
    scale: 'kVarh (multiplier 10^-3 from Varh)',
  },
  {
    obis: '1.0.9.8.0.255',
    name: 'Apparent Energy (Total)',
    category: 'Energy',
    description: 'Cumulative apparent energy register',
    is15959Part: 'Part 1 / Part 2',
    scale: 'kVAh (multiplier 10^-3 from VAh)',
  },
  {
    obis: '1.0.12.7.0.255',
    name: 'Phase Voltage RMS',
    category: 'Instantaneous',
    description: 'Instantaneous root-mean-square phase voltage (Phase L1/R)',
    is15959Part: 'Part 1 / Part 2',
    scale: 'Volts (multiplier 10^-1 from decivolts)',
  },
  {
    obis: '1.0.11.7.0.255',
    name: 'Phase Current RMS',
    category: 'Instantaneous',
    description: 'Instantaneous root-mean-square line current',
    is15959Part: 'Part 1 / Part 2',
    scale: 'Amperes (multiplier 10^-2 from centiamperes)',
  },
  {
    obis: '1.0.13.7.0.255',
    name: 'Average Power Factor',
    category: 'Instantaneous',
    description: 'Instantaneous system total power factor cos(phi)',
    is15959Part: 'Part 1 / Part 2',
    scale: 'Ratio [-1.0 to 1.0] (multiplier 10^-3)',
  },
  {
    obis: '1.0.14.7.0.255',
    name: 'Grid Frequency',
    category: 'Instantaneous',
    description: 'Fundamental grid frequency measurement (Nominal 50.0 Hz in India)',
    is15959Part: 'Part 1 / Part 2',
    scale: 'Hertz (multiplier 10^-2 from centihertz)',
  },
  {
    obis: '0.0.96.11.0.255',
    name: 'Tamper Event Status Register',
    category: 'Tamper',
    description: 'Bitmap or event code for meter cover open, magnetic influence, or neutral disturbance',
    is15959Part: 'Part 1 / Part 2 Table 27',
    scale: 'Bitfield / Discrete Code',
  },
];

export const StandardsTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filtered = OBIS_REGISTRY.filter((entry) => {
    if (categoryFilter !== 'ALL' && entry.category !== categoryFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        entry.obis.includes(q) ||
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>AMI Standards & Specifications Reference</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Regulatory Framework
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative guidelines for smart metering under the Revamped Distribution Sector Scheme (RDSS) and IEC TC 57.
          </p>
        </div>
      </div>

      {/* Standards Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">IS 15959 Companion Specification</h2>
              <p className="text-xs text-slate-400">Bureau of Indian Standards (BIS) & Central Electricity Authority (CEA)</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Mandated for all Indian smart meter rollouts under RDSS. It governs data exchange Companion Specifications for Electricity Metering, standardizing OBIS register profiles, load surveys (15/30-minute intervals), daily billing profiles, and anti-tamper mechanisms.
          </p>
          <div className="space-y-2 text-xs bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800">
            <div>
              <strong className="text-emerald-400">Part 1:</strong> AC Static Direct Connected Meters (up to 60A / 100A, single-phase & three-phase).
            </div>
            <div>
              <strong className="text-emerald-400">Part 2:</strong> Transformer-Operated Static Watt-hour and Var-hour Meters (CT/PT operated).
            </div>
            <div>
              <strong className="text-emerald-400">Part 3:</strong> High Voltage Boundary and Feeder Metering interfaces.
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800/90 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">IEC 61968-9 (CIM for Distribution)</h2>
              <p className="text-xs text-slate-400">International Electrotechnical Commission TC 57</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Specifies the vendor-neutral Common Information Model (CIM) for smart metering system interfaces. Translates raw meter register measurements into canonical <code>MeterReadings</code> and grid alarms into standardized <code>EndDeviceEvents</code>.
          </p>
          <div className="space-y-2 text-xs bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800">
            <div>
              <strong className="text-blue-400">MeterReadings & IntervalBlocks:</strong> Structured time-series profiles with ReadingQuality flags.
            </div>
            <div>
              <strong className="text-blue-400">EndDeviceEvents:</strong> Normalized codes for tamper events, supply outages, and power quality alerts.
            </div>
            <div>
              <strong className="text-blue-400">EndDeviceControls:</strong> Connect/disconnect commands and load limitation signals.
            </div>
          </div>
        </div>
      </div>

      {/* Searchable OBIS Registry */}
      <div className="bg-[#111827] border border-slate-800/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>IS 15959 & DLMS OBIS Register Registry</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Official Object Identification System (OBIS) definitions for energy, power quality, and anti-tamper.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search OBIS or register..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0B0F17] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#0B0F17] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Energy">Energy Registers</option>
              <option value="Instantaneous">Instantaneous Params</option>
              <option value="Tamper">Tamper Events</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0B0F17]/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">OBIS Code</th>
                <th className="py-3 px-4">Register Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Multiplier / Scale</th>
                <th className="py-3 px-4">IS 15959 Specification</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-400">{item.obis}</td>
                  <td className="py-3 px-4 font-semibold text-slate-200">{item.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">{item.scale}</td>
                  <td className="py-3 px-4 text-slate-300">{item.is15959Part}</td>
                  <td className="py-3 px-4 text-slate-400">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

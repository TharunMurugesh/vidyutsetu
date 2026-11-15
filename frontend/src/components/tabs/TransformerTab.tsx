import React, { useState } from 'react';
import { ArrowLeftRight, Check, Copy, Sparkles, Layers, Cpu, Zap } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface MappingItem {
  canonical: string;
  unit: string;
  obis: string;
  alpha: string;
  beta: string;
  gamma: string;
  delta: string;
  description: string;
}

const MAPPINGS: MappingItem[] = [
  {
    canonical: 'active_energy_import_kwh',
    unit: 'kWh (Cumulative)',
    obis: '1.0.1.8.0.255',
    alpha: 'registers["1.0.1.8.0.255"] * 10^-3',
    beta: 'KWH_IMP (Float)',
    gamma: 'MeterReadings[].IntervalReading.value (Wh * 1e-3)',
    delta: 'act_wh * 0.001',
    description: 'Total active energy delivered to load (import register)',
  },
  {
    canonical: 'active_energy_export_kwh',
    unit: 'kWh (Net Metering)',
    obis: '1.0.2.8.0.255',
    alpha: 'registers["1.0.2.8.0.255"] * 10^-3',
    beta: 'KWH_EXP (Float)',
    gamma: 'ActiveEnergy.Export',
    delta: 'exp_wh * 0.001',
    description: 'Active energy fed back into grid from solar or DG',
  },
  {
    canonical: 'reactive_energy_lag_kvarh',
    unit: 'kVarh (Inductive)',
    obis: '1.0.5.8.0.255',
    alpha: 'registers["1.0.5.8.0.255"] * 10^-3',
    beta: 'KVARH_LAG (Float)',
    gamma: 'ReactiveEnergy.Lag',
    delta: 'kvarh_lag (direct)',
    description: 'Lagging reactive energy register for power factor billing',
  },
  {
    canonical: 'voltage_v',
    unit: 'Volts RMS (L1)',
    obis: '1.0.12.7.0.255',
    alpha: 'registers["1.0.12.7.0.255"] * 10^-1',
    beta: 'VRMS (Float)',
    gamma: 'Voltage.RMS.V',
    delta: 'volt_mv * 0.001',
    description: 'Instantaneous RMS line-to-neutral phase voltage',
  },
  {
    canonical: 'current_a',
    unit: 'Amperes RMS',
    obis: '1.0.11.7.0.255',
    alpha: 'registers["1.0.11.7.0.255"] * 10^-2',
    beta: 'IRMS (Float)',
    gamma: 'Current.RMS.A',
    delta: 'curr_ma * 0.001',
    description: 'Phase current instantaneous RMS measurement',
  },
  {
    canonical: 'power_factor',
    unit: 'Ratio [-1.0, 1.0]',
    obis: '1.0.13.7.0.255',
    alpha: 'registers["1.0.13.7.0.255"] * 10^-3',
    beta: 'PF (Float)',
    gamma: 'PowerFactor.ThreePhase',
    delta: 'pf_hundredths * 0.01',
    description: 'Instantaneous system total power factor cos(θ)',
  },
  {
    canonical: 'frequency_hz',
    unit: 'Hertz (45 - 55 Hz)',
    obis: '1.0.14.7.0.255',
    alpha: 'registers["1.0.14.7.0.255"] * 10^-2',
    beta: 'FREQ (Float)',
    gamma: 'Frequency.Grid',
    delta: 'freq_hz (direct)',
    description: 'Grid supply fundamental frequency',
  },
];

export const TransformerTab: React.FC = () => {
  const { success } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttribute, setSelectedAttribute] = useState<MappingItem>(MAPPINGS[0]);

  const filtered = MAPPINGS.filter(
    (m) =>
      m.canonical.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.obis.includes(searchTerm) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Live Canonical Transformation Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Two-Way Multiplier Matrix
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Universal semantic normalizer aligning proprietary vendor formats to the IEC 61968-9 standard.
          </p>
        </div>
      </div>

      {/* Interactive Visual Transformation Pipeline */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Interactive Two-Way Mapping Inspector</span>
        </h2>

        {/* Selected Register Detail Card */}
        <div className="bg-slate-50 dark:bg-[#0B0F17] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {selectedAttribute.canonical}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                  OBIS {selectedAttribute.obis}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedAttribute.description}</p>
            </div>
            <span className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded">
              Unit: {selectedAttribute.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="bg-white dark:bg-[#111827] p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Alpha HES (DLMS)
              </span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 break-all">
                {selectedAttribute.alpha}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Beta HES (CSV)
              </span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 break-all">
                {selectedAttribute.beta}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Gamma MDMS (CIM)
              </span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 break-all">
                {selectedAttribute.gamma}
              </p>
            </div>
            <div className="bg-white dark:bg-[#111827] p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Delta Legacy HES
              </span>
              <p className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-1 break-all">
                {selectedAttribute.delta}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Mapping Matrix Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800/90 rounded-2xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Full Cross-Vendor Normalization Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any row to inspect conversion formula and multiplier rationale.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search attributes, OBIS code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 dark:bg-[#0B0F17] border border-slate-300 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64 transition-colors"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0B0F17]/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Canonical Attribute</th>
                <th className="py-3 px-4">Standard Unit</th>
                <th className="py-3 px-4">OBIS Code</th>
                <th className="py-3 px-4">Alpha HES (DLMS)</th>
                <th className="py-3 px-4">Beta HES (CSV)</th>
                <th className="py-3 px-4">Gamma MDMS (CIM)</th>
                <th className="py-3 px-4">Delta Legacy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-sans">
              {filtered.map((item, idx) => {
                const isSelected = selectedAttribute.canonical === item.canonical;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedAttribute(item)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.canonical}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{item.unit}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{item.obis}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.alpha}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.beta}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.gamma}</td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">{item.delta}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

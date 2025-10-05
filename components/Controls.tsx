'use client';

import { useState } from 'react';
import { Search, HeartPulse, Building2, Car, Trees, ThermometerSun } from 'lucide-react';

type Show = {
  noise: boolean;
  buildings: boolean;
  sensors: boolean;
  heat: boolean;
  traffic: boolean;
  heatmap: boolean;
};

type Props = {
  // persona
  persona: 'citizen' | 'health' | 'investor' | null;
  onPersonaChange: (p: 'citizen' | 'health' | 'investor') => void;

  // search
  query: string;
  onQuery: (v: string) => void;
  onGoToCity: (q: string) => void;

  // layers
  show: Show;
  onToggle: (k: keyof Show) => void;

  // sims
  intensity: number;
  onIntensity: (v: number) => void;
  onPlantTrees: () => void;
  onCalmTraffic: () => void;
  onReset: () => void;
};

export default function Controls({
  persona, onPersonaChange,
  query, onQuery, onGoToCity,
  show, onToggle,
  intensity, onIntensity, onPlantTrees, onCalmTraffic, onReset
}: Props) {

  const [searching, setSearching] = useState(false);
  const go = async () => { setSearching(true); await onGoToCity(query); setSearching(false); };

  return (
    <div className="card p-4 space-y-5">
      {/* PURPOSE */}
      <section>
        <h3 className="font-semibold mb-2">Purpose</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`btn py-2 ${persona === 'citizen' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('citizen')}
            title="General exploration"
          >
            👤 Citizen
          </button>
          <button
            className={`btn py-2 ${persona === 'health' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('health')}
            title="Lower noise & heat priority"
          >
            ❤️ Health
          </button>
          <button
            className={`btn py-2 ${persona === 'investor' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('investor')}
            title="Feasibility focus"
          >
            🏗️ Investor
          </button>
        </div>
      </section>

      {/* SEARCH */}
      <section>
        <h3 className="font-semibold mb-2">Search</h3>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search city (Essaouira, Casablanca, …)"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' ? go() : null}
          />
          <button className="btn" onClick={go} disabled={searching} title="Search">
            <Search size={16} />
          </button>
        </div>
      </section>

      {/* LAYERS */}
      <section>
        <h3 className="font-semibold mb-2">Layers</h3>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.noise} onChange={() => onToggle('noise')} /> <Trees size={14}/> Noise</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.buildings} onChange={() => onToggle('buildings')} /> <Building2 size={14}/> Buildings</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.sensors} onChange={() => onToggle('sensors')} /> 🛰 Sensors</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.heat} onChange={() => onToggle('heat')} /> <ThermometerSun size={14}/> Heat Vulnerability</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.traffic} onChange={() => onToggle('traffic')} /> <Car size={14}/> Traffic</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={show.heatmap} onChange={() => onToggle('heatmap')} /> 🟡 Heatmap (from Noise)</label>
        </div>
      </section>

      {/* SIMULATIONS */}
      <section>
        <h3 className="font-semibold mb-2">Simulations</h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1 text-sm text-black/70 dark:text-white/70">
              <span>Intensity</span><span>{intensity.toFixed(2)}</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={intensity}
              onChange={(e) => onIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={onPlantTrees}>🌳 Plant Trees</button>
            <button className="btn" onClick={onCalmTraffic}>🚗 Calm Traffic</button>
          </div>
          <button className="btn" onClick={onReset}>Reset Simulation</button>
        </div>
      </section>

      {/* Persona tip */}
      {persona === 'health' && (
        <div className="text-xs text-rose-400/90">
          Tip: Focus on low <b>Noise</b> + low <b>Heat</b> areas. Use the heatmap and draw a zone.
        </div>
      )}
      {persona === 'investor' && (
        <div className="text-xs text-emerald-400/90">
          Tip: Look for calmer <b>Traffic</b> and moderate <b>Noise</b> for schools/housing.
        </div>
      )}
    </div>
  );
}

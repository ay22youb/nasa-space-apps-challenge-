'use client';

import { useState } from 'react';
import { Search, Building2, Car, Trees, ThermometerSun, Star } from 'lucide-react';

type Show = {
  noise: boolean;
  buildings: boolean;
  sensors: boolean;
  heat: boolean;
  traffic: boolean;
  heatmap: boolean;
};

type Persona = 'citizen' | 'health' | 'investor' | null;

type CityScoreItem = {
  name: 'Essaouira' | 'Rabat' | 'Marrakech' | 'Casablanca';
  score: number;
  recommended: boolean;
};

type Props = {
  // persona
  persona: Persona;
  onPersonaChange: (p: Exclude<Persona, null>) => void;

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

  // snapshot
  healthScore: number | null;
  prevScore: number | null;

  // city scores (mode-aware)
  cityScores: CityScoreItem[];
  onJumpToCity: (name: string) => void;
};

function gradeFromScore(score: number | null) {
  if (score === null || Number.isNaN(score)) return { label: '—', color: 'bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-100' };
  if (score >= 80) return { label: 'Green (Healthy)', color: 'bg-green-200 text-green-800 dark:bg-green-900/40 dark:text-green-300' };
  if (score >= 60) return { label: 'Yellow (OK)', color: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300' };
  if (score >= 40) return { label: 'Orange (Caution)', color: 'bg-orange-200 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300' };
  return { label: 'Red (Unhealthy)', color: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300' };
}

export default function Controls({
  persona, onPersonaChange,
  query, onQuery, onGoToCity,
  show, onToggle,
  intensity, onIntensity, onPlantTrees, onCalmTraffic, onReset,
  healthScore, prevScore,
  cityScores, onJumpToCity
}: Props) {

  const [searching, setSearching] = useState(false);
  const go = async () => { setSearching(true); await onGoToCity(query); setSearching(false); };

  const g = gradeFromScore(healthScore);
  const delta = healthScore !== null && prevScore !== null ? healthScore - prevScore : null;

  return (
    <div className="card p-4 space-y-5">
      {/* PURPOSE */}
      <section>
        <h3 className="font-semibold mb-2">Purpose</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            className={`btn py-2 ${persona === 'citizen' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('citizen')}
          >
            👤 Citizen
          </button>
          <button
            className={`btn py-2 ${persona === 'health' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('health')}
          >
            ❤️ Health
          </button>
          <button
            className={`btn py-2 ${persona === 'investor' ? 'bg-black/5 dark:bg-white/10' : ''}`}
            onClick={() => onPersonaChange('investor')}
          >
            🏗️ Investor
          </button>
        </div>
      </section>

      {/* CITY SCORES (mode-aware) */}
      <section>
        <h3 className="font-semibold mb-2">City Scores (mode-aware)</h3>
        <div className="space-y-2">
          {cityScores.map((c) => {
            const cg = gradeFromScore(c.score);
            return (
              <div key={c.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {c.recommended && <Star size={14} className="text-amber-400" title="Recommended" />}
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className={`text-[11px] px-2 py-1 rounded-md ${cg.color}`}>{c.score}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.recommended && <span className="text-[11px] text-emerald-500">★ Fav</span>}
                  <button className="btn px-3 py-1 text-xs" onClick={() => onJumpToCity(c.name)}>Go</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[11px] mt-1 opacity-70">
          Citizen: balances heat & noise (Essaouira is favored ≥80). Health: prioritizes low heat. Investor: prioritizes calmer traffic.
        </div>
      </section>

      {/* HEALTH & AIR SNAPSHOT */}
      <section>
        <h3 className="font-semibold mb-2">Health & Air Snapshot</h3>
        <div className={`rounded-xl px-4 py-3 ${g.color} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center font-bold">
              {healthScore ?? '—'}
            </div>
            <div>
              <div className="text-sm leading-tight">Current City Score</div>
              <div className="text-xs opacity-80">{g.label}</div>
            </div>
          </div>
          <div className="text-xs">
            {delta !== null && delta !== 0 ? (
              <span className={delta > 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}>
                {delta > 0 ? '▲ +' : '▼ '}{Math.abs(delta)}
              </span>
            ) : <span className="opacity-60">—</span>}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 text-xs grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> 80–100 Healthy</div>
          <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" /> 60–79 OK</div>
          <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500" /> 40–59 Caution</div>
          <div className="flex items-center gap-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" /> 0–39 Unhealthy</div>
        </div>

        <div className="text-[11px] mt-1 opacity-70">
          *Prototype heuristic: combines Noise (inverse air proxy) + Heat Vulnerability. Simulations will shift this.
        </div>
      </section>

      {/* SEARCH */}
      <section>
        <h3 className="font-semibold mb-2">Search</h3>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search city (Essaouira, Rabat, Marrakech, Casablanca …)"
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
              onChange={(e) => onIn

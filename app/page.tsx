'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import NextDynamic from 'next/dynamic';
import Controls from '@/components/Controls';
import { Sun, Moon } from 'lucide-react';

// Map must be client-only (Leaflet touches window)
const CityMap = NextDynamic(() => import('@/components/CityMap'), { ssr: false });
// Assistant renders inline in the sidebar
const AssistantDock = NextDynamic(() => import('@/components/AssistantDock'), { ssr: false });

export const dynamic = 'force-dynamic';

type Feature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: { type: string; coordinates: any };
};
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };
type Persona = 'citizen' | 'health' | 'investor' | null;
type CityName = 'Essaouira' | 'Rabat' | 'Marrakech' | 'Casablanca';

const PRESETS: Record<string, [number, number, number]> = {
  essaouira: [31.5085, -9.76, 13],
  casablanca: [33.5731, -7.5898, 12],
  madrid: [40.4168, -3.7038, 12], // still available
  nyc: [40.7128, -74.006, 12],    // still available
  rabat: [34.0209, -6.8416, 12],
  marrakech: [31.6295, -7.9811, 12],
};

// ---------------------------------------------------------------------------
// Health snapshot helpers (from existing data)
const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
function avgNumeric(features: Feature[], propNames: string[]): number | null {
  const vals: number[] = [];
  for (const ft of features) {
    const p = ft?.properties ?? {};
    for (const key of propNames) {
      const v = Number((p as any)[key]);
      if (!Number.isNaN(v)) { vals.push(v); break; }
    }
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function computeHealthScore(noise: FeatureCollection | null, heat: FeatureCollection | null): number | null {
  const noiseAvg = noise ? avgNumeric(noise.features, ['level', 'noise', 'value']) : null;
  const heatAvgRaw = heat ? avgNumeric(heat.features, ['score', 'index', 'level', 'value']) : null;
  const noise0_100 = clamp100(noiseAvg ?? 50);
  const heat0_100 = clamp100(heatAvgRaw ?? 50);
  const risk = 0.6 * noise0_100 + 0.4 * heat0_100;
  return Math.round(clamp100(100 - risk));
}

// ---------------------------------------------------------------------------
// Mode-aware City Scores (synthetic baselines for demo)
type CityBaseline = { noise: number; heat: number; traffic: number }; // 0..100 risk-like
const CITY_BASELINE: Record<CityName, CityBaseline> = {
  // tuned so Citizen mode gives Essaouira >= 80 (your request)
  Essaouira:  { noise: 25, heat: 15, traffic: 20 },
  Rabat:      { noise: 50, heat: 45, traffic: 45 },
  Marrakech:  { noise: 55, heat: 80, traffic: 40 },
  Casablanca: { noise: 75, heat: 60, traffic: 65 },
};

function scoreCity(b: CityBaseline, persona: Exclude<Persona, null> | 'citizen'): number {
  let risk: number;
  if (persona === 'health') {
    // heavier weight on heat + some noise
    risk = 0.6 * b.heat + 0.4 * b.noise;
  } else if (persona === 'investor') {
    // heavier weight on traffic + some noise
    risk = 0.6 * b.traffic + 0.4 * b.noise;
  } else {
    // citizen: balanced between heat and noise
    risk = 0.5 * b.heat + 0.5 * b.noise;
  }
  return Math.round(clamp100(100 - risk));
}

type CityScoreItem = { name: CityName; score: number; recommended: boolean };

function computeModeAwareCityScores(persona: Persona): CityScoreItem[] {
  const mode = (persona ?? 'citizen') as Exclude<Persona, null>;
  const names: CityName[] = ['Essaouira', 'Rabat', 'Marrakech', 'Casablanca'];

  // raw scoring
  const items = names.map((name) => ({
    name,
    score: scoreCity(CITY_BASELINE[name], mode),
    recommended: false,
  }));

  // Recommendation rule:
  // - In citizen mode, if Essaouira >= 80 → force recommend Essaouira (your requirement).
  // - Otherwise, recommend the top-scoring city.
  // - For other modes, recommend the top-scoring city.
  let recommendedName: CityName = items.reduce((a, b) => (a.score >= b.score ? a : b)).name;
  if (mode === 'citizen') {
    const essa = items.find((i) => i.name === 'Essaouira')!;
    if (essa.score >= 80) recommendedName = 'Essaouira';
  }

  return items.map((i) => ({ ...i, recommended: i.name === recommendedName }));
}

export default function Page() {
  // Data
  const [noise, setNoise] = useState<FeatureCollection | null>(null);
  const [buildings, setBuildings] = useState<FeatureCollection | null>(null);
  const [sensors, setSensors] = useState<FeatureCollection | null>(null);
  const [heat, setHeat] = useState<FeatureCollection | null>(null);
  const [traffic, setTraffic] = useState<FeatureCollection | null>(null);

  // Map / UI
  const [center, setCenter] = useState<[number, number]>([31.5085, -9.76]); // Essaouira
  const [zoom, setZoom] = useState(13);
  const [query, setQuery] = useState('');

  const [show, setShow] = useState({
    noise: true,
    buildings: true,
    sensors: true,
    heat: true,
    traffic: true,
    heatmap: true,
  });
  const [intensity, setIntensity] = useState(0.5);

  // Theme
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const cls = document.documentElement.classList;
    if (dark) cls.add('dark'); else cls.remove('dark');
  }, [dark]);

  // Persona (purpose)
  const [persona, setPersona] = useState<Persona>(null);

  // Health & Air Snapshot
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);

  // Load sample data (client only)
  useEffect(() => {
    const load = async () => {
      const [n, b, s, h, t] = await Promise.all([
        fetch('/sample-data/noise.geojson').then((r) => r.json()),
        fetch('/sample-data/buildings.geojson').then((r) => r.json()),
        fetch('/sample-data/sensors.geojson').then((r) => r.json()),
        fetch('/sample-data/heat-vulnerability.geojson').then((r) => r.json()),
        fetch('/sample-data/traffic.geojson').then((r) => r.json()),
      ]);
      setNoise(n); setBuildings(b); setSensors(s); setHeat(h); setTraffic(t);
    };
    load();
  }, []);

  // Recompute snapshot whenever inputs change
  useEffect(() => {
    const next = computeHealthScore(noise, heat);
    setPrevScore((old) => (old === null ? next : old)); // keep first as baseline
    setHealthScore(next);
  }, [noise, heat]);

  // Mode-aware city scores
  const cityScores = useMemo(() => computeModeAwareCityScores(persona), [persona]);

  // Assistant context
  const context = useMemo(() => ({
    persona,
    summary: 'Prototype digital twin datasets (synthetic).',
    layers: { noise, buildings, sensors, heat, traffic },
    healthScore,
    cityScores,
  }), [persona, noise, buildings, sensors, heat, traffic, healthScore, cityScores]);

  // Toggles
  const toggle = (k: keyof typeof show) => setShow((s) => ({ ...s, [k]: !s[k] }));

  // Simulations
  const plantTrees = () => {
    if (!noise) return;
    const f = noise.features.map((ft) => ({
      ...ft,
      properties: {
        ...ft.properties,
        level: Math.max(0, Number(ft.properties.level) * (1 - 0.3 * intensity)), // up to -30% * intensity
      },
    }));
    setNoise({ ...noise, features: f });
  };

  const calmTraffic = () => {
    if (!traffic) return;
    const f = traffic.features.map((ft) => {
      const s = Number(ft.properties.speed_kmh);
      const reduced = s - (s - 30) * 0.2 * intensity;
      return { ...ft, properties: { ...ft.properties, speed_kmh: Math.max(5, Number(reduced.toFixed(1))) } };
    });
    setTraffic({ ...traffic, features: f });

    // Optional: tiny global noise benefit from calmer traffic
    if (noise) {
      const nf = noise.features.map((ft) => ({
        ...ft,
        properties: {
          ...ft.properties,
          level: Math.max(0, Number(ft.properties.level) * (1 - 0.05 * intensity)),
        },
      }));
      setNoise({ ...noise, features: nf });
    }
  };

  const resetSim = async () => {
    const [n, t] = await Promise.all([
      fetch('/sample-data/noise.geojson').then((r) => r.json()),
      fetch('/sample-data/traffic.geojson').then((r) => r.json()),
    ]);
    setNoise(n); setTraffic(t);
    setPrevScore(null); // allow baseline to reset
  };

  // City search (presets first, then Nominatim)
  const goToCity = async (name: string) => {
    const key = (name || '').toLowerCase().trim();
    if (PRESETS[key]) {
      const [lat, lng, z] = PRESETS[key];
      setCenter([lat, lng]); setZoom(z);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        const { lat, lon } = data[0];
        setCenter([parseFloat(lat), parseFloat(lon)]);
        setZoom(12);
      }
    } catch {}
  };

  return (
    <main className="container py-6 relative min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between mb-4">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold">
          Digital Twin City — <span className="text-indigo-500 dark:text-indigo-400">Prototype</span>
        </motion.h1>
        <button onClick={() => setDark((d) => !d)} className="btn flex items-center gap-2" title="Toggle dark/light mode">
          {dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? 'Light' : 'Dark'} Mode
        </button>
      </header>

      <p className="text-black/70 dark:text-white/70 mt-1 mb-4 max-w-3xl">
        Left sidebar: purpose, city scores (mode-aware), layers, simulations, and snapshot.
        Right: full map. Run a simulation and watch scores and snapshot shift.
      </p>

      {/* Two-column layout: sticky sidebar + full map */}
      <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        {/* Sidebar (sticky) */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Controls
            // persona
            persona={persona}
            onPersonaChange={(p) => setPersona(p)}
            // search
            query={query}
            onQuery={setQuery}
            onGoToCity={goToCity}
            // layers
            show={show}
            onToggle={(k) => toggle(k)}
            // sims
            intensity={intensity}
            onIntensity={setIntensity}
            onPlantTrees={plantTrees}
            onCalmTraffic={calmTraffic}
            onReset={resetSim}
            // snapshot + city scores
            healthScore={healthScore}
            prevScore={prevScore}
            cityScores={cityScores}
            onJumpToCity={(name) => goToCity(name)}
          />

          {/* Inline assistant (no overlay) */}
          <div className="card p-4">
            <AssistantDock context={context} layout="inline" />
          </div>
        </aside>

        {/* Map column */}
        <section>
          <div className="card p-0 overflow-hidden h-[78vh]">
            <CityMap
              center={center}
              zoom={zoom}
              datasets={{ noise, buildings, sensors, heat, traffic }}
              show={show}
              intensity={intensity}
              onZoneDrawn={(poly) => {
                console.log('Zone drawn:', poly);
              }}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import NextDynamic from 'next/dynamic';
import Controls from '@/components/Controls';
import { Sun, Moon } from 'lucide-react';

// Map must be client-only (Leaflet touches window)
const CityMap = NextDynamic(() => import('@/components/CityMap'), { ssr: false });
// Assistant now renders inline in the sidebar
const AssistantDock = NextDynamic(() => import('@/components/AssistantDock'), { ssr: false });

export const dynamic = 'force-dynamic';

type Feature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: { type: string; coordinates: any };
};
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

const PRESETS: Record<string, [number, number, number]> = {
  essaouira: [31.5085, -9.76, 13],
  casablanca: [33.5731, -7.5898, 12],
  madrid: [40.4168, -3.7038, 12],
  nyc: [40.7128, -74.006, 12],
};

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
  const [persona, setPersona] = useState<'citizen' | 'health' | 'investor' | null>(null);

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

  // Assistant context
  const context = useMemo(() => ({
    persona,
    summary: 'Prototype digital twin datasets (synthetic).',
    layers: { noise, buildings, sensors, heat, traffic },
  }), [persona, noise, buildings, sensors, heat, traffic]);

  // Toggles
  const toggle = (k: keyof typeof show) => setShow((s) => ({ ...s, [k]: !s[k] }));

  // Simulations
  const plantTrees = () => {
    if (!noise) return;
    const f = noise.features.map((ft) => ({
      ...ft,
      properties: {
        ...ft.properties,
        level: Math.max(0, Number(ft.properties.level) * (1 - 0.3 * intensity)),
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
  };

  const resetSim = async () => {
    const [n, t] = await Promise.all([
      fetch('/sample-data/noise.geojson').then((r) => r.json()),
      fetch('/sample-data/traffic.geojson').then((r) => r.json()),
    ]);
    setNoise(n); setTraffic(t);
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
        Purpose selector and AI assistant live in the left sidebar. The map has the rest of the screen. No more overlapping.
      </p>

      {/* Two-column layout: sticky sidebar + full map */}
      <section className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        {/* Sidebar (sticky) */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Controls
            // city search
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
            // persona
            persona={persona}
            onPersonaChange={(p) => setPersona(p as any)}
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

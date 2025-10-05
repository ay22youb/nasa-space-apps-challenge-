'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CityMap from '@/components/CityMap';
import Controls from '@/components/Controls';
import AssistantDock from '@/components/AssistantDock';
import { Sun, Moon } from 'lucide-react';

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

const PRESETS: Record<string, [number, number, number]> = {
  essaouira: [31.5085, -9.76, 13],
  casablanca: [33.5731, -7.5898, 12],
  madrid: [40.4168, -3.7038, 12],
  nyc: [40.7128, -74.006, 12],
};

export default function Page() {
  // ====== Core state ======
  const [noise, setNoise] = useState<FeatureCollection | null>(null);
  const [buildings, setBuildings] = useState<FeatureCollection | null>(null);
  const [sensors, setSensors] = useState<FeatureCollection | null>(null);
  const [heat, setHeat] = useState<FeatureCollection | null>(null);
  const [traffic, setTraffic] = useState<FeatureCollection | null>(null);

  const [center, setCenter] = useState<[number, number]>([31.5085, -9.76]); // Essaouira default
  const [zoom, setZoom] = useState(13);
  const [query, setQuery] = useState('');

  // Layers toggle
  const [show, setShow] = useState({ noise: true, buildings: true, sensors: true, heat: true, traffic: true, heatmap: true });

  const [intensity, setIntensity] = useState(0.5);

  // ====== Theme ======
  const [dark, setDark] = useState(true);
  useEffect(() => {
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [dark]);

  // ====== Persona ======
  const [persona, setPersona] = useState<string | null>(null);
  const personas = [
    { id: 'citizen', label: '👤 Normal Citizen' },
    { id: 'health', label: '❤️ Health-Conscious Citizen' },
    { id: 'investor', label: '🏗️ Investor / Planner' },
  ];

  // ====== Load data ======
  useEffect(() => {
    const load = async () => {
      const [n, b, s, h, t] = await Promise.all([
        fetch('/sample-data/noise.geojson').then(r => r.json()),
        fetch('/sample-data/buildings.geojson').then(r => r.json()),
        fetch('/sample-data/sensors.geojson').then(r => r.json()),
        fetch('/sample-data/heat-vulnerability.geojson').then(r => r.json()),
        fetch('/sample-data/traffic.geojson').then(r => r.json()),
      ]);
      setNoise(n); setBuildings(b); setSensors(s); setHeat(h); setTraffic(t);
    };
    load();
  }, []);

  // ====== AI Context ======
  const context = useMemo(() => ({
    persona,
    summary: "Prototype digital twin datasets (synthetic).",
    layers: { noise, buildings, sensors, heat, traffic },
  }), [persona, noise, buildings, sensors, heat, traffic]);

  // ====== Toggles & Simulations ======
  const toggle = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }));

  const plantTrees = () => {
    if (!noise) return;
    const f = noise.features.map(ft => ({
      ...ft,
      properties: {
        ...ft.properties,
        level: Math.max(0, Number(ft.properties.level) * (1 - 0.3 * intensity))
      }
    }));
    setNoise({ ...noise, features: f });
  };

  const calmTraffic = () => {
    if (!traffic) return;
    const f = traffic.features.map(ft => {
      const s = Number(ft.properties.speed_kmh);
      const reduced = s - (s - 30) * 0.2 * intensity;
      return { ...ft, properties: { ...ft.properties, speed_kmh: Math.max(5, Number(reduced.toFixed(1))) } };
    });
    setTraffic({ ...traffic, features: f });
  };

  const resetSim = async () => {
    const [n, t] = await Promise.all([
      fetch('/sample-data/noise.geojson').then(r => r.json()),
      fetch('/sample-data/traffic.geojson').then(r => r.json()),
    ]);
    setNoise(n); setTraffic(t);
  };

  const goToCity = (name: string) => {
    const key = (name || '').toLowerCase().trim();
    const preset = PRESETS[key];
    if (preset) {
      setCenter([preset[0], preset[1]]);
      setZoom(preset[2]);
    }
  };

  // ====== Persona selection modal ======
  const PersonaModal = () => (
    <AnimatePresence>
      {!persona && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="card p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-96 text-center space-y-4"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          >
            <h2 className="text-xl font-bold mb-2">Select Your Purpose</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              What is your purpose for using the dashboard today?
            </p>
            <div className="flex flex-col gap-3">
              {personas.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className="btn py-2 font-semibold hover:scale-[1.03] transition-transform"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ====== Render ======
  return (
    <main className="container py-6 relative">
      <PersonaModal />
      <header className="flex items-center justify-between mb-4">
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold">
          Digital Twin City — <span className="text-indigo-400">Prototype</span>
        </motion.h1>

        <button
          onClick={() => setDark(d => !d)}
          className="btn flex items-center gap-2"
          title="Toggle dark/light mode"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
          {dark ? 'Light' : 'Dark'} Mode
        </button>
      </header>

      <p className="text-white/70 mt-1 mb-4 max-w-3xl">
        Interactive map with togglable layers, heatmap, persona-based simulations, and an AI assistant dock.
      </p>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 520 }}>
        <div className="md:col-span-1">
          <Controls
            query={query}
            onQuery={setQuery}
            onGoToCity={goToCity}
            show={show}
            onToggle={toggle}
            intensity={intensity}
            onIntensity={setIntensity}
            onPlantTrees={plantTrees}
            onCalmTraffic={calmTraffic}
            onReset={resetSim}
          />
        </div>

        <div className="md:col-span-2">
          <div className="card p-2" style={{ height: 520 }}>
            <CityMap
              center={center}
              zoom={zoom}
              datasets={{ noise, buildings, sensors, heat, traffic }}
              show={show}
              intensity={intensity}
            />
          </div>
        </div>
      </section>

      <AssistantDock context={context} />
    </main>
  );
}

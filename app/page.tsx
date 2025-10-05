'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NextDynamic from 'next/dynamic';
import Controls from '@/components/Controls';
import { Sun, Moon } from 'lucide-react';

// Browser-only components (avoid SSR/window issues)
const CityMap = NextDynamic(() => import('@/components/CityMap'), { ssr: false });
const AssistantDock = NextDynamic(() => import('@/components/AssistantDock'), { ssr: false });

// Force this route to be dynamic (no prerender/ISR)
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

  // Persona
  const [persona, setPersona] = useState<string | null>(null);
  const personas = [
    { id: 'citizen', label: '👤 Normal Citizen' },
    { id: 'health', label: '❤️ Health-Conscious Citizen' },
    { id: 'investor', label: '🏗️ Investor / Planner' },
  ];

  // Load data (client only)
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

  // AI context
  const context = useMemo(() => ({
    persona,
    summary: 'Prototype digital twin datasets (synthetic).',
    layers: { noise, buildings, sensors, heat, traffic },
  }), [persona, noise, buildings, sensors, heat, traffic]);

  // Toggles
  const toggle = (k: keyof typeof show) => setShow(s => ({ ...s, [k]: !s[k] }));

  // Simulations
  co

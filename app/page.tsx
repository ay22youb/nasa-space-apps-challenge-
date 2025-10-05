'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Message from '@/components/Message';

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

export default function Page() {
  const [question, setQuestion] = useState('Which area has the highest noise levels?');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi! I am your local AI for the Digital Twin City demo. I can answer questions about noise, buildings, sensors, heat-vulnerability, and traffic — no API key needed.' }
  ]);
  const [loading, setLoading] = useState(false);

  const [noise, setNoise] = useState<FeatureCollection | null>(null);
  const [buildings, setBuildings] = useState<FeatureCollection | null>(null);
  const [sensors, setSensors] = useState<FeatureCollection | null>(null);
  const [heat, setHeat] = useState<FeatureCollection | null>(null);
  const [traffic, setTraffic] = useState<FeatureCollection | null>(null);

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

  const context = useMemo(() => ({ summary: 'Synthetic sample datasets for demo.', layers: { noise, buildings, sensors, heat, traffic } }), [noise, buildings, sensors, heat, traffic]);

  const onAsk = async () => {
    if (!question.trim()) return;
    setMessages(ms => [...ms, { role: 'user', content: question }]);
    setLoading(true);
    setQuestion('');
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context }) });
      const data = await res.json();
      setMessages(ms => [...ms, { role: 'assistant', content: data.answer ?? 'No answer.' }]);
    } catch (e: any) {
      setMessages(ms => [...ms, { role: 'assistant', content: 'Error: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container py-10">
      <header className="mb-8">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-3xl font-bold tracking-tight">
          Digital Twin City — <span className="text-indigo-400">Offline AI</span>
        </motion.h1>
        <p className="text-white/70 mt-2">Ask about noise, buildings, sensors, heat-vulnerability, or traffic. Everything runs on Vercel with no external AI service.</p>
      </header>

      <section className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 md:col-span-2">
          <div className="flex gap-2">
            <input className="input" placeholder="Ask the AI about the city data…" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' ? onAsk() : null} />
            <button disabled={loading} onClick={onAsk} className="btn">{loading ? 'Thinking…' : 'Ask'}</button>
          </div>
          <div className="mt-6">
            {messages.map((m, i) => (<Message key={i} role={m.role} content={m.content} />))}
          </div>
        </motion.div>

        <motion.aside initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <h2 className="font-semibold mb-2">Layers</h2>
          <ul className="space-y-1 text-sm text-white/80">
            <li>🟪 Noise</li><li>🏢 Buildings</li><li>📡 Sensors</li><li>🔥 Heat vulnerability</li><li>🚗 Traffic</li>
          </ul>
          <p className="text-xs text-white/60 mt-4">Replace files in <code>/public/sample-data</code> with your data.</p>
        </motion.aside>
      </section>

      <footer className="text-center text-white/50 text-sm mt-10">Built with Next.js, TailwindCSS and Framer Motion.</footer>
    </main>
  );
}

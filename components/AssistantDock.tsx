'use client';

import { useState } from "react";
import { motion } from "framer-motion";

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AssistantDock({ context }: { context: any }) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: 'Ask about noise, traffic, buildings, sensors, or heat. Simulate changes, then ask again for updated stats.' }
  ]);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!q.trim() || busy) return;
    setMsgs(m => [...m, { role: 'user', content: q }]);
    setBusy(true);
    const question = q;
    setQ('');
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context })
      });
      const data = await res.json();
      setMsgs(m => [...m, { role: 'assistant', content: data.answer ?? 'No answer.' }]);
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'assistant', content: 'Error: ' + e.message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-4 right-4 w-full max-w-md z-40">
      <div className="card p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">AI Assistant</h3>
          <button className="btn px-3 py-1" onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'}</button>
        </div>
        {open && (
          <>
            <div className="h-48 overflow-y-auto space-y-2 pr-1">
              {msgs.map((m, i) => (
                <div key={i} className={`text-sm ${m.role === 'user' ? 'text-indigo-300' : 'text-black/90 dark:text-white/90'}`}>
                  <b>{m.role === 'user' ? 'You' : 'Assistant'}:</b> {m.content}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className="input"
                placeholder="Ask about the map data…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' ? ask() : null}
              />
              <button className="btn" disabled={busy} onClick={ask}>{busy ? '...' : 'Ask'}</button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

'use client';

import { useEffect, useState } from "react";

type Msg = { role: 'user' | 'assistant'; content: string };
type Props = { context: any; layout?: 'inline' | 'floating' };

const SUGGESTIONS = [
  "Summarize current noise and heat.",
  "Which roads are slowest now?",
  "Where should a school go?",
  "Best area for asthma sensitivity?",
];

export default function AssistantDock({ context, layout = 'inline' }: Props) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', content: 'Hi! Ask about noise, heat vulnerability, sensors, or traffic. Run a simulation, then ask again for updated stats.' }
  ]);

  // optional: auto-suggest persona-specific tip
  useEffect(() => {
    if (!context?.persona) return;
    const tip =
      context.persona === 'health'
        ? "Health mode: prioritize lower noise and heat. I can point to the best zones."
        : context.persona === 'investor'
        ? "Investor mode: I’ll balance traffic and noise to suggest feasible areas."
        : "Citizen mode: explore layers freely or ask for a quick city summary.";
    setMsgs(m => (m[0]?.role === 'assistant' ? [{ role: 'assistant', content: tip }, ...m.slice(1)] : m));
  }, [context?.persona]);

  const ask = async (text?: string) => {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    setQ('');
    setMsgs(m => [...m, { role: 'user', content: question }]);
    setBusy(true);
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
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Ask an AI</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="btn px-3 py-1 text-xs" onClick={() => ask(s)}>{s}</button>
        ))}
      </div>

      <div className="h-56 overflow-y-auto space-y-2 pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-indigo-300' : 'text-black/90 dark:text-white/90'}`}>
            <b>{m.role === 'user' ? 'You' : 'Assistant'}:</b> {m.content}
          </div>
        ))}
        {busy && <div className="text-sm text-black/60 dark:text-white/60">Assistant is typing…</div>}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          className="input"
          placeholder="Ask about the map data…"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Enter' ? ask() : null}
        />
        <button className="btn" disabled={busy} onClick={() => ask()}>{busy ? '...' : 'Ask'}</button>
      </div>
    </div>
  );
}

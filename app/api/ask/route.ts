import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type Context = {
  summary: string;
  layers: {
    noise: FeatureCollection | null;
    buildings: FeatureCollection | null;
    sensors: FeatureCollection | null;
    heat: FeatureCollection | null;
    traffic: FeatureCollection | null;
  };
};

function numericArray(values: any[]): number[] {
  return values.map(v => (typeof v === 'number' ? v : Number(v))).filter(v => Number.isFinite(v));
}

function describeStats(values: number[]) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, avg: Number(avg.toFixed(2)) };
}

function answerFromContext(q: string, ctx: Context) {
  const text = q.toLowerCase();

  // Noise questions
  if (text.includes('noise')) {
    const feats = ctx.layers.noise?.features ?? [];
    const pairs = feats.map(f => ({ id: f.properties?.id ?? 'unknown', level: Number(f.properties?.level) }));
    const levels = numericArray(pairs.map(p => p.level));
    const stats = describeStats(levels);
    if (!stats) return 'I could not find noise data.';
    const maxLevel = Math.max(...pairs.map(p => p.level));
    const hottest = pairs.filter(p => p.level === maxLevel).map(p => p.id);
    return `Noise levels — min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg}. Highest noise in: ${hottest.join(', ')}.`;
  }

  // Traffic questions
  if (text.includes('traffic') || text.includes('speed')) {
    const feats = ctx.layers.traffic?.features ?? [];
    const speeds = numericArray(feats.map(f => f.properties?.speed_kmh));
    const stats = describeStats(speeds);
    if (!stats) return 'I could not find traffic data.';
    const minSpeed = Math.min(...speeds);
    const slowest = feats.filter(f => Number(f.properties?.speed_kmh) === minSpeed).map(f => f.properties?.road ?? 'unknown');
    return `Traffic speeds — min: ${stats.min} km/h, max: ${stats.max} km/h, avg: ${stats.avg} km/h. Slowest road(s): ${slowest.join(', ')}.`;
  }

  // Buildings questions
  if (text.includes('building') || text.includes('height') || text.includes('tall')) {
    const feats = ctx.layers.buildings?.features ?? [];
    const list = feats.map(f => ({
      name: f.properties?.name ?? f.properties?.id ?? 'unknown',
      h: Number(f.properties?.height_m)
    }));
    const heights = numericArray(list.map(x => x.h));
    const stats = describeStats(heights);
    if (!stats) return 'I could not find buildings data.';
    const maxH = Math.max(...heights);
    const tallest = list.filter(x => x.h === maxH).map(x => `${x.name} (${x.h} m)`);
    return `Buildings height — min: ${stats.min} m, max: ${stats.max} m, avg: ${stats.avg} m. Tallest: ${tallest.join(', ')}.`;
  }

  // Heat vulnerability
  if (text.includes('heat') || text.includes('vulnerability') || text.includes('hot')) {
    const feats = ctx.layers.heat?.features ?? [];
    const pairs = feats.map(f => ({ zone: String(f.properties?.zone ?? 'unknown'), v: Number(f.properties?.vulnerability) }));
    const vals = numericArray(pairs.map(p => p.v));
    const stats = describeStats(vals);
    if (!stats) return 'I could not find heat-vulnerability data.';
    const maxV = Math.max(...vals);
    const highest = pairs.filter(p => p.v === maxV).map(p => `${p.zone} (${p.v})`);
    return `Heat vulnerability — min: ${stats.min}, max: ${stats.max}, avg: ${stats.avg}. Highest vulnerability in: ${highest.join(', ')}.`;
  }

  // Sensors
  if (text.includes('sensor')) {
    const feats = ctx.layers.sensors?.features ?? [];
    const kinds = feats.reduce<Record<string, number>>((acc, f) => {
      const t = String(f.properties?.type ?? 'unknown');
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const total = feats.length;
    const breakdown = Object.entries(kinds).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `There are ${total} sensors. By type — ${breakdown}.`;
  }

  if (text.includes('summary') || text.includes('overview')) {
    return `Available layers: noise, buildings, sensors, heat vulnerability, and traffic. Ask things like: 
- "Which area has the highest noise levels?"
- "What is the average traffic speed?"
- "Which is the tallest building?"
- "Where is heat vulnerability highest?"`;
  }

  return `I didn't recognize the topic. Try asking about: noise, traffic speeds, building heights, heat vulnerability, or sensors.`;
}

export async function POST(req: NextRequest) {
  try {
    const { question, context } = (await req.json()) as { question: string; context: Context };
    if (!question || !context) return NextResponse.json({ answer: 'Missing question or context.' }, { status: 200 });
    const answer = answerFromContext(question, context);
    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json({ answer: 'Server error: ' + e.message }, { status: 200 });
  }
}

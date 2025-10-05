import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

type Context = {
  persona: string | null;
  summary: string;
  layers: {
    noise: FeatureCollection | null;
    buildings: FeatureCollection | null;
    sensors: FeatureCollection | null;
    heat: FeatureCollection | null;
    traffic: FeatureCollection | null;
  };
};

function numeric(values: any[]): number[] {
  return values.map(v => (typeof v === 'number' ? v : Number(v))).filter(v => Number.isFinite(v));
}
function stats(values: number[]) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { min, max, avg: Number(avg.toFixed(2)) };
}

function baseAnswers(text: string, ctx: Context) {
  const t = text.toLowerCase();

  if (t.includes('noise')) {
    const feats = ctx.layers.noise?.features ?? [];
    const pairs = feats.map(f => ({ id: f.properties?.id ?? 'unknown', level: Number(f.properties?.level) }));
    const levels = numeric(pairs.map(p => p.level));
    const s = stats(levels);
    if (!s) return 'No noise data found.';
    const maxLevel = Math.max(...pairs.map(p => p.level));
    const where = pairs.filter(p => p.level === maxLevel).map(p => p.id);
    return `Noise — min: ${s.min}, max: ${s.max}, avg: ${s.avg}. Highest in: ${where.join(', ')}.`;
  }

  if (t.includes('traffic') || t.includes('speed')) {
    const feats = ctx.layers.traffic?.features ?? [];
    const speeds = numeric(feats.map(f => f.properties?.speed_kmh));
    const s = stats(speeds);
    if (!s) return 'No traffic data found.';
    const minSpeed = Math.min(...speeds);
    const slowest = feats.filter(f => Number(f.properties?.speed_kmh) === minSpeed).map(f => f.properties?.road ?? 'unknown');
    return `Traffic — min: ${s.min} km/h, max: ${s.max} km/h, avg: ${s.avg} km/h. Slowest: ${slowest.join(', ')}.`;
  }

  if (t.includes('building') || t.includes('height') || t.includes('tall')) {
    const feats = ctx.layers.buildings?.features ?? [];
    const list = feats.map(f => ({ name: f.properties?.name ?? f.properties?.id ?? 'unknown', h: Number(f.properties?.height_m) }));
    const heights = numeric(list.map(x => x.h));
    const s = stats(heights);
    if (!s) return 'No buildings data found.';
    const maxH = Math.max(...heights);
    const tallest = list.filter(x => x.h === maxH).map(x => `${x.name} (${x.h} m)`);
    return `Buildings — min: ${s.min} m, max: ${s.max} m, avg: ${s.avg} m. Tallest: ${tallest.join(', ')}.`;
  }

  if (t.includes('heat') || t.includes('vulnerability')) {
    const feats = ctx.layers.heat?.features ?? [];
    const pairs = feats.map(f => ({ zone: String(f.properties?.zone ?? 'unknown'), v: Number(f.properties?.vulnerability) }));
    const vals = numeric(pairs.map(p => p.v));
    const s = stats(vals);
    if (!s) return 'No heat-vulnerability data found.';
    const maxV = Math.max(...vals);
    const worst = pairs.filter(p => p.v === maxV).map(p => `${p.zone} (${p.v})`);
    return `Heat vulnerability — min: ${s.min}, max: ${s.max}, avg: ${s.avg}. Highest: ${worst.join(', ')}.`;
  }

  if (t.includes('sensor')) {
    const feats = ctx.layers.sensors?.features ?? [];
    const kinds = feats.reduce<Record<string, number>>((acc, f) => {
      const typ = String(f.properties?.type ?? 'unknown');
      acc[typ] = (acc[typ] ?? 0) + 1;
      return acc;
    }, {});
    const total = feats.length;
    const breakdown = Object.entries(kinds).map(([k, v]) => `${k}: ${v}`).join(', ');
    return `Sensors: ${total}. Types — ${breakdown}.`;
  }

  if (t.includes('summary') || t.includes('overview')) {
    return `Layers: noise, buildings, sensors, heat vulnerability, traffic. Ask: "highest noise", "average traffic", "tallest building", "worst heat area".`;
  }

  return null;
}

function personaAdvice(ctx: Context) {
  switch (ctx.persona) {
    case 'health':
      return 'Health mode: Prefer areas with lower noise and lower heat vulnerability.';
    case 'investor':
      return 'Investor mode: Favor areas with calmer traffic and moderate noise for schools/housing.';
    default:
      return 'Citizen mode: Explore cities, toggle layers, and draw a zone to focus analysis.';
  }
}

export async function POST(req: NextRequest) {
  try {
    const { question, context } = (await req.json()) as { question: string; context: Context };
    if (!question || !context) return NextResponse.json({ answer: 'Missing question or context.' }, { status: 200 });

    const base = baseAnswers(question, context);
    if (base) return NextResponse.json({ answer: `${base}\n\n${personaAdvice(context)}` });

    // Fallback generic
    return NextResponse.json({
      answer: `I didn't recognize the topic. Try noise, traffic speeds, building heights, heat vulnerability, or sensors.\n\n${personaAdvice(context)}`
    });
  } catch (e: any) {
    return NextResponse.json({ answer: 'Server error: ' + e.message }, { status: 200 });
  }
}

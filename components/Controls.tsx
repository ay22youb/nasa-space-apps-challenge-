'use client';

type Show = { noise: boolean; buildings: boolean; sensors: boolean; heat: boolean; traffic: boolean; heatmap: boolean; };

type Props = {
  query: string;
  onQuery: (v: string) => void;
  onGoToCity: (name: string) => void;

  show: Show;
  onToggle: (key: keyof Show) => void;

  intensity: number;
  onIntensity: (v: number) => void;

  onPlantTrees: () => void;
  onCalmTraffic: () => void;
  onReset: () => void;

  // Optional persona-specific inputs (extend later if needed)
  persona?: string | null;
};

export default function Controls({
  query, onQuery, onGoToCity,
  show, onToggle,
  intensity, onIntensity,
  onPlantTrees, onCalmTraffic, onReset,
  persona
}: Props) {

  const go = () => {
    const q = query.trim();
    if (!q) return;
    onGoToCity(q);
  };

  return (
    <div className="card p-4 h-full flex flex-col gap-4">
      <div>
        <h2 className="font-bold mb-2">CONTROLS</h2>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search city (Essaouira, Casablanca, Madrid, NYC…) or any place"
            value={query}
            onChange={e => onQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' ? go() : null}
          />
          <button className="btn" onClick={go}>Go</button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">LAYERS</h3>
        {(["noise","buildings","sensors","heat","traffic","heatmap"] as const).map(k => (
          <label key={k} className="flex items-center gap-2 text-black/80 dark:text-white/90 py-1">
            <input type="checkbox" checked={show[k]} onChange={() => onToggle(k)} />
            <span className="capitalize">
              {k === "heat" ? "heat vulnerability" : k === "heatmap" ? "heatmap (from noise)" : k}
            </span>
          </label>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">SIMULATIONS</h3>
        <label className="block text-sm text-black/70 dark:text-white/70 mb-1">Intensity: {intensity.toFixed(2)}</label>
        <input
          type="range"
          min={0} max={1} step={0.01}
          value={intensity}
          onChange={e => onIntensity(Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-3 flex flex-col gap-2">
          <button className="btn" onClick={onPlantTrees}>🌳 Plant More Trees</button>
          <button className="btn" onClick={onCalmTraffic}>🚗 Calm Traffic</button>
          <button className="btn border-red-400 text-red-300" onClick={onReset}>Reset Simulation</button>
        </div>
      </div>

      {persona === 'health' && (
        <div>
          <h3 className="font-semibold mb-2">HEALTH MODE</h3>
          <p className="text-sm text-black/70 dark:text-white/70">
            Tip: Lower noise & lower heat vulnerability are better for asthma/heat sensitivity.
          </p>
        </div>
      )}
      {persona === 'investor' && (
        <div>
          <h3 className="font-semibold mb-2">INVESTOR MODE</h3>
          <p className="text-sm text-black/70 dark:text-white/70">
            Tip: Look for areas with calmer traffic and moderate noise for schools/housing.
          </p>
        </div>
      )}
    </div>
  );
}

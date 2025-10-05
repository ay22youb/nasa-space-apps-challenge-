'use client';

import { useEffect, useRef } from 'react';
import L, { Map as LMap, GeoJSON as LGeoJSON } from 'leaflet';

type LatLng = [number, number];

type Feature = {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: { type: string; coordinates: any };
};
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] } | null;

type ShowFlags = {
  noise: boolean;
  buildings: boolean;
  sensors: boolean;
  heat: boolean;
  traffic: boolean;
  heatmap: boolean; // we’ll render via same noise styling for now
};

type Props = {
  center: LatLng;
  zoom: number;
  datasets: {
    noise: FeatureCollection;
    buildings: FeatureCollection;
    sensors: FeatureCollection;
    heat: FeatureCollection;
    traffic: FeatureCollection;
  };
  show: ShowFlags;
  intensity: number;
  onZoneDrawn?: (polygon: any) => void; // kept for future
};

export default function CityMap({ center, zoom, datasets, show }: Props) {
  const mapRef = useRef<LMap | null>(null);

  // Keep references to active layers so we can cleanly remove & re-add on change
  const layersRef = useRef<{
    base?: L.TileLayer;
    noise?: LGeoJSON;
    heat?: LGeoJSON;
    traffic?: LGeoJSON;
    sensors?: LGeoJSON;
    buildings?: LGeoJSON;
  }>({});

  // ---------- color helpers ----------
  const colorNoise = (level: number) => {
    // 0..100 (lower is better)
    if (level >= 75) return '#ef4444'; // red
    if (level >= 60) return '#f97316'; // orange
    if (level >= 40) return '#f59e0b'; // amber
    return '#10b981';                  // green
  };
  const colorHeat = (val: number) => {
    // 0..100 risk-like
    if (val >= 75) return '#b91c1c';   // darker red
    if (val >= 60) return '#f97316';   // orange
    if (val >= 40) return '#f59e0b';   // amber
    return '#22c55e';                  // green
  };
  const colorTraffic = (speed: number) => {
    // slower = “worse”
    if (speed <= 20) return '#ef4444';
    if (speed <= 35) return '#f97316';
    if (speed <= 50) return '#f59e0b';
    return '#10b981';
  };

  // ---------- INIT MAP (once) ----------
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('map-root', {
      center,
      zoom,
      zoomControl: true,
    });

    const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    layersRef.current.base = base;
    mapRef.current = map;

    // Make sure the map sizes correctly
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------- UPDATE VIEW when center/zoom changes ----------
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // ---------- RENDER / RE-RENDER LAYERS when datasets or show flags change ----------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // helper to remove a layer if exists
    const removeIf = (layer?: LGeoJSON) => {
      if (layer) {
        map.removeLayer(layer);
      }
    };

    // 1) NOISE polygons (also used as “heatmap” visual)
    removeIf(layersRef.current.noise);
    if (show.noise && datasets.noise) {
      layersRef.current.noise = L.geoJSON(datasets.noise as any, {
        style: (feat: any) => {
          const lvl = Number(feat?.properties?.level ?? feat?.properties?.value ?? 50);
          return {
            color: '#00000020',
            weight: 1,
            fillColor: colorNoise(lvl),
            fillOpacity: 0.45,
          };
        },
        onEachFeature: (feat, layer) => {
          const lvl = Number((feat as any)?.properties?.level ?? 0);
          (layer as any).bindPopup(`Noise level: <b>${lvl}</b>`);
        },
      }).addTo(map);
    }

    // 2) HEAT polygons
    removeIf(layersRef.current.heat);
    if (show.heat && datasets.heat) {
      layersRef.current.heat = L.geoJSON(datasets.heat as any, {
        style: (feat: any) => {
          const h = Number(
            feat?.properties?.score ??
            feat?.properties?.index ??
            feat?.properties?.value ??
            50
          );
          return {
            color: '#00000020',
            weight: 1,
            fillColor: colorHeat(h),
            fillOpacity: 0.35,
          };
        },
        onEachFeature: (feat, layer) => {
          const h = Number((feat as any)?.properties?.score ?? 0);
          (layer as any).bindPopup(`Heat vulnerability: <b>${h}</b>`);
        },
      }).addTo(map);
    }

    // 3) TRAFFIC lines
    removeIf(layersRef.current.traffic);
    if (show.traffic && datasets.traffic) {
      layersRef.current.traffic = L.geoJSON(datasets.traffic as any, {
        style: (feat: any) => {
          const s = Number(feat?.properties?.speed_kmh ?? 30);
          return {
            color: colorTraffic(s),
            weight: 3,
            opacity: 0.9,
          };
        },
        onEachFeature: (feat, layer) => {
          const s = Number((feat as any)?.properties?.speed_kmh ?? 0);
          (layer as any).bindPopup(`Traffic speed: <b>${s} km/h</b>`);
        },
      }).addTo(map);
    }

    // 4) BUILDINGS polygons/lines/points
    removeIf(layersRef.current.buildings);
    if (show.buildings && datasets.buildings) {
      layersRef.current.buildings = L.geoJSON(datasets.buildings as any, {
        style: {
          color: '#64748b', // slate-500
          weight: 1,
          fillColor: '#94a3b8', // slate-400
          fillOpacity: 0.2,
        },
        pointToLayer: (_feat, latlng) => L.circleMarker(latlng, {
          radius: 3,
          color: '#64748b',
          weight: 1,
          fillColor: '#94a3b8',
          fillOpacity: 0.6,
        }),
      }).addTo(map);
    }

    // 5) SENSORS points
    removeIf(layersRef.current.sensors);
    if (show.sensors && datasets.sensors) {
      layersRef.current.sensors = L.geoJSON(datasets.sensors as any, {
        pointToLayer: (feat: any, latlng) => {
          const type = String(feat?.properties?.type ?? 'sensor');
          const val = Number(feat?.properties?.value ?? 0);
          return L.circleMarker(latlng, {
            radius: 4,
            color: '#0ea5e9', // sky-500
            weight: 2,
            fillColor: '#38bdf8', // sky-400
            fillOpacity: 0.9,
          }).bindPopup(`${type}: <b>${val}</b>`);
        },
      }).addTo(map);
    }

    // Note: show.heatmap flag could be used to overlay a different viz (e.g., leaflet.heat).
    // For now, we use the same noise choropleth as the heatmap visual when "noise" is on.

    // Cleanup function when ANY dependency changes
    return () => {
      removeIf(layersRef.current.noise);
      removeIf(layersRef.current.heat);
      removeIf(layersRef.current.traffic);
      removeIf(layersRef.current.buildings);
      removeIf(layersRef.current.sensors);
      layersRef.current.noise = undefined;
      layersRef.current.heat = undefined;
      layersRef.current.traffic = undefined;
      layersRef.current.buildings = undefined;
      layersRef.current.sensors = undefined;
    };
  }, [
    datasets.noise,
    datasets.heat,
    datasets.traffic,
    datasets.buildings,
    datasets.sensors,
    show.noise,
    show.heat,
    show.traffic,
    show.buildings,
    show.sensors,
    show.heatmap,
  ]);

  return <div id="map-root" className="w-full h-full min-h-[60vh]" />;
}

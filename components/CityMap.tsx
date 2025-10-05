'use client';

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  LayersControl,
  useMap
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet-draw";
import HeatmapLayer from "./HeatmapLayer";

type Feature = { type: 'Feature'; properties: Record<string, any>; geometry: { type: string; coordinates: any } };
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] };

export type CityMapProps = {
  center: LatLngExpression;
  zoom: number;
  datasets: {
    noise: FeatureCollection | null;
    buildings: FeatureCollection | null;
    sensors: FeatureCollection | null;
    heat: FeatureCollection | null;
    traffic: FeatureCollection | null;
  };
  show: { noise: boolean; buildings: boolean; sensors: boolean; heat: boolean; traffic: boolean; heatmap: boolean; };
  intensity: number;
  onZoneDrawn?: (polygonGeoJSON: any) => void;
};

function SetupIcons() {
  useEffect(() => {
    const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
    const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
    const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
    L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });
  }, []);
  return null;
}

function DrawControl({ onZoneDrawn }: { onZoneDrawn?: (polygon: any) => void }) {
  const map = useMap();
  const drawnRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    drawnRef.current = new L.FeatureGroup();
    map.addLayer(drawnRef.current);

    const drawControl = new (L as any).Control.Draw({
      draw: {
        polygon: true,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false
      },
      edit: { featureGroup: drawnRef.current }
    });
    map.addControl(drawControl as any);

    function created(e: any) {
      const layer = e.layer as L.Polygon;
      drawnRef.current?.addLayer(layer);
      const gj = layer.toGeoJSON();
      onZoneDrawn?.(gj);
    }
    map.on(L.Draw.Event.CREATED, created);

    return () => {
      map.off(L.Draw.Event.CREATED, created);
      try { map.removeControl(drawControl as any); } catch {}
      if (drawnRef.current) {
        try { map.removeLayer(drawnRef.current); } catch {}
      }
    };
  }, [map, onZoneDrawn]);

  return null;
}

export default function CityMap({ center, zoom, datasets, show, intensity, onZoneDrawn }: CityMapProps) {
  // color helper
  const colormap = (t: number) => {
    const r = Math.round(255 * t);
    const g = Math.round(255 * (1 - t));
    return `rgb(${r},${g},80)`;
  };

  // Heatmap points from Noise centroids
  const heatPoints = useMemo(() => {
    if (!datasets.noise || !datasets.noise.features.length) return [] as [number, number, number][];
    const levels = datasets.noise.features.map(f => Number(f.properties?.level ?? 0));
    const max = Math.max(1, ...levels);

    const centroid = (coords: any[]): [number, number] | null => {
      const ring = coords?.[0];
      if (!Array.isArray(ring) || ring.length < 3) return null;
      let x = 0, y = 0;
      for (const pt of ring) { x += pt[0]; y += pt[1]; }
      return [y / ring.length, x / ring.length];
    };

    const pts: [number, number, number][] = [];
    for (const f of datasets.noise.features) {
      if (f.geometry?.type !== "Polygon") continue;
      const c = centroid(f.geometry.coordinates);
      if (!c) continue;
      const lvl = Number(f.properties?.level ?? 0);
      const t = Math.min(1, (lvl / max) * (0.5 + 0.5 * intensity));
      pts.push([c[0], c[1], t]);
    }
    return pts;
  }, [datasets.noise, intensity]);

  const noiseLayer = useMemo(() => {
    if (!datasets.noise || !show.noise) return null;
    const vals = datasets.noise.features.map(f => Number(f.properties?.level ?? 0));
    const max = Math.max(1, ...vals);
    return (
      <GeoJSON
        data={datasets.noise as any}
        style={(f: any) => {
          const lvl = Number(f.properties?.level ?? 0);
          const t = Math.min(1, (lvl / max) * (0.5 + intensity * 0.5));
          return { color: "#ffffff88", weight: 1, fillColor: colormap(t), fillOpacity: 0.45 + 0.4 * intensity };
        }}
        onEachFeature={(feature, layer) => layer.bindPopup(`Noise: <b>${feature.properties?.level}</b>`)}
      />
    );
  }, [datasets.noise, intensity, show.noise]);

  const buildingsLayer = useMemo(() => {
    if (!datasets.buildings || !show.buildings) return null;
    return (
      <GeoJSON
        data={datasets.buildings as any}
        style={() => ({ color: "#9ca3af", weight: 1, fillColor: "#6b7280", fillOpacity: 0.25 })}
        onEachFeature={(feature, layer) => {
          const nm = feature.properties?.name ?? feature.properties?.id;
          const h  = feature.properties?.height_m;
          layer.bindPopup(`Building: <b>${nm}</b><br/>Height: ${h} m`);
        }}
      />
    );
  }, [datasets.buildings, show.buildings]);

  const sensorsLayer = useMemo(() => {
    if (!datasets.sensors || !show.sensors) return null;
    return (
      <>
        {datasets.sensors.features.map((f, i) => {
          const [lng, lat] = f.geometry.coordinates;
          return (
            <Marker key={i} position={[lat, lng] as any}>
              <Popup>
                Sensor <b>{f.properties?.id}</b><br/>
                Type: {String(f.properties?.type)}<br/>
                Reading: {String(f.properties?.reading ?? "—")}
              </Popup>
            </Marker>
          );
        })}
      </>
    );
  }, [datasets.sensors, show.sensors]);

  const heatLayer = useMemo(() => {
    if (!datasets.heat || !show.heat) return null;
    const vals = datasets.heat.features.map(f => Number(f.properties?.vulnerability ?? 0));
    const max = Math.max(1, ...vals);
    return (
      <GeoJSON
        data={datasets.heat as any}
        style={(f: any) => {
          const v = Number(f.properties?.vulnerability ?? 0);
          const t = Math.min(1, (v / max) * (0.5 + intensity * 0.5));
          return { color: "#ffffff55", weight: 1, fillColor: colormap(t), fillOpacity: 0.35 + 0.4 * intensity };
        }}
        onEachFeature={(feature, layer) => layer.bindPopup(`Heat vulnerability: <b>${feature.properties?.vulnerability}</b>`)}
      />
    );
  }, [datasets.heat, intensity, show.heat]);

  const trafficLayer = useMemo(() => {
    if (!datasets.traffic || !show.traffic) return null;
    const speeds = datasets.traffic.features.map(f => Number(f.properties?.speed_kmh ?? 0));
    const max = Math.max(1, ...speeds);
    return (
      <GeoJSON
        data={datasets.traffic as any}
        style={(f: any) => {
          const s = Number(f.properties?.speed_kmh ?? 0);
          const t = 1 - Math.min(1, s / max);
          return { color: colormap(t * (0.5 + 0.5 * intensity)), weight: 3 };
        }}
        onEachFeature={(feature, layer) => layer.bindPopup(`Road: <b>${feature.properties?.road}</b><br/>Speed: ${feature.properties?.speed_kmh} km/h`)}
      />
    );
  }, [datasets.traffic, intensity, show.traffic]);

  return (
    <MapContainer center={center} zoom={zoom} style={{ width: "100%", height: "100%", borderRadius: 16 }}>
      <SetupIcons />
      <DrawControl onZoneDrawn={onZoneDrawn} />
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LayersControl position="topright">
        {noiseLayer && <LayersControl.Overlay checked name="Noise">{noiseLayer}</LayersControl.Overlay>}
        {buildingsLayer && <LayersControl.Overlay checked name="Buildings">{buildingsLayer}</LayersControl.Overlay>}
        {sensorsLayer && <LayersControl.Overlay checked name="Sensors">{sensorsLayer}</LayersControl.Overlay>}
        {heatLayer && <LayersControl.Overlay checked name="Heat Vulnerability">{heatLayer}</LayersControl.Overlay>}
        {trafficLayer && <LayersControl.Overlay checked name="Traffic">{trafficLayer}</LayersControl.Overlay>}
        {show.heatmap && heatPoints.length > 0 && (
          <LayersControl.Overlay checked name="Heatmap (from Noise)">
            <HeatmapLayer points={heatPoints} radius={28} blur={18} minOpacity={0.25} max={1.0} />
          </LayersControl.Overlay>
        )}
      </LayersControl>
    </MapContainer>
  );
}

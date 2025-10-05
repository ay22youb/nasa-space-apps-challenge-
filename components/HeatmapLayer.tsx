'use client';

import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

type HeatPoint = [number, number, number]; // [lat, lng, intensity 0..1]

export default function HeatmapLayer({
  points,
  radius = 25,
  blur = 15,
  maxZoom = 17,
  minOpacity = 0.3,
  max = 1.0
}: {
  points: HeatPoint[];
  radius?: number;
  blur?: number;
  maxZoom?: number;
  minOpacity?: number;
  max?: number;
}) {
  const map = useMap();
  const data = useMemo(() => points ?? [], [points]);

  useEffect(() => {
    if (!map || !data?.length) return;
    const layer = (L as any).heatLayer(data, { radius, blur, maxZoom, minOpacity, max }).addTo(map);
    return () => { try { map.removeLayer(layer); } catch {} };
  }, [map, data, radius, blur, maxZoom, minOpacity, max]);

  return null;
}

'use client';

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ChargingStation } from '@/lib/api';

// TODO: заменить style-url на тайлы 2GIS/Яндекс — MapLibre поддерживает любой
// совместимый с MapTiler/MapBox стиль-JSON. Для старта можно взять
// демо-стиль или self-hosted тайлы (Google Maps в РФ работает нестабильно).
const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json';
const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558]; // Москва

export default function Map({ stations }: { stations: ChargingStation[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      center: DEFAULT_CENTER,
      zoom: 10,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl());

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const markers: maplibregl.Marker[] = [];

    stations.forEach((station) => {
      const color =
        station.status === 'working' ? '#00C48C' : station.status === 'broken' ? '#EF4444' : '#9CA3AF';

      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(
        `<strong>${station.name}</strong><br/>${station.address ?? ''}<br/>Статус: ${station.status}`,
      );

      const marker = new maplibregl.Marker({ color })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markers.push(marker);
    });

    return () => markers.forEach((m) => m.remove());
  }, [stations]);

  return <div ref={containerRef} className="w-full h-[600px] rounded-xl overflow-hidden border" />;
}

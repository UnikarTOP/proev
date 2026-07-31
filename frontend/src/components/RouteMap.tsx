'use client';

import { useEffect, useRef } from 'react';

interface Props {
  from: { lat: number; lon: number; name: string };
  to: { lat: number; lon: number; name: string };
  routePoints?: [number, number][];
  stops?: number[]; // км от старта
}

export default function RouteMap({ from, to, routePoints, stops }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || typeof window === 'undefined') return;
    if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }

    import('maplibre-gl').then(({ default: maplibregl }) => {
      const bounds: [[number, number], [number, number]] = [
        [Math.min(from.lon, to.lon) - 0.5, Math.min(from.lat, to.lat) - 0.3],
        [Math.max(from.lon, to.lon) + 0.5, Math.max(from.lat, to.lat) + 0.3],
      ];

      const map = new maplibregl.Map({
        container: mapRef.current!,
        style: {
          version: 8,
          sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        bounds,
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
        interactive: false,
      });

      map.on('load', () => {
        // Линия маршрута
        if (routePoints && routePoints.length > 1) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: routePoints.map(([lat, lon]) => [lon, lat]),
              },
              properties: {},
            },
          });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#0BA5CC', 'line-width': 4, 'line-opacity': 0.9 } });
        } else {
          // Прямая линия если нет маршрута
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: [[from.lon, from.lat], [to.lon, to.lat]] },
              properties: {},
            },
          });
          map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#0BA5CC', 'line-width': 3, 'line-dasharray': [2, 2] } });
        }

        // Маркер старта
        new maplibregl.Marker({ color: '#22C55E' })
          .setLngLat([from.lon, from.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText(from.name))
          .addTo(map);

        // Маркер финиша
        new maplibregl.Marker({ color: '#EF4444' })
          .setLngLat([to.lon, to.lat])
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText(to.name))
          .addTo(map);
      });

      mapInstance.current = map;
    }).catch(() => {});

    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, [from.lat, from.lon, to.lat, to.lon, routePoints]);

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #DCE1E8' }}>
      <div ref={mapRef} style={{ height: 220 }} />
      <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: '2px 8px', fontSize: 10, color: '#6B7686' }}>
        © OpenStreetMap
      </div>
    </div>
  );
}

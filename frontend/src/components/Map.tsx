'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ChargingStation } from '@/lib/api';

const DEFAULT_CENTER: [number, number] = [37.6173, 55.7558];

const STATUS_COLOR: Record<string, string> = {
  working: '#1D9E75',
  broken:  '#E24B4A',
  unknown: '#B4B2A9',
};

const STATUS_LABEL: Record<string, string> = {
  working: 'Работает',
  broken:  'Сломана',
  unknown: 'Нет данных',
};

const SPEED_LABEL: Record<string, string> = {
  slow:       'Медленная (< 22 кВт)',
  fast:       'Быстрая (22–49 кВт)',
  ultra_fast: 'Ультрабыстрая (50+ кВт)',
};

// Строим стиль MapLibre в зависимости от провайдера.
// Яндекс.Карты используем через растровые тайлы — JS API Яндекса
// не совместим с WebGL-рендерером MapLibre напрямую, поэтому
// берём их tile-сервер как raster-источник.
function buildMapStyle(provider: string, yandexApiKey: string | null) {
  let tileUrl: string;
  let attribution: string;

  switch (provider) {
    case 'yandex':
      // Яндекс.Карты растровые тайлы — требует apikey
      tileUrl = yandexApiKey
        ? `https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=23.04.12-0&x={x}&y={y}&z={z}&scale=2&lang=ru_RU&apikey=${yandexApiKey}`
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = yandexApiKey
        ? '© <a href="https://yandex.ru/maps">Яндекс.Карты</a>'
        : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
      break;
    case '2gis':
      tileUrl = 'https://tile2.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1';
      attribution = '© <a href="https://2gis.ru">2GIS</a>';
      break;
    case 'osm':
    default:
      tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  }

  return {
    version: 8 as const,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      tiles: {
        type: 'raster' as const,
        tiles: [tileUrl],
        tileSize: 256,
        attribution,
      },
    },
    layers: [{ id: 'background', type: 'raster' as const, source: 'tiles' }],
  };
}

interface Props {
  stations: ChargingStation[];
  mapProvider?: string;
  yandexApiKey?: string | null;
}

export default function Map({ stations, mapProvider = 'osm', yandexApiKey = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  const [selected, setSelected]             = useState<ChargingStation | null>(null);
  const [filterStatus, setFilterStatus]     = useState<string>('all');
  const [filterConnector, setFilterConnector] = useState<string>('all');
  const [filterSpeed, setFilterSpeed]       = useState<string>('all');

  const allConnectors = Array.from(
    new Set(stations.flatMap((s) => s.connectorTypes))
  ).sort();

  const filtered = stations.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterConnector !== 'all' && !s.connectorTypes.includes(filterConnector)) return false;
    if (filterSpeed !== 'all' && s.chargingSpeed !== filterSpeed) return false;
    return true;
  });

  const toGeoJSON = useCallback((list: ChargingStation[]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: list.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      properties: {
        id:             s.id,
        name:           s.name,
        status:         s.status,
        color:          STATUS_COLOR[s.status] ?? STATUS_COLOR.unknown,
        chargingSpeed:  s.chargingSpeed,
        connectorTypes: s.connectorTypes.join(', '),
        address:        s.address ?? '',
        city:           s.city ?? '',
        networkOperator: s.networkOperator ?? '',
      },
    })),
  }), []);

  // Инициализация карты
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(mapProvider, yandexApiKey),
      center: DEFAULT_CENTER,
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
    }), 'top-right');

    map.on('load', () => {
      map.addSource('stations', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 50,
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#0BA5CC',
          'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 50, 30],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff' },
      });

      map.addLayer({
        id: 'unclustered',
        type: 'circle',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      });

      // Сразу грузим данные если уже есть
      (map.getSource('stations') as maplibregl.GeoJSONSource)?.setData(toGeoJSON(filtered));

      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (!clusterId) return;
        (map.getSource('stations') as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => map.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom,
          }));
      });

      map.on('click', 'unclustered', (e) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        const station = stations.find((s) => s.id === props.id);
        if (station) setSelected(station);
      });

      map.on('mouseenter', 'clusters',    () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'clusters',    () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'unclustered', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'unclustered', () => { map.getCanvas().style.cursor = ''; });
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapProvider, yandexApiKey]);

  // Обновление данных при смене фильтров
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('stations') as maplibregl.GeoJSONSource | undefined;
    src?.setData(toGeoJSON(filtered));
  }, [filtered, toGeoJSON]);

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      mapRef.current?.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 12,
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Фильтры */}
      <div className="flex flex-wrap gap-3 items-center">
        <FilterSelect
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all',     label: 'Все статусы' },
            { value: 'working', label: '🟢 Работает' },
            { value: 'broken',  label: '🔴 Сломана' },
            { value: 'unknown', label: '⚪ Нет данных' },
          ]}
        />
        <FilterSelect
          value={filterConnector}
          onChange={setFilterConnector}
          options={[
            { value: 'all', label: 'Все разъёмы' },
            ...allConnectors.map((c) => ({ value: c, label: c })),
          ]}
        />
        <FilterSelect
          value={filterSpeed}
          onChange={setFilterSpeed}
          options={[
            { value: 'all',        label: 'Любая скорость' },
            { value: 'ultra_fast', label: '⚡ Быстрая 50+ кВт' },
            { value: 'fast',       label: '⚡ 22–49 кВт' },
            { value: 'slow',       label: '🐢 До 22 кВт' },
          ]}
        />
        <button
          onClick={handleLocate}
          className="ml-auto flex items-center gap-1.5 text-sm font-medium text-volt-600 border border-volt-600 rounded-lg px-3 py-2 hover:bg-volt-600/10 transition-colors"
        >
          📍 Рядом со мной
        </button>
        <span className="text-sm text-muted">{filtered.length} станций</span>
      </div>

      {/* Карта + боковая панель */}
      <div className="flex gap-4">
        <div
          ref={containerRef}
          className="flex-1 rounded-xl overflow-hidden border border-line"
          style={{ height: 560 }}
        />

        {selected && (
          <div className="w-72 shrink-0 bg-white border border-line rounded-xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-ink-900 text-sm leading-snug pr-2">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-ink-900 text-lg leading-none">×</button>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[selected.status] }} />
              <span className="text-sm font-medium" style={{ color: STATUS_COLOR[selected.status] }}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-muted">
              {selected.networkOperator && <div><span className="text-graphite-900">Оператор:</span> {selected.networkOperator}</div>}
              {selected.city    && <div><span className="text-graphite-900">Город:</span> {selected.city}</div>}
              {selected.address && <div><span className="text-graphite-900">Адрес:</span> {selected.address}</div>}
              {selected.chargingSpeed && <div><span className="text-graphite-900">Скорость:</span> {SPEED_LABEL[selected.chargingSpeed]}</div>}
              {selected.connectorTypes.length > 0 && (
                <div><span className="text-graphite-900">Разъёмы:</span> <span className="font-mono">{selected.connectorTypes.join(', ')}</span></div>
              )}
            </div>

            <button
              onClick={() => mapRef.current?.flyTo({ center: [selected.longitude, selected.latitude], zoom: 15 })}
              className="text-xs text-center text-volt-600 border border-volt-600 rounded-lg py-1.5 hover:bg-volt-600/10 transition-colors"
            >
              Показать на карте
            </button>
          </div>
        )}
      </div>

      {/* Легенда */}
      <div className="flex gap-4 text-xs text-muted">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            {STATUS_LABEL[status]}
          </div>
        ))}
        <span className="ml-auto opacity-60">
          {mapProvider === 'yandex' ? '© Яндекс.Карты' : mapProvider === '2gis' ? '© 2GIS' : '© OpenStreetMap'}
        </span>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-line rounded-lg px-3 py-2 bg-white text-graphite-900 focus:outline-none focus:border-volt-600"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

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
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{
              background: 'var(--surface-2,#fff)',
              border: '0.5px solid #DCE1E8',
              borderRadius: 16,
              overflow: 'hidden',
              fontFamily: 'Golos Text, sans-serif',
            }}>

              {/* Заголовок */}
              <div style={{ padding: '14px 14px 10px', borderBottom: '0.5px solid #DCE1E8' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#10192B', lineHeight: 1.3 }}>{selected.name}</div>
                    {(selected.city || selected.address) && (
                      <div style={{ fontSize: 11, color: '#6B7686', marginTop: 3 }}>
                        {[selected.city, selected.address].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    style={{ background: 'none', border: 'none', color: '#B4B2A9', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>

                {/* Статус + время */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: selected.status === 'working' ? '#e6f7f0' : selected.status === 'broken' ? '#fdf0f0' : '#f5f5f4',
                    borderRadius: 20, padding: '4px 10px',
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: STATUS_COLOR[selected.status],
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: 500,
                      color: selected.status === 'working' ? '#0F6E56' : selected.status === 'broken' ? '#A32D2D' : '#5F5E5A',
                    }}>
                      {STATUS_LABEL[selected.status]}
                    </span>
                  </div>
                  {selected.networkOperator && (
                    <span style={{ fontSize: 11, color: '#6B7686' }}>{selected.networkOperator}</span>
                  )}
                </div>
              </div>

              {/* Коннекторы */}
              {selected.connectorTypes.length > 0 && (
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #DCE1E8' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7686', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Коннекторы</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selected.connectorTypes.map((c) => (
                      <div key={c} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: '#F5F7FA', border: '0.5px solid #DCE1E8',
                        borderRadius: 10, padding: '7px 10px',
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2" strokeLinecap="round">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#10192B' }}>{c}</div>
                          {selected.powerKw ? (
                            <div style={{ fontSize: 10, color: '#6B7686' }}>до {selected.powerKw} кВт · {selected.chargingSpeed === 'slow' ? 'AC' : 'DC'}</div>
                          ) : (
                            <div style={{ fontSize: 10, color: '#6B7686' }}>{SPEED_LABEL[selected.chargingSpeed]}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[selected.status] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Кнопки */}
              <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                <button
                  onClick={() => mapRef.current?.flyTo({ center: [selected.longitude, selected.latitude], zoom: 16 })}
                  style={{
                    flex: 1, background: '#0BA5CC', color: '#fff', border: 'none',
                    borderRadius: 10, padding: '9px 8px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polygon points="3,11 22,2 13,21 11,13 3,11"/>
                  </svg>
                  На карте
                </button>
                <button
                  style={{
                    flex: 1, background: '#F5F7FA', color: '#10192B', border: '0.5px solid #DCE1E8',
                    borderRadius: 10, padding: '9px 8px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Отзыв
                </button>
              </div>

            </div>
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

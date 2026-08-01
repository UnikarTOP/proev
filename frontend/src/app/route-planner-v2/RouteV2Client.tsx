'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GeoPoint } from '@/lib/routing';

const AddressSearchInput = dynamic(() => import('@/components/AddressSearchInput'), { ssr: false });

interface EVModel {
  id: string; brand: string; model: string; year: number;
  range: number; consumption: number; battery: number;
  connector: string; maxChargeDC: number;
}

interface Station {
  id: string; name: string; address?: string;
  latitude: number; longitude: number;
  connectorTypes: string[]; status: string;
  distanceKm: number; progress: number;
}

interface Stop {
  station: Station;
  arrivalCharge: number;   // % заряда при прибытии
  departureCharge: number; // % заряда при отправлении
  chargeTimeMin: number;
  kmFromStart: number;
}

interface RouteResult {
  distance: number;
  consumption: number;
  stops: Stop[];
  driveTimeMin: number;
  chargingTimeMin: number;
  totalTimeMin: number;
  energyNeeded: number;
  canComplete: boolean;
  message: string;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function speedFactor(s: number) {
  if (s <= 80) return 0.92; if (s <= 90) return 1.0; if (s <= 100) return 1.10;
  if (s <= 110) return 1.22; if (s <= 120) return 1.37; return 1.55;
}
function seasonFactor(s: string) { return s === 'winter' ? 1.40 : s === 'summer' ? 1.10 : 1.15; }

const fmtTime = (m: number) => { const h = Math.floor(m/60); const mm = m%60; return h > 0 ? `${h} ч${mm > 0 ? ` ${mm} мин` : ''}` : `${mm} мин`; };

const CONNECTOR_LABELS: Record<string, string> = {
  GBT: 'GB/T', CCS2: 'CCS2', CHAdeMO: 'CHAdeMO', Type2: 'Type 2', Type1: 'Type 1'
};

export default function RouteV2Client() {
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const [brands, setBrands] = useState<string[]>([]);
  const [allModels, setAllModels] = useState<EVModel[]>([]);
  const [brand, setBrand] = useState('');
  const [models, setModels] = useState<EVModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<EVModel | null>(null);

  const [from, setFrom] = useState('');
  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [to, setTo] = useState('');
  const [toPoint, setToPoint] = useState<GeoPoint | null>(null);

  const [chargeLevel, setChargeLevel] = useState(90);
  const [minCharge, setMinCharge] = useState(15);
  const [targetCharge, setTargetCharge] = useState(78);
  const [speed, setSpeed] = useState(100);
  const [season, setSeason] = useState('mixed');
  const [corridor, setCorridor] = useState(25); // км от прямой

  const [stations, setStations] = useState<Station[]>([]);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${api}/ev-models`).then(r => r.json()).then((data: EVModel[]) => {
      if (!Array.isArray(data)) return;
      setAllModels(data);
      setBrands(Array.from(new Set(data.map(e => e.brand))).sort((a, b) => {
        if (a === 'Evolute') return -1; if (b === 'Evolute') return 1;
        return a.localeCompare(b, 'ru');
      }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (brand) { setModels(allModels.filter(e => e.brand === brand)); setSelectedModel(null); }
  }, [brand, allModels]);

  // Загружаем станции когда есть оба города
  useEffect(() => {
    if (!fromPoint || !toPoint) return;
    setLoadingStations(true);
    const connector = selectedModel?.connector || '';
    fetch(`${api}/stations/along-route?lat1=${fromPoint.lat}&lon1=${fromPoint.lon}&lat2=${toPoint.lat}&lon2=${toPoint.lon}&radiusKm=${corridor}${connector ? `&connector=${connector}` : ''}`)
      .then(r => r.json())
      .then(data => { setStations(Array.isArray(data) ? data : []); setLoadingStations(false); })
      .catch(() => setLoadingStations(false));
  }, [fromPoint, toPoint, corridor]);

  const calculate = () => {
    setError('');
    if (!fromPoint || !toPoint) return setError('Укажите точки маршрута');
    if (!selectedModel) return setError('Выберите электромобиль');

    const totalDist = haversine(fromPoint.lat, fromPoint.lon, toPoint.lat, toPoint.lon) * 1.22;
    const cons = selectedModel.consumption * speedFactor(speed) * seasonFactor(season);
    const battery = selectedModel.battery;
    const realRange = battery / cons * 100;

    setLoading(true);
    setTimeout(() => {
      // Алгоритм жадного выбора остановок
      const stops: Stop[] = [];
      let currentKm = 0;
      let currentCharge = chargeLevel;
      const availableStations = [...stations].sort((a, b) => a.progress - b.progress);

      while (currentKm < totalDist) {
        const currentRangeKm = battery * (currentCharge / 100) / cons * 100;
        const reachableKm = currentKm + currentRangeKm;
        const safeReachKm = currentKm + battery * ((currentCharge - minCharge) / 100) / cons * 100;

        // Если доедем до конца — стоп
        if (reachableKm >= totalDist && currentCharge > minCharge) break;

        // Ищем ближайшую станцию совместимого типа в зоне досягаемости
        const userConnector = selectedModel.connector;
        const reachable = availableStations.filter(s => {
          const stKm = s.progress * totalDist;
          if (stKm <= currentKm + 5 || stKm > safeReachKm) return false;
          // Принимаем станцию если есть совместимый разъём ИЛИ если нет совместимых вообще
          return true;
        });
        // Сортируем: совместимые разъёмы выше
        reachable.sort((a, b) => {
          const aComp = a.connectorTypes.includes(userConnector) ? 1 : 0;
          const bComp = b.connectorTypes.includes(userConnector) ? 1 : 0;
          if (aComp !== bComp) return bComp - aComp; // совместимые первыми
          return b.progress - a.progress; // дальше лучше
        });

        if (reachable.length === 0) {
          // Нет доступных станций — маршрут невозможен
          setResult({
            distance: Math.round(totalDist), consumption: Math.round(cons * 10) / 10,
            stops, driveTimeMin: Math.round(totalDist / speed * 60),
            chargingTimeMin: 0, totalTimeMin: Math.round(totalDist / speed * 60),
            energyNeeded: Math.round(totalDist * cons / 100 * 10) / 10,
            canComplete: false,
            message: `⚠️ Не найдено зарядных станций в радиусе ${corridor} км от маршрута. Попробуйте увеличить коридор поиска или проверьте данные о станциях.`,
          });
          setLoading(false);
          return;
        }

        // Из совместимых берём самую дальнюю, иначе любую самую дальнюю
        const compatible = reachable.filter(s => s.connectorTypes.includes(selectedModel.connector));
        const pool = compatible.length > 0 ? compatible : reachable;
        const bestStation = pool.reduce((best, s) => s.progress > best.progress ? s : best, pool[0]);
        const stKm = bestStation.progress * totalDist;
        const kmToStation = stKm - currentKm;
        const chargeUsed = kmToStation / realRange * 100;
        const arrivalCharge = Math.max(0, currentCharge - chargeUsed);

        // Заряжаем до targetCharge%
        const chargeKwh = battery * (targetCharge - arrivalCharge) / 100;
        const avgPower = Math.min(selectedModel.maxChargeDC, selectedModel.maxChargeDC) * 0.68;
        const chargeTimeMin = Math.round(chargeKwh / Math.max(avgPower, 7) * 60) + 7;

        stops.push({
          station: bestStation,
          arrivalCharge: Math.round(arrivalCharge),
          departureCharge: targetCharge,
          chargeTimeMin,
          kmFromStart: Math.round(stKm),
        });

        currentKm = stKm;
        currentCharge = targetCharge;
      }

      const chargingTimeMin = stops.reduce((s, st) => s + st.chargeTimeMin, 0);
      const driveTimeMin = Math.round(totalDist / speed * 60);
      const energyNeeded = totalDist * cons / 100;

      const message = stops.length === 0
        ? `✅ Доедете без зарядки! Запаса ${Math.round(realRange * chargeLevel / 100)} км достаточно для ${Math.round(totalDist)} км.`
        : `⚡ ${stops.length} ${stops.length === 1 ? 'остановка' : 'остановки'} на зарядку. Все станции совместимы с разъёмом ${selectedModel.connector}.`;

      setResult({
        distance: Math.round(totalDist), consumption: Math.round(cons * 10) / 10,
        stops, driveTimeMin, chargingTimeMin,
        totalTimeMin: driveTimeMin + chargingTimeMin,
        energyNeeded: Math.round(energyNeeded * 10) / 10,
        canComplete: true, message,
      });
      setLoading(false);
    }, 300);
  };

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-2.5 focus:outline-none focus:border-volt-600 bg-white';
  const label = 'text-[11px] font-semibold text-muted uppercase tracking-wide block mb-1.5';

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-6 py-8">
      {/* Шапка */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full mb-3">
            🧪 Бета-версия — тестирование
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold text-ink-900 mb-1">
            Планировщик маршрута с реальными ЭЗС
          </h1>
          <p className="text-sm text-muted">Расчёт с учётом фактических зарядных станций по пути, совместимых с вашим авто</p>
        </div>
        <a href="/route-planner" className="text-xs text-muted hover:text-ink-900 border border-line px-3 py-2 rounded-lg">
          ← Обычный калькулятор
        </a>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* Левая колонка */}
        <div className="space-y-4">

          {/* Автомобиль */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-semibold text-ink-900 mb-4">⚡ Электромобиль</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={label}>Марка</label>
                <select value={brand} onChange={e => setBrand(e.target.value)} className={inp}>
                  <option value="">Выберите марку</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Модель</label>
                <select value={selectedModel?.id || ''} onChange={e => setSelectedModel(models.find(m => m.id === e.target.value) || null)} className={inp} disabled={!brand}>
                  <option value="">Выберите модель</option>
                  {models.map(m => <option key={m.id} value={m.id}>{m.model} ({m.year})</option>)}
                </select>
              </div>
            </div>
            {selectedModel && (
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { val: `${selectedModel.battery} кВт·ч`, label: 'батарея' },
                  { val: `${selectedModel.range} км`, label: 'WLTP' },
                  { val: `${selectedModel.consumption} кВт·ч/100`, label: 'расход' },
                  { val: CONNECTOR_LABELS[selectedModel.connector] || selectedModel.connector, label: 'разъём' },
                ].map(f => (
                  <div key={f.label} className="bg-paper-50 border border-line rounded-xl p-2.5">
                    <div className="text-xs font-bold text-ink-900">{f.val}</div>
                    <div className="text-[10px] text-muted">{f.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Маршрут */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-semibold text-ink-900 mb-4">📍 Маршрут</h3>
            <div className="space-y-3">
              <div>
                <label className={label}>Откуда</label>
                <AddressSearchInput value={from} placeholder="Адрес или город отправления"
                  onChange={(addr, point) => {
                    setFrom(addr);
                    if (point) setFromPoint({ lat: point.lat, lon: point.lon, name: point.city || addr });
                  }} />
              </div>
              <div>
                <label className={label}>Куда</label>
                <AddressSearchInput value={to} placeholder="Адрес или город назначения"
                  onChange={(addr, point) => {
                    setTo(addr);
                    if (point) setToPoint({ lat: point.lat, lon: point.lon, name: point.city || addr });
                  }} />
              </div>
              {fromPoint && toPoint && (
                <div className="text-xs text-muted">
                  ~{Math.round(haversine(fromPoint.lat, fromPoint.lon, toPoint.lat, toPoint.lon) * 1.22)} км по дорогам
                </div>
              )}
            </div>
          </div>

          {/* Параметры */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-semibold text-ink-900 mb-4">🎛️ Параметры</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={label}>Скорость: <span className="text-volt-600">{speed} км/ч</span></label>
                <input type="range" min={60} max={140} step={5} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
              <div>
                <label className={label}>Начальный заряд: <span className="text-volt-600">{chargeLevel}%</span></label>
                <input type="range" min={10} max={100} step={5} value={chargeLevel} onChange={e => setChargeLevel(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
              <div>
                <label className={label}>Мин. заряд при зарядке: <span className="text-volt-600">{minCharge}%</span></label>
                <input type="range" min={5} max={30} step={5} value={minCharge} onChange={e => setMinCharge(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
              <div>
                <label className={label}>Заряжать до: <span className="text-volt-600">{targetCharge}%</span></label>
                <input type="range" min={60} max={95} step={5} value={targetCharge} onChange={e => setTargetCharge(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Сезон</label>
                <select value={season} onChange={e => setSeason(e.target.value)} className={inp}>
                  <option value="summer">☀️ Лето (+10%)</option>
                  <option value="mixed">🍂 Межсезонье (+15%)</option>
                  <option value="winter">❄️ Зима (+40%)</option>
                </select>
              </div>
              <div>
                <label className={label}>Коридор поиска ЭЗС: <span className="text-volt-600">{corridor} км</span></label>
                <input type="range" min={5} max={60} step={5} value={corridor} onChange={e => setCorridor(Number(e.target.value))} className="w-full accent-volt-600 mt-1" />
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

          <button onClick={calculate} disabled={loading || !selectedModel || !fromPoint || !toPoint}
            className="w-full py-4 bg-ink-900 text-white rounded-xl text-base font-bold hover:bg-ink-700 transition-colors disabled:opacity-40">
            {loading ? '⏳ Считаем маршрут...' : '🧭 Рассчитать с реальными ЭЗС'}
          </button>
        </div>

        {/* Правая колонка */}
        <div className="space-y-4">

          {/* Станции найдены */}
          {(fromPoint && toPoint) && (
            <div className="bg-white border border-line rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink-900 text-sm">🔌 ЭЗС по маршруту</h3>
                {loadingStations ? (
                  <span className="text-xs text-muted">загрузка...</span>
                ) : (
                  <span className="text-xs font-semibold text-volt-600">{stations.length} станций</span>
                )}
              </div>
              {stations.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stations.map(s => (
                    <a key={s.id} href={`/charge-map?lat=${s.latitude}&lon=${s.longitude}&id=${s.id}`} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 p-2 bg-paper-50 border border-line rounded-lg hover:border-volt-600/40 hover:bg-white transition-all no-underline cursor-pointer">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.status === 'available' ? 'bg-green-500' : s.status === 'busy' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-ink-900 truncate">{s.name}</div>
                        <div className="text-[10px] text-muted">{s.address || '—'} · {s.distanceKm} км от маршрута</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {s.connectorTypes.map(t => (
                            <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${selectedModel?.connector === t ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {CONNECTOR_LABELS[t] || t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted flex-shrink-0">{Math.round(s.progress * 100)}%</div>
                    </a>
                  ))}
                </div>
              ) : !loadingStations ? (
                <div className="text-center py-4 text-xs text-muted">
                  {selectedModel ? `Нет станций с разъёмом ${selectedModel.connector} в ${corridor} км от маршрута` : 'Выберите авто для фильтрации по разъёму'}
                </div>
              ) : null}
            </div>
          )}

          {/* Результат */}
          {result && (
            <div className="space-y-3">
              <div className={`rounded-2xl p-4 border-2 ${result.canComplete ? (result.stops.length === 0 ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300') : 'bg-red-50 border-red-300'}`}>
                <p className="text-sm font-medium leading-relaxed" style={{ color: result.canComplete ? (result.stops.length === 0 ? '#166534' : '#92400E') : '#991B1B' }}>
                  {result.message}
                </p>
              </div>

              {result.canComplete && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: `${result.distance} км`, label: 'Расстояние', icon: '📍' },
                      { val: `${result.consumption} кВт·ч/100`, label: 'Расход', icon: '⚡' },
                      { val: result.stops.length === 0 ? 'Без зарядки' : `${result.stops.length} зарядки`, label: 'Остановки', icon: '🔌' },
                      { val: fmtTime(result.totalTimeMin), label: 'Итого', icon: '⏱️' },
                    ].map(m => (
                      <div key={m.label} className="bg-white border border-line rounded-xl p-3 text-center">
                        <div className="text-base mb-1">{m.icon}</div>
                        <div className="text-sm font-bold text-ink-900">{m.val}</div>
                        <div className="text-[10px] text-muted">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Маршрутный лист */}
                  {result.stops.length > 0 && (
                    <div className="bg-white border border-line rounded-2xl p-4">
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Маршрутный лист</p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">A</div>
                          <div className="flex-1 text-xs text-ink-900">{from}</div>
                          <div className="text-[10px] text-muted">{chargeLevel}% 🔋</div>
                        </div>

                        {result.stops.map((stop, i) => (
                          <div key={i}>
                            <div className="flex items-start gap-2">
                              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{i+1}</div>
                              <div className="flex-1">
                                <a href={`/charge-map?lat=${stop.station.latitude}&lon=${stop.station.longitude}&id=${stop.station.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-volt-600 hover:underline no-underline">{stop.station.name}</a>
                                <div className="text-[10px] text-muted">{stop.station.address}</div>
                                <div className="flex gap-2 mt-1 text-[10px] flex-wrap">
                                  <span className="text-red-500">Приезд: {stop.arrivalCharge}% 🔋</span>
                                  <span className="text-muted">→</span>
                                  <span className="text-green-600">Отъезд: {stop.departureCharge}% 🔋</span>
                                  {stop.station.connectorTypes.includes(selectedModel?.connector || "")
                                    ? <span className="text-green-600">✅ {CONNECTOR_LABELS[selectedModel?.connector || ""]} совместим</span>
                                    : <span className="text-amber-600">⚠️ Уточните разъём</span>}
                                </div>
                                <div className="text-[10px] text-muted mt-0.5">
                                  ⏱ Зарядка ~{fmtTime(stop.chargeTimeMin)} · через {stop.kmFromStart} км от старта
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-volt-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">B</div>
                          <div className="flex-1 text-xs text-ink-900">{to}</div>
                          <div className="text-[10px] text-muted">{fmtTime(result.driveTimeMin)} езды</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: fmtTime(result.driveTimeMin), label: 'за рулём' },
                      { val: result.chargingTimeMin > 0 ? fmtTime(result.chargingTimeMin) : '—', label: 'на зарядке' },
                      { val: `${result.energyNeeded} кВт·ч`, label: 'энергии' },
                    ].map(f => (
                      <div key={f.label} className="bg-paper-50 border border-line rounded-xl p-3 text-center">
                        <div className="text-sm font-bold text-ink-900">{f.val}</div>
                        <div className="text-[10px] text-muted">{f.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Подсказка */}
          {!fromPoint || !toPoint ? (
            <div className="bg-white border border-line rounded-2xl p-5 text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <p className="text-sm font-medium text-ink-900 mb-2">Как это работает</p>
              <div className="text-xs text-muted space-y-1.5 text-left">
                <p>1. Выберите электромобиль — алгоритм знает ваш разъём и ёмкость батареи</p>
                <p>2. Введите маршрут — найдём все совместимые ЭЗС в {corridor} км от прямой</p>
                <p>3. Алгоритм выбирает оптимальные остановки: максимально далёкие, совместимые с вашим разъёмом</p>
                <p>4. Видите точный маршрутный лист с % заряда на каждой точке</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

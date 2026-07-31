'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GeoPoint, RouteResult as RouteGeo } from '@/lib/routing';

const AddressSearchInput = dynamic(() => import('@/components/AddressSearchInput'), { ssr: false });
const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false });

interface EVModel {
  id: string; brand: string; model: string; year: number;
  range: number; consumption: number; battery: number;
  connector: string; maxChargeDC: number; maxChargeAC?: number;
  isHybrid?: boolean; notes?: string;
}

interface CalcResult {
  distance: number; realConsumption: number; realRange: number;
  energyNeeded: number; stops: StopInfo[];
  driveTimeMin: number; chargingTimeMin: number; totalTimeMin: number;
  co2Saved: number; costEv: number; costGas: number; recommendation: string;
}

interface StopInfo {
  kmFromStart: number; chargeFrom: number; chargeTo: number; timeMin: number;
}

function speedFactor(kmh: number): number {
  if (kmh <= 40) return 0.70;
  if (kmh <= 60) return 0.80;
  if (kmh <= 80) return 0.92;
  if (kmh <= 90) return 1.00;
  if (kmh <= 100) return 1.10;
  if (kmh <= 110) return 1.22;
  if (kmh <= 120) return 1.37;
  if (kmh <= 130) return 1.55;
  if (kmh <= 140) return 1.75;
  return 2.00;
}
function seasonFactor(s: string) { return s === 'winter' ? 1.40 : s === 'summer' ? 1.10 : 1.15; }
function terrainFactor(t: string) { return t === 'mountain' ? 1.12 : t === 'city' ? 1.10 : 1.0; }
function climateFactor(a: string) { return a === 'max' ? 1.12 : a === 'on' ? 1.06 : 1.0; }
function loadFactor(l: string) { return l === 'full' ? 1.12 : l === 'half' ? 1.05 : 1.0; }
const fmtTime = (min: number) => { const h = Math.floor(min/60); const m = min%60; return h > 0 ? `${h} ч${m > 0 ? ` ${m} мин` : ''}` : `${m} мин`; };

export default function RoutePlannerPage() {
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const [allModels, setAllModels] = useState<EVModel[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [brand, setBrand] = useState('');
  const [models, setModels] = useState<EVModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<EVModel | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [customConsumption, setCustomConsumption] = useState<number | ''>('');
  const [customRange, setCustomRange] = useState<number | ''>('');
  const [customBattery, setCustomBattery] = useState<number | ''>('');
  const [customDCPower, setCustomDCPower] = useState<number | ''>(100);

  const [from, setFrom] = useState('');
  const [fromPoint, setFromPoint] = useState<GeoPoint | null>(null);
  const [to, setTo] = useState('');
  const [toPoint, setToPoint] = useState<GeoPoint | null>(null);
  const [routeGeo, setRouteGeo] = useState<RouteGeo | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [useCustomDistance, setUseCustomDistance] = useState(false);
  const [customDistance, setCustomDistance] = useState<number | ''>('');

  const [chargeLevel, setChargeLevel] = useState(90);
  const [minCharge, setMinCharge] = useState(15);
  const [speed, setSpeed] = useState(100);
  const [season, setSeason] = useState<'summer'|'mixed'|'winter'>('mixed');
  const [terrain, setTerrain] = useState<'highway'|'city'|'mountain'>('highway');
  const [ac, setAc] = useState<'off'|'on'|'max'>('on');
  const [load, setLoad] = useState<'empty'|'half'|'full'>('empty');
  const [electricityPrice, setElectricityPrice] = useState(8);
  const [gasPrice, setGasPrice] = useState(72);
  const [gasCar, setGasCar] = useState(10);

  const [result, setResult] = useState<CalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'route'|'economy'|'tips'>('route');

  // Вычисляемые значения (не хуки)
  const _base = useCustom && customConsumption ? Number(customConsumption) : selectedModel?.consumption ?? null;
  const realConsumption = _base
    ? Math.round(_base * speedFactor(speed) * seasonFactor(season) * terrainFactor(terrain) * climateFactor(ac) * loadFactor(load) * 10) / 10
    : null;
  const _bat = useCustom && customBattery ? Number(customBattery) : selectedModel?.battery ?? null;
  const realRange = realConsumption && _bat
    ? Math.round(_bat / realConsumption * 100)
    : (useCustom && customRange ? Number(customRange) : null);
  const maxDC = useCustom && customDCPower ? Number(customDCPower) : selectedModel?.maxChargeDC ?? 50;

  const liveCostEv = result ? Math.round(result.energyNeeded * electricityPrice) : 0;
  const liveCostGas = result ? Math.round(result.distance * gasCar / 100 * gasPrice) : 0;
  const liveSaving = liveCostGas - liveCostEv;

  useEffect(() => {
    fetch(`${api}/ev-models`)
      .then(r => r.json())
      .then((data: EVModel[]) => {
        if (!Array.isArray(data)) return;
        setAllModels(data);
        const b = Array.from(new Set(data.map(e => e.brand))).sort((a, b) => {
          if (a === 'Evolute') return -1; if (b === 'Evolute') return 1;
          return a.localeCompare(b, 'ru');
        });
        setBrands(b);
      })
      .catch(() => {
        import('@/lib/ev-database').then(m => {
          setAllModels(m.EV_DATABASE as any);
          setBrands(m.EV_BRANDS);
        }).catch(() => {});
      });

    const token = localStorage.getItem('user_token');
    if (token) {
      fetch(`${api}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(user => {
          if (!user) return;
          if (user.carBrand) setBrand(user.carBrand);
          if (user.carRange) setCustomRange(user.carRange);
        }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (brand) {
      const ms = allModels.filter(e => e.brand === brand);
      setModels(ms);
      setSelectedModel(null);
    }
  }, [brand, allModels]);

  const buildRoute = async (fp: GeoPoint, tp: GeoPoint) => {
    const { getRoute, haversineKm } = await import('@/lib/routing');
    const r = await getRoute(fp, tp);
    if (r) {
      setRouteGeo(r);
      setCustomDistance(r.distanceKm);
      setUseCustomDistance(true);
    } else {
      setCustomDistance(haversineKm(fp.lat, fp.lon, tp.lat, tp.lon));
      setUseCustomDistance(true);
    }
    setMapLoaded(true);
  };

  const calculate = () => {
    setError('');
    const cons = realConsumption;
    const range = realRange;
    if (!cons || !range) return setError('Укажите данные автомобиля');
    let distance: number;
    if (useCustomDistance && customDistance) {
      distance = Number(customDistance);
    } else {
      return setError('Укажите маршрут — выберите города или введите расстояние вручную');
    }
    if (distance <= 0) return setError('Расстояние должно быть больше 0');

    setLoading(true);
    setTimeout(() => {
      const battery = _bat ?? (range * cons / 100);
      const availableKm = battery * (chargeLevel / 100) / cons * 100;
      const usableKm = battery * ((100 - minCharge) / 100) / cons * 100;

      const stops: StopInfo[] = [];
      let remaining = distance - availableKm;
      let kmCovered = availableKm;

      while (remaining > 0) {
        const chargeFrom = minCharge;
        const chargeTo = 78;
        const chargeKwh = battery * (chargeTo - chargeFrom) / 100;
        const peakPower = Math.min(maxDC, battery * 2.5);
        const avgPower = peakPower * 0.68;
        const timeMin = Math.round(chargeKwh / avgPower * 60) + 7;
        stops.push({ kmFromStart: Math.round(kmCovered), chargeFrom, chargeTo, timeMin });
        const addedKm = battery * (chargeTo - chargeFrom) / 100 / cons * 100;
        remaining -= addedKm;
        kmCovered += addedKm;
      }

      const energyNeeded = distance * cons / 100;
      const chargingTimeMin = stops.reduce((s, st) => s + st.timeMin, 0);
      const driveTimeMin = Math.round(distance / speed * 60);
      const totalTimeMin = driveTimeMin + chargingTimeMin;
      const costEv = Math.round(energyNeeded * electricityPrice);
      const costGas = Math.round(distance * gasCar / 100 * gasPrice);
      const co2Saved = Math.round(distance * gasCar / 100 * 2.31 - energyNeeded * 0.35);

      const recommendation = stops.length === 0
        ? `✅ Доедете без зарядки! По прибытии останется ~${Math.round(availableKm - distance)} км запаса.`
        : stops.length === 1
          ? `⚡ Нужна 1 остановка на зарядку через ${stops[0].kmFromStart} км. Время зарядки ~${fmtTime(stops[0].timeMin)}.`
          : `⚡ Нужно ${stops.length} остановки. Первая через ${stops[0].kmFromStart} км. Суммарно на зарядках ${fmtTime(chargingTimeMin)}.`;

      setResult({ distance, realConsumption: cons, realRange: range, energyNeeded: Math.round(energyNeeded*10)/10, stops, driveTimeMin, chargingTimeMin, totalTimeMin, co2Saved, costEv, costGas, recommendation });
      setLoading(false);
    }, 400);
  };

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-2.5 focus:outline-none focus:border-volt-600 bg-white';
  const labelCls = 'text-[11px] font-semibold text-muted uppercase tracking-wide block mb-1.5';

  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">🧭 Умный планировщик</div>
        <h1 className="text-[24px] md:text-[34px] font-bold text-ink-900 tracking-tight mb-2">Калькулятор поездки на электромобиле</h1>
        <p className="text-muted text-sm">Учитывает скорость, сезон, рельеф, климат и нагрузку</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">

          {/* Автомобиль */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink-900">⚡ Электромобиль</h3>
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} className="accent-volt-600" />
                Ввести вручную
              </label>
            </div>
            {!useCustom ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Марка</label>
                    <select value={brand} onChange={e => setBrand(e.target.value)} className={inp}>
                      <option value="">Выберите марку</option>
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Модель</label>
                    <select value={selectedModel?.id || ''} onChange={e => setSelectedModel(models.find(m => m.id === e.target.value) || null)} className={inp} disabled={!brand}>
                      <option value="">Выберите модель</option>
                      {models.map(m => <option key={m.id} value={m.id}>{m.model} ({m.year})</option>)}
                    </select>
                  </div>
                </div>
                {selectedModel && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { val: `${selectedModel.battery} кВт·ч`, label: 'батарея' },
                      { val: `${selectedModel.range} км`, label: 'WLTP' },
                      { val: `${selectedModel.consumption} кВт·ч/100`, label: 'паспорт' },
                      { val: `${selectedModel.maxChargeDC} кВт`, label: 'DC макс' },
                    ].map(f => (
                      <div key={f.label} className="bg-paper-50 border border-line rounded-xl p-2.5">
                        <div className="text-sm font-bold text-ink-900">{f.val}</div>
                        <div className="text-[10px] text-muted mt-0.5">{f.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Расход кВт·ч/100 км</label><input type="number" value={customConsumption} onChange={e => setCustomConsumption(e.target.value ? Number(e.target.value) : '')} placeholder="18.5" min={5} max={50} step={0.5} className={inp} /></div>
                <div><label className={labelCls}>Батарея, кВт·ч</label><input type="number" value={customBattery} onChange={e => setCustomBattery(e.target.value ? Number(e.target.value) : '')} placeholder="64" min={10} max={200} className={inp} /></div>
                <div><label className={labelCls}>Запас хода, км</label><input type="number" value={customRange} onChange={e => setCustomRange(e.target.value ? Number(e.target.value) : '')} placeholder="350" min={50} max={800} className={inp} /></div>
                <div><label className={labelCls}>DC зарядка макс, кВт</label><input type="number" value={customDCPower} onChange={e => setCustomDCPower(e.target.value ? Number(e.target.value) : '')} placeholder="80" min={7} max={600} className={inp} /></div>
              </div>
            )}
          </div>

          {/* Маршрут */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink-900">📍 Маршрут</h3>
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input type="checkbox" checked={useCustomDistance} onChange={e => { setUseCustomDistance(e.target.checked); if (!e.target.checked) setCustomDistance(''); }} className="accent-volt-600" />
                Ввести км вручную
              </label>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Откуда</label>
                  <AddressSearchInput value={from} placeholder="Адрес или город отправления"
                    onChange={(addr, point) => {
                      setFrom(addr);
                      if (point) { const fp: GeoPoint = { lat: point.lat, lon: point.lon, name: point.city || addr }; setFromPoint(fp); if (toPoint) buildRoute(fp, toPoint); }
                    }} />
                </div>
                <div>
                  <label className={labelCls}>Куда</label>
                  <AddressSearchInput value={to} placeholder="Адрес или город назначения"
                    onChange={(addr, point) => {
                      setTo(addr);
                      if (point) { const tp: GeoPoint = { lat: point.lat, lon: point.lon, name: point.city || addr }; setToPoint(tp); if (fromPoint) buildRoute(fromPoint, tp); }
                    }} />
                </div>
              </div>

              {mapLoaded && fromPoint && toPoint && <RouteMap from={fromPoint} to={toPoint} routePoints={routeGeo?.points} />}

              {customDistance ? (
                <div className="flex items-center gap-3 bg-paper-50 border border-line rounded-xl px-4 py-2.5">
                  <span className="text-sm text-ink-900">📍 Расстояние:</span>
                  <span className="font-bold text-volt-600">{customDistance} км</span>
                  <button onClick={() => { setCustomDistance(''); setRouteGeo(null); setMapLoaded(false); setUseCustomDistance(false); }} className="ml-auto text-xs text-muted hover:text-red-500">✕</button>
                </div>
              ) : useCustomDistance ? (
                <div>
                  <label className={labelCls}>Расстояние, км</label>
                  <input type="number" value={customDistance} onChange={e => setCustomDistance(e.target.value ? Number(e.target.value) : '')} placeholder="500" min={1} max={10000} className={inp} />
                </div>
              ) : (
                <p className="text-xs text-muted text-center py-1">Введите оба адреса — расстояние определится автоматически</p>
              )}
            </div>
          </div>

          {/* Условия */}
          <div className="bg-white border border-line rounded-2xl p-5">
            <h3 className="font-semibold text-ink-900 mb-4">🎛️ Условия поездки</h3>
            <div className="mb-5">
              <div className="flex justify-between items-end mb-2">
                <label className={labelCls}>Средняя скорость</label>
                <div className="flex items-center gap-1"><span className="text-xl font-bold text-volt-600">{speed}</span><span className="text-xs text-muted">км/ч</span></div>
              </div>
              <input type="range" min={40} max={150} step={5} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full accent-volt-600 mb-1" />
              {speed > 105 && <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-1">⚠️ На {speed} км/ч расход в {speedFactor(speed).toFixed(2)}× выше паспортного</div>}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelCls}>Начальный заряд: <span className="text-volt-600">{chargeLevel}%</span></label>
                <input type="range" min={10} max={100} step={5} value={chargeLevel} onChange={e => setChargeLevel(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
              <div>
                <label className={labelCls}>Мин. заряд: <span className="text-volt-600">{minCharge}%</span></label>
                <input type="range" min={5} max={35} step={5} value={minCharge} onChange={e => setMinCharge(Number(e.target.value))} className="w-full accent-volt-600" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Сезон</label>
                <select value={season} onChange={e => setSeason(e.target.value as any)} className={inp}>
                  <option value="summer">☀️ Лето (+10%)</option>
                  <option value="mixed">🍂 Межсезонье (+15%)</option>
                  <option value="winter">❄️ Зима (+40%)</option>
                </select>
              </div>
              <div><label className={labelCls}>Тип дороги</label>
                <select value={terrain} onChange={e => setTerrain(e.target.value as any)} className={inp}>
                  <option value="highway">🛣️ Трасса</option>
                  <option value="city">🏙️ Город (+10%)</option>
                  <option value="mountain">⛰️ Горный (+12%)</option>
                </select>
              </div>
              <div><label className={labelCls}>Климат-контроль</label>
                <select value={ac} onChange={e => setAc(e.target.value as any)} className={inp}>
                  <option value="off">❌ Выключен</option>
                  <option value="on">🌡️ Умеренный (+6%)</option>
                  <option value="max">🥶 Максимальный (+12%)</option>
                </select>
              </div>
              <div><label className={labelCls}>Загрузка</label>
                <select value={load} onChange={e => setLoad(e.target.value as any)} className={inp}>
                  <option value="empty">👤 Один водитель</option>
                  <option value="half">👥 С пассажирами (+5%)</option>
                  <option value="full">🧳 Полная (+12%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Прогноз */}
          {(realConsumption || realRange) && (
            <div className="bg-ink-900 border border-volt-600/20 rounded-2xl p-4">
              <p className="text-xs text-volt-400 font-semibold mb-3 uppercase tracking-wide">📊 Прогноз с учётом всех факторов</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { val: realConsumption ? `${realConsumption} кВт·ч/100` : '—', label: 'Реальный расход', icon: '⚡' },
                  { val: realRange ? `${realRange} км` : '—', label: 'Реальный запас', icon: '🔋' },
                  { val: `×${speedFactor(speed).toFixed(2)}`, label: 'Поправка скорости', icon: '🏎️' },
                ].map(f => (
                  <div key={f.label} className="text-center">
                    <div className="text-lg mb-1">{f.icon}</div>
                    <div className="text-sm font-bold text-white">{f.val}</div>
                    <div className="text-[10px] text-white/50 mt-0.5">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>}

          <button onClick={calculate} disabled={loading || (!selectedModel && !useCustom)}
            className="w-full py-4 bg-ink-900 text-white rounded-xl text-base font-bold hover:bg-ink-700 transition-colors disabled:opacity-40">
            {loading ? '⏳ Рассчитываем...' : '🧭 Рассчитать маршрут'}
          </button>
        </div>

        {/* Результат */}
        <div>
          {!result ? (
            <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
              <h3 className="font-semibold text-ink-900">💡 Как работает</h3>
              {[
                { icon: '🏎️', title: 'Скорость', desc: 'На 120 км/ч расход в 1.37× выше WLTP. На 90 км/ч — базовый.' },
                { icon: '❄️', title: 'Сезон', desc: 'Зимой батарея теряет до 40% ёмкости при -10°C.' },
                { icon: '⛰️', title: 'Рельеф', desc: 'Горы +12%. Спуски возвращают энергию через рекуперацию.' },
                { icon: '🔌', title: 'Зарядки', desc: 'Заряжаем до 78% — оптимально по скорости и батарее.' },
                { icon: '💰', title: 'Экономика', desc: 'Сравниваем с бензином и считаем экономию CO₂.' },
              ].map(f => (
                <div key={f.title} className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{f.icon}</span>
                  <div><div className="font-medium text-ink-900 text-sm mb-0.5">{f.title}</div><div className="text-xs text-muted leading-relaxed">{f.desc}</div></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl p-5 border-2 ${result.stops.length === 0 ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
                <p className="text-sm font-medium leading-relaxed" style={{ color: result.stops.length === 0 ? '#166534' : '#92400E' }}>{result.recommendation}</p>
              </div>

              <div className="flex gap-1 bg-paper-50 border border-line rounded-xl p-1">
                {[{id:'route',label:'🗺️ Маршрут'},{id:'economy',label:'💰 Экономика'},{id:'tips',label:'💡 Советы'}].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id as any)}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm text-ink-900' : 'text-muted hover:text-ink-900'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'route' && (
                <div className="space-y-3">
                  {fromPoint && toPoint && <RouteMap from={fromPoint} to={toPoint} routePoints={routeGeo?.points} />}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: `${result.distance} км`, label: 'Расстояние', icon: '📍', accent: false },
                      { val: `${result.realConsumption} кВт·ч/100`, label: 'Реальный расход', icon: '⚡', accent: false },
                      { val: result.stops.length === 0 ? 'Без зарядки' : `${result.stops.length} зарядки`, label: 'Остановки', icon: '🔌', accent: result.stops.length > 0 },
                      { val: fmtTime(result.totalTimeMin), label: 'Итого в пути', icon: '⏱️', accent: false },
                    ].map(m => (
                      <div key={m.label} className={`rounded-xl p-3 text-center border ${m.accent ? 'bg-amber-50 border-amber-200' : 'bg-white border-line'}`}>
                        <div className="text-base mb-1">{m.icon}</div>
                        <div className={`text-sm font-bold ${m.accent ? 'text-amber-700' : 'text-ink-900'}`}>{m.val}</div>
                        <div className="text-[10px] text-muted mt-0.5">{m.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-line rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Временна́я шкала</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" /><div className="flex-1 text-xs text-ink-900">Старт</div><div className="text-xs text-muted">{chargeLevel}%</div></div>
                      {result.stops.map((stop, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" /><div className="flex-1 text-xs text-ink-900">Зарядка #{i+1} через {stop.kmFromStart} км</div><div className="text-xs text-muted">~{fmtTime(stop.timeMin)}</div></div>
                          <div className="ml-5 text-[10px] text-muted">{stop.chargeFrom}% → {stop.chargeTo}% · {maxDC} кВт DC</div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-volt-600 flex-shrink-0" /><div className="flex-1 text-xs text-ink-900">Прибытие</div><div className="text-xs text-muted">{fmtTime(result.driveTimeMin)} езды</div></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: fmtTime(result.driveTimeMin), label: 'за рулём' },
                      { val: result.chargingTimeMin > 0 ? fmtTime(result.chargingTimeMin) : '—', label: 'на зарядке' },
                      { val: `${result.energyNeeded} кВт·ч`, label: 'нужно энергии' },
                    ].map(f => (
                      <div key={f.label} className="bg-paper-50 border border-line rounded-xl p-3 text-center">
                        <div className="text-sm font-bold text-ink-900">{f.val}</div>
                        <div className="text-[10px] text-muted mt-0.5">{f.label}</div>
                      </div>
                    ))}
                  </div>

                  <a href="/charge-map" className="flex items-center justify-center gap-2 w-full py-3 border border-volt-600/30 text-volt-600 rounded-xl text-sm font-medium hover:bg-volt-600/5 transition-colors no-underline">
                    🗺️ Найти зарядки на маршруте →
                  </a>

                  {fromPoint && toPoint && (
                    <div>
                      <p className="text-xs text-muted mb-2 text-center">Открыть маршрут в навигаторе:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <a href={`https://yandex.ru/maps/?rtext=${fromPoint.lat},${fromPoint.lon}~${toPoint.lat},${toPoint.lon}&rtt=auto`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => { if (/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); window.location.href = `yandexnavi://build_route_on_map?lat_to=${toPoint.lat}&lon_to=${toPoint.lon}&lat_from=${fromPoint.lat}&lon_from=${fromPoint.lon}`; setTimeout(() => window.open(`https://yandex.ru/maps/?rtext=${fromPoint.lat},${fromPoint.lon}~${toPoint.lat},${toPoint.lon}&rtt=auto`, '_blank'), 2000); }}}
                          className="flex items-center justify-center gap-2 py-3 border border-line rounded-xl text-sm font-medium hover:bg-paper-50 transition-colors no-underline text-ink-900">
                          <span>🗺️</span> Яндекс Карты
                        </a>
                        <a href={`https://2gis.ru/routeSearch/rsType/car/from/${fromPoint.lon},${fromPoint.lat}/${encodeURIComponent(from)}/to/${toPoint.lon},${toPoint.lat}/${encodeURIComponent(to)}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={(e) => { if (/Android|iPhone|iPad/i.test(navigator.userAgent)) { e.preventDefault(); window.location.href = `dgis://2gis.ru/routeSearch/rsType/car/from/${fromPoint.lon},${fromPoint.lat}/to/${toPoint.lon},${toPoint.lat}`; setTimeout(() => window.open(`https://2gis.ru/routeSearch/rsType/car/from/${fromPoint.lon},${fromPoint.lat}/${encodeURIComponent(from)}/to/${toPoint.lon},${toPoint.lat}/${encodeURIComponent(to)}`, '_blank'), 2000); }}}
                          className="flex items-center justify-center gap-2 py-3 border border-line rounded-xl text-sm font-medium hover:bg-paper-50 transition-colors no-underline text-ink-900">
                          <span>📍</span> 2ГИС
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'economy' && (
                <div className="space-y-4">
                  <div className="bg-white border border-line rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Стоимость поездки</p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <div className="text-xs text-green-600 mb-1">⚡ Электромобиль</div>
                        <div className="text-2xl font-bold text-green-700">{liveCostEv} ₽</div>
                        <div className="text-[10px] text-green-600 mt-1">{electricityPrice} ₽/кВт·ч × {result.energyNeeded} кВт·ч</div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <div className="text-xs text-red-500 mb-1">⛽ Бензин</div>
                        <div className="text-2xl font-bold text-red-600">{liveCostGas} ₽</div>
                        <div className="text-[10px] text-red-500 mt-1">{gasPrice} ₽/л × {gasCar} л/100</div>
                      </div>
                    </div>
                    <div className="bg-paper-50 border border-line rounded-xl p-3 text-center">
                      <span className="text-sm text-ink-900">Экономия: <strong className="text-green-700">{liveSaving} ₽</strong> {liveCostGas > 0 && <>({Math.round(liveSaving/liveCostGas*100)}%)</>}</span>
                    </div>
                  </div>
                  <div className="bg-white border border-line rounded-xl p-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Настройте цены</p>
                    <div className="space-y-3">
                      <div><label className="text-xs text-muted flex justify-between mb-1"><span>Электричество</span><span className="font-semibold text-ink-900">{electricityPrice} ₽/кВт·ч</span></label><input type="range" min={2} max={25} step={0.5} value={electricityPrice} onChange={e => setElectricityPrice(Number(e.target.value))} className="w-full accent-volt-600" /></div>
                      <div><label className="text-xs text-muted flex justify-between mb-1"><span>Бензин АИ-95</span><span className="font-semibold text-ink-900">{gasPrice} ₽/л</span></label><input type="range" min={40} max={100} step={1} value={gasPrice} onChange={e => setGasPrice(Number(e.target.value))} className="w-full accent-volt-600" /></div>
                      <div><label className="text-xs text-muted flex justify-between mb-1"><span>Расход бензинового авто</span><span className="font-semibold text-ink-900">{gasCar} л/100</span></label><input type="range" min={5} max={20} step={0.5} value={gasCar} onChange={e => setGasCar(Number(e.target.value))} className="w-full accent-volt-600" /></div>
                    </div>
                  </div>
                  {result.co2Saved > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                      <div className="text-2xl mb-1">🌱</div>
                      <div className="text-xl font-bold text-green-700">{result.co2Saved} кг CO₂</div>
                      <div className="text-xs text-green-600 mt-1">сэкономлено по сравнению с бензином</div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'tips' && (
                <div className="space-y-3">
                  {[
                    { icon: '🏎️', title: `Снизьте скорость до 90-100 км/ч`, desc: `На ${speed} км/ч расход в ${speedFactor(speed).toFixed(2)}× выше оптимального.`, show: speed > 105 },
                    { icon: '🔌', title: 'Заряжайтесь до 75-80% на трассе', desc: 'После 80% DC мощность падает вдвое. Несколько коротких зарядок быстрее одной долгой.', show: result.stops.length > 0 },
                    { icon: '❄️', title: 'Прогрейте авто подключённым к зарядке', desc: 'Зимой прогрев от зарядника (не от батареи) сохранит до 25% запаса хода.', show: season === 'winter' },
                    { icon: '♻️', title: 'Используйте рекуперацию', desc: 'В городе и на спусках рекуперация возвращает 10-25% энергии.', show: terrain === 'city' || terrain === 'mountain' },
                    { icon: '🌡️', title: 'Обогрев сидений эффективнее печки', desc: 'Подогрев сидений и руля потребляет в 3-4× меньше чем климат-контроль.', show: season !== 'summer' },
                    { icon: '📍', title: 'Планируйте зарядку заранее', desc: 'Не доводите до 10-15%. Планируйте зарядку при 20-25% для здоровья батареи.', show: minCharge < 15 },
                  ].filter(t => t.show).map(t => (
                    <div key={t.title} className="bg-white border border-line rounded-xl p-4 flex gap-3">
                      <span className="text-xl flex-shrink-0">{t.icon}</span>
                      <div><div className="font-medium text-ink-900 text-sm mb-1">{t.title}</div><div className="text-xs text-muted leading-relaxed">{t.desc}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

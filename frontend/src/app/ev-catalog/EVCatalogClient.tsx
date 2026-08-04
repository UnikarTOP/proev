'use client';

import { useState, useEffect } from 'react';
import { EV_DATABASE, EV_BRANDS, type EVModel } from '@/lib/ev-database';

const CONNECTORS: Record<string, { label: string; color: string }> = {
  'GBT':    { label: 'GB/T', color: '#DC2626' },
  'CCS2':   { label: 'CCS2', color: '#2563EB' },
  'CHAdeMO':{ label: 'CHAdeMO', color: '#7C3AED' },
  'Type2':  { label: 'Type 2', color: '#059669' },
  'Type1':  { label: 'Type 1', color: '#D97706' },
};

const SORT_OPTIONS = [
  { val: 'range_desc', label: '🔋 Запас хода ↓' },
  { val: 'range_asc',  label: '🔋 Запас хода ↑' },
  { val: 'consumption_asc', label: '⚡ Расход ↑' },
  { val: 'dc_desc',    label: '🔌 DC зарядка ↓' },
  { val: 'brand',      label: '🔤 По марке' },
];

export default function EVCatalogPage() {
  const [models, setModels] = useState<EVModel[]>([]);
  const [filtered, setFiltered] = useState<EVModel[]>([]);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [connector, setConnector] = useState('');
  const [showHybrid, setShowHybrid] = useState(false);
  const [sort, setSort] = useState('range_desc');
  const [selected, setSelected] = useState<EVModel | null>(null);
  const [view, setView] = useState<'grid'|'table'>('grid');

  useEffect(() => {
    // Сначала пробуем API
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/ev-models`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setModels(data);
        } else {
          setModels(EV_DATABASE as any);
        }
      })
      .catch(() => setModels(EV_DATABASE as any));
  }, []);

  useEffect(() => {
    let f = models.filter(m => {
      if (!showHybrid && m.isHybrid) return false;
      if (brand && m.brand !== brand) return false;
      if (connector && m.connector !== connector) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.brand.toLowerCase().includes(q) || m.model.toLowerCase().includes(q) || m.origin?.toLowerCase().includes(q);
      }
      return true;
    });

    f = [...f].sort((a, b) => {
      switch (sort) {
        case 'range_desc': return b.range - a.range;
        case 'range_asc':  return a.range - b.range;
        case 'consumption_asc': return a.consumption - b.consumption;
        case 'dc_desc':    return b.maxChargeDC - a.maxChargeDC;
        case 'brand':      return a.brand.localeCompare(b.brand, 'ru');
        default: return 0;
      }
    });

    setFiltered(f);
  }, [models, search, brand, connector, showHybrid, sort]);

  const brands = Array.from(new Set(models.map(m => m.brand))).sort((a, b) => {
    const ruFirst = ['Эволюте', 'Evolute', 'Москвич', 'Амберавто'];
    if (ruFirst.includes(a) && !ruFirst.includes(b)) return -1;
    if (!ruFirst.includes(a) && ruFirst.includes(b)) return 1;
    return a.localeCompare(b, 'ru');
  });

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-2.5 focus:outline-none focus:border-volt-600 bg-white';

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Шапка */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          🚗 Справочник EV
        </div>
        <h1 className="text-[24px] md:text-[34px] font-bold text-ink-900 tracking-tight mb-2">
          База электромобилей
        </h1>
        <p className="text-muted text-sm">
          {models.length} моделей · паспортные характеристики · данные проверены
        </p>
      </div>

      {/* Фильтры */}
      <div className="bg-white border border-line rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="col-span-2 md:col-span-1">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Поиск марки, модели..." className={inp} />
          </div>
          <select value={brand} onChange={e => setBrand(e.target.value)} className={inp}>
            <option value="">Все марки</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={connector} onChange={e => setConnector(e.target.value)} className={inp}>
            <option value="">Все разъёмы</option>
            {Object.entries(CONNECTORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className={inp}>
            {SORT_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input type="checkbox" checked={showHybrid} onChange={e => setShowHybrid(e.target.checked)} className="accent-volt-600" />
              PHEV/EREV
            </label>
            <div className="flex gap-1 ml-auto">
              {(['grid','table'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`p-2 rounded-lg text-sm transition-all ${view === v ? 'bg-ink-900 text-white' : 'text-muted hover:bg-paper-50'}`}>
                  {v === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted">
          Найдено: <strong className="text-ink-900">{filtered.length}</strong> из {models.length} моделей
        </div>
      </div>

      {/* Сетка карточек */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <div key={m.id} onClick={() => setSelected(m)}
              className="bg-white border border-line rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-volt-600/30 transition-all">

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-muted mb-0.5">{m.brand}</div>
                  <div className="font-bold text-ink-900 text-sm leading-tight">{m.model}</div>
                  <div className="text-xs text-muted mt-0.5">{m.year} г.</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: CONNECTORS[m.connector]?.color + '20', color: CONNECTORS[m.connector]?.color }}>
                    {CONNECTORS[m.connector]?.label || m.connector}
                  </span>
                  {m.isHybrid && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">PHEV</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-paper-50 border border-line rounded-xl p-2.5 text-center">
                  <div className="text-base font-bold text-ink-900">{m.range}</div>
                  <div className="text-[10px] text-muted">км запас</div>
                </div>
                <div className="bg-paper-50 border border-line rounded-xl p-2.5 text-center">
                  <div className="text-base font-bold text-ink-900">{m.consumption}</div>
                  <div className="text-[10px] text-muted">кВт·ч/100</div>
                </div>
                <div className="bg-paper-50 border border-line rounded-xl p-2.5 text-center">
                  <div className="text-base font-bold text-ink-900">{m.battery}</div>
                  <div className="text-[10px] text-muted">кВт·ч батарея</div>
                </div>
                <div className="bg-paper-50 border border-line rounded-xl p-2.5 text-center">
                  <div className="text-base font-bold text-ink-900">{m.maxChargeDC || '—'}</div>
                  <div className="text-[10px] text-muted">кВт DC макс</div>
                </div>
              </div>

              {m.origin && (
                <div className="mt-2 text-[10px] text-muted border-t border-line pt-2">
                  📦 {m.origin}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Таблица */}
      {view === 'table' && (
        <div className="bg-white border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-paper-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Марка / Модель</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Год</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Запас хода</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Расход</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Батарея</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Разъём</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted uppercase tracking-wide">DC макс</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} onClick={() => setSelected(m)}
                    className={`border-b border-line cursor-pointer hover:bg-paper-50 transition-colors ${i % 2 === 0 ? '' : 'bg-paper-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-900">{m.brand}</div>
                      <div className="text-xs text-muted">{m.model}</div>
                    </td>
                    <td className="px-3 py-3 text-center text-muted">{m.year}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-ink-900">{m.range}</span>
                      <span className="text-xs text-muted ml-1">км</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-ink-900">{m.consumption}</span>
                      <span className="text-xs text-muted ml-1">кВт·ч</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-ink-900">{m.battery}</span>
                      <span className="text-xs text-muted ml-1">кВт·ч</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: CONNECTORS[m.connector]?.color + '20', color: CONNECTORS[m.connector]?.color }}>
                        {CONNECTORS[m.connector]?.label || m.connector}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-ink-900">{m.maxChargeDC || '—'} кВт</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Модальное окно с деталями */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-sm text-muted mb-1">{selected.brand} · {selected.year} г.</div>
                  <h2 className="text-xl font-bold text-ink-900">{selected.model}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: CONNECTORS[selected.connector]?.color + '20', color: CONNECTORS[selected.connector]?.color }}>
                      {CONNECTORS[selected.connector]?.label || selected.connector}
                    </span>
                    {selected.isHybrid && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">PHEV/EREV</span>}
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted hover:text-ink-900 text-xl leading-none p-1">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { val: `${selected.range} км`, label: 'Запас хода (паспорт)', icon: '🔋' },
                  { val: `${selected.consumption} кВт·ч/100`, label: 'Расход (паспорт)', icon: '⚡' },
                  { val: `${selected.battery} кВт·ч`, label: 'Ёмкость батареи', icon: '🔌' },
                  { val: selected.maxChargeDC > 0 ? `${selected.maxChargeDC} кВт` : '—', label: 'DC зарядка макс.', icon: '⚡' },
                  { val: selected.maxChargeAC ? `${selected.maxChargeAC} кВт` : '—', label: 'AC зарядка макс.', icon: '🔌' },
                  { val: selected.maxChargeDC > 0 ? `~${Math.round(selected.battery * 0.6 / (selected.maxChargeDC * 0.68) * 60)} мин` : '—', label: '20→80% время DC', icon: '⏱️' },
                ].map(f => (
                  <div key={f.label} className="bg-paper-50 border border-line rounded-xl p-3">
                    <div className="text-xs text-muted mb-1">{f.icon} {f.label}</div>
                    <div className="font-bold text-ink-900">{f.val}</div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700 font-medium mb-1">📊 Реальный запас хода</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                  {[
                    { label: '☀️ Лето', km: Math.round(selected.range * 0.88) },
                    { label: '🍂 Осень', km: Math.round(selected.range * 0.80) },
                    { label: '❄️ Зима', km: Math.round(selected.range * 0.67) },
                  ].map(s => (
                    <div key={s.label}>
                      <div className="text-sm font-bold text-amber-800">{s.km} км</div>
                      <div className="text-[10px] text-amber-600">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {selected.origin && (
                <div className="text-xs text-muted border-t border-line pt-3 mb-3">
                  📦 Китайский оригинал: <strong className="text-ink-900">{selected.origin}</strong>
                </div>
              )}

              {selected.notes && (
                <div className="text-xs text-muted border-t border-line pt-3">
                  💬 {selected.notes}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <a href={`/route-planner`}
                  className="flex-1 py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold text-center no-underline hover:bg-ink-700 transition-colors">
                  🧭 Рассчитать маршрут
                </a>
                <button onClick={() => setSelected(null)}
                  className="px-4 py-3 border border-line text-muted rounded-xl text-sm hover:border-graphite-900/20 transition-colors">
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">🔍</div>
          <p>Ничего не найдено. Попробуйте изменить фильтры.</p>
        </div>
      )}
      {/* Партнёрский блок — ОСАГО */}
      <a href="https://go.sravni.ru/aff_c?aff_id=101339&offer_id=1064&source=10640&out=https%3A%2F%2Fwww.sravni.ru%2Fosago%2F%3F" target="_blank" rel="noopener noreferrer sponsored"
        className="mt-8 flex items-center gap-4 bg-gradient-to-r from-[#0B4DB8] to-[#1565D8] rounded-2xl p-5 no-underline hover:opacity-95 transition-opacity group">
        <span className="text-3xl">🛡️</span>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">Оформите ОСАГО для электромобиля онлайн</div>
          <div className="text-white/70 text-xs mt-0.5">Сравните цены от 25+ страховых компаний · Экономия до 40%</div>
        </div>
        <span className="flex-shrink-0 bg-white text-[#0B4DB8] text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap">Рассчитать →</span>
      </a>
      <p className="text-right text-[10px] text-muted mt-1">Реклама · Сравни.ру</p>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CitySelect from '@/components/CitySelect';

interface Category { id: string; name: string; slug: string; }
interface Provider {
  id: string; name: string; slug: string; tagline?: string;
  city?: string; logoUrl?: string; ratingAvg?: number; reviewCount: number;
  isPaidPlacement: boolean; verified: boolean; viewCount?: number;
  services: string[]; brands: string[];
  category: { name: string; slug: string };
}

const CAT_ICONS: Record<string, string> = {
  'sto': '🔧', 'zaryadki-dom': '🔌', 'ustanovka': '⚡',
  'strahovanie': '🛡️', 'vykup': '🚗', 'obuchenie': '📚',
  'arenda': '🔑', 'tyuning': '⚙️', 'default': '🏪',
};

function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim() || !text) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="bg-amber-100 text-inherit rounded-sm px-0.5 not-italic">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

function ProviderCard({ p, q = '' }: { p: Provider; q?: string }) {
  const stripBg = p.isPaidPlacement ? '#F59E0B' : p.verified ? '#1D9E75' : '#E5E7EB';
  return (
    <a href={`/services/${p.slug}`} className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-300 transition-all duration-200 no-underline">
      <div className="h-1 w-full flex-shrink-0" style={{ background: stripBg }} />
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex gap-3 items-start">
          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {p.logoUrl
              ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : <span className="text-base font-bold text-gray-300">{(p.name[0] || '?').toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 mb-0.5">
              <span className="text-sm font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">
                <Hl text={p.name} q={q} />
              </span>
              {p.isPaidPlacement && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">ТОП</span>}
              {p.verified && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Проверен</span>}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
              <span>{CAT_ICONS[p.category.slug] || '🏪'} {p.category.name}</span>
              {p.city && <><span>·</span><span><Hl text={p.city} q={q} /></span></>}
            </div>
          </div>
        </div>

        {p.tagline && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
            <Hl text={p.tagline} q={q} />
          </p>
        )}

        {p.brands.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.brands.slice(0, 4).map(b => (
              <span key={b} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{b}</span>
            ))}
            {p.brands.length > 4 && <span className="text-[10px] text-gray-400">+{p.brands.length - 4}</span>}
          </div>
        )}

        {p.services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.services.slice(0, 3).map(s => (
              <span key={s} className="text-[11px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
            ))}
            {p.services.length > 3 && <span className="text-[10px] text-gray-400">+{p.services.length - 3}</span>}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
          {p.reviewCount > 0
            ? <div className="flex items-center gap-1 text-xs"><span className="text-amber-400">★</span><span className="font-semibold text-gray-900">{p.ratingAvg?.toFixed(1)}</span><span className="text-gray-400">({p.reviewCount})</span></div>
            : <span className="text-[11px] text-gray-400">Новый</span>
          }
          <span className="text-xs text-cyan-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Подробнее →</span>
        </div>
      </div>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="h-1 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded animate-pulse" />
        <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [city, setCity] = useState('');
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [geoHidden, setGeoHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Инициализируем из URL только после mount (избегаем hydration mismatch)
  useEffect(() => {
    setMounted(true);
    const p = new URLSearchParams(window.location.search);
    if (p.get('q')) { setSearch(p.get('q')!); setSearchInput(p.get('q')!); }
    if (p.get('category')) setActiveCategory(p.get('category')!);
    if (p.get('city')) setCity(p.get('city')!);
  }, []);

  // GeoIP
  useEffect(() => {
    if (!mounted) return;
    const saved = document.cookie.split(';').find(c => c.trim().startsWith('proev_city='))?.split('=')[1];
    if (saved) { const d = decodeURIComponent(saved); setDetectedCity(d); if (!city) setCity(d); return; }
    fetch(`${api}/geoip/city`).then(r => r.json()).then(d => { if (d.city) setDetectedCity(d.city); }).catch(() => {});
  }, [mounted]);

  // Категории
  useEffect(() => {
    fetch(`${api}/service-providers/categories`).then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Загрузка провайдеров
  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (activeCategory) p.set('category', activeCategory);
    if (city) p.set('city', city);
    if (search.trim()) p.set('search', search.trim());
    try {
      const data = await fetch(`${api}/service-providers?${p}`).then(r => r.json());
      setProviders(Array.isArray(data) ? data : []);
    } catch { setProviders([]); }
    setLoading(false);
  }, [activeCategory, city, search]);

  useEffect(() => { if (mounted) load(); }, [load, mounted]);

  // URL sync
  useEffect(() => {
    if (!mounted) return;
    const p = new URLSearchParams();
    if (activeCategory) p.set('category', activeCategory);
    if (city) p.set('city', city);
    if (search) p.set('q', search);
    router.replace(p.toString() ? `/services?${p}` : '/services', { scroll: false });
  }, [activeCategory, city, search, mounted]);

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearch(v), 350);
  };

  const applyCity = (c: string) => {
    setCity(c); setGeoHidden(true);
    if (mounted) document.cookie = `proev_city=${encodeURIComponent(c)};max-age=${7 * 86400};path=/`;
  };

  const clearCity = () => {
    setCity('');
    if (mounted) document.cookie = 'proev_city=;max-age=0;path=/';
  };

  const clearAll = () => { setSearch(''); setSearchInput(''); setActiveCategory(''); clearCity(); setOnlyVerified(false); };

  const filtered = providers.filter(p => !onlyVerified || p.verified);
  const inCity = city ? filtered.filter(p => (p.city || '').toLowerCase().includes(city.toLowerCase())) : [];
  const outCity = city ? filtered.filter(p => !(p.city || '').toLowerCase().includes(city.toLowerCase())) : filtered;
  const hasFilters = !!(search || activeCategory || city || onlyVerified);
  const catCounts = categories.map(c => ({ ...c, count: providers.filter(p => p.category.slug === c.slug).length }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Сервисы для электромобилей</h1>
          <p className="text-sm text-gray-500">Проверенные СТО, зарядные станции и услуги для EV по всей России</p>
        </div>
      </div>

      {/* GeoIP баннер */}
      {mounted && detectedCity && !city && !geoHidden && (
        <div className="bg-cyan-50 border-b border-cyan-200">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
            <span>📍</span>
            <p className="text-sm text-gray-900 flex-1">Вы в <strong>{detectedCity}</strong> — показать сервисы рядом?</p>
            <button onClick={() => applyCity(detectedCity)} className="text-xs font-semibold text-white bg-cyan-500 px-4 py-1.5 rounded-lg hover:bg-cyan-600 transition-colors">Показать</button>
            <button onClick={() => setGeoHidden(true)} className="text-xs text-gray-500 hover:text-gray-900">Нет</button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5">

        {/* Строка 1: поиск + город + верифицированные */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
            <input
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Название, услуга, марка EV..."
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-cyan-500 bg-white"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 text-xs">✕</button>
            )}
          </div>

          <CitySelect value={city} onChange={applyCity} placeholder="Город" style={{ flexShrink: 0, minWidth: 160 }} />

          <button onClick={() => setOnlyVerified(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm rounded-xl border transition-all font-medium flex-shrink-0 ${onlyVerified ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'}`}>
            ✅ <span className="hidden sm:inline">Проверенные</span>
          </button>
        </div>

        {/* Строка 2: категории */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4" style={{ scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveCategory('')}
            className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold border transition-all flex-shrink-0 whitespace-nowrap ${!activeCategory ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>
            Все <span className="opacity-60">{providers.length}</span>
          </button>
          {catCounts.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(activeCategory === cat.slug ? '' : cat.slug)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all flex-shrink-0 whitespace-nowrap ${activeCategory === cat.slug ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>
              <span>{CAT_ICONS[cat.slug] || '🏪'}</span>{cat.name}<span className="opacity-60">{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Счётчик */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {filtered.length === 0 ? 'Ничего не найдено' : `${filtered.length} ${filtered.length === 1 ? 'сервис' : filtered.length < 5 ? 'сервиса' : 'сервисов'}`}
              {city ? ` в ${city}` : ''}{search ? ` · «${search}»` : ''}
            </p>
            {hasFilters && <button onClick={clearAll} className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900">Сбросить фильтры</button>}
          </div>
        )}

        {/* Скелетон */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} />)}
          </div>
        )}

        {/* Пусто */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-20">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ничего не найдено</h3>
            <p className="text-sm text-gray-500 mb-5">{city ? `Нет сервисов в ${city}` : 'Попробуйте изменить фильтры'}</p>
            <div className="flex gap-3 justify-center flex-wrap">
              {city && <button onClick={clearCity} className="text-sm text-cyan-600 border border-cyan-200 px-4 py-2 rounded-xl hover:bg-cyan-50">По всей России</button>}
              {(search || activeCategory) && <button onClick={() => { setSearch(''); setSearchInput(''); setActiveCategory(''); }} className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50">Сбросить</button>}
            </div>
          </div>
        )}

        {/* Сетка */}
        {!loading && filtered.length > 0 && (
          city && inCity.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">📍 В {city}</span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{inCity.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {inCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
              </div>
              {outCity.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">🗺 Другие города</span>
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">{outCity.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {outCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
            </div>
          )
        )}

        {/* CTA */}
        {!loading && (
          <div className="mt-12 bg-gray-900 rounded-2xl p-6 md:p-8 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-48">
              <h3 className="text-white font-bold text-base mb-1">Ваш сервис здесь</h3>
              <p className="text-sm text-gray-400">Разместите страницу бесплатно и получайте заявки от владельцев EV</p>
            </div>
            <a href="/partner" className="flex-shrink-0 px-6 py-3 rounded-xl text-sm font-semibold no-underline" style={{ background: '#3DDBFF', color: '#0B1220' }}>Разместить сервис →</a>
          </div>
        )}
      </div>
    </div>
  );
}

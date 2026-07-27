'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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

const CITIES = [
  'Москва','Санкт-Петербург','Новосибирск','Екатеринбург',
  'Казань','Краснодар','Нижний Новгород','Сочи','Владивосток','Тюмень',
];

// ── Подсветка поиска ─────────────────────────────────────────────────────────
function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim() || !text) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="bg-amber-100 text-ink-900 rounded-sm px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

// ── Карточка провайдера ───────────────────────────────────────────────────────
function ProviderCard({ p, q = '' }: { p: Provider; q?: string }) {
  return (
    <a href={`/services/${p.slug}`}
      className="group flex flex-col bg-white border border-line rounded-2xl overflow-hidden hover:shadow-md hover:border-graphite-900/20 transition-all duration-200">

      {/* Верхняя полоса категории */}
      <div className="h-1 w-full" style={{
        background: p.isPaidPlacement ? 'linear-gradient(90deg,#F59E0B,#EF9F27)' :
          p.verified ? 'linear-gradient(90deg,#1D9E75,#0BA5CC)' : '#DCE1E8'
      }} />

      <div className="p-5 flex flex-col flex-1">
        {/* Шапка */}
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-paper-50 border border-line flex items-center justify-center overflow-hidden shrink-0">
            {p.logoUrl
              ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : <span className="text-lg font-bold text-muted">{(p.name[0] || '?').toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-ink-900 leading-snug group-hover:text-volt-600 transition-colors">
                <Hl text={p.name} q={q} />
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-muted">
                {CAT_ICONS[p.category.slug] || '🏪'} {p.category.name}
              </span>
              {p.city && (
                <>
                  <span className="text-muted text-[11px]">·</span>
                  <span className="text-[11px] text-muted"><Hl text={p.city} q={q} /></span>
                </>
              )}
            </div>
          </div>
          {/* Бейджи */}
          <div className="flex flex-col gap-1 items-end shrink-0">
            {p.isPaidPlacement && (
              <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">ТОП</span>
            )}
            {p.verified && (
              <span className="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓ Верифицирован</span>
            )}
          </div>
        </div>

        {/* Слоган */}
        {p.tagline && (
          <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2 flex-1">
            <Hl text={p.tagline} q={q} />
          </p>
        )}

        {/* Услуги */}
        {p.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {p.services.slice(0, 3).map(s => (
              <span key={s} className="text-[11px] bg-paper-50 border border-line px-2 py-0.5 rounded-full text-muted">
                {s}
              </span>
            ))}
            {p.services.length > 3 && (
              <span className="text-[11px] text-muted">+{p.services.length - 3}</span>
            )}
          </div>
        )}

        {/* Футер карточки */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-line">
          {p.reviewCount > 0 ? (
            <div className="flex items-center gap-1">
              <span className="text-amber-400 text-xs">★</span>
              <span className="text-xs font-semibold text-ink-900">{p.ratingAvg?.toFixed(1)}</span>
              <span className="text-[11px] text-muted">({p.reviewCount})</span>
            </div>
          ) : (
            <span className="text-[11px] text-muted">Новый партнёр</span>
          )}
          <span className="text-xs text-volt-600 font-medium flex items-center gap-1
            opacity-0 group-hover:opacity-100 transition-opacity">
            Подробнее →
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Скелетон ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white border border-line rounded-2xl overflow-hidden">
      <div className="h-1 bg-paper-50" />
      <div className="p-5">
        <div className="flex gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-paper-50 shrink-0 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-paper-50 rounded-lg w-3/4 mb-2 animate-pulse" />
            <div className="h-3 bg-paper-50 rounded-lg w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="h-3 bg-paper-50 rounded-lg mb-1.5 animate-pulse" />
        <div className="h-3 bg-paper-50 rounded-lg w-2/3 mb-4 animate-pulse" />
        <div className="flex gap-1">
          {[1,2,3].map(i => <div key={i} className="h-5 w-16 bg-paper-50 rounded-full animate-pulse" />)}
        </div>
      </div>
    </div>
  );
}

// ── Основной контент ──────────────────────────────────────────────────────────
function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityInput, setCityInput] = useState('');
  const [onlyVerified, setOnlyVerified] = useState(false);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // GeoIP
  useEffect(() => {
    const saved = document.cookie.split(';').find(c => c.trim().startsWith('proev_city='))?.split('=')[1];
    if (saved) {
      const decoded = decodeURIComponent(saved);
      setDetectedCity(decoded);
      if (!city) { setCity(decoded); }
      return;
    }
    fetch(`${api}/geoip/city`)
      .then(r => r.json())
      .then(d => { if (d.city) setDetectedCity(d.city); })
      .catch(() => {});
  }, []);

  // Категории
  useEffect(() => {
    fetch(`${api}/service-providers/categories`)
      .then(r => r.json()).then(setCategories).catch(() => {});
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

  useEffect(() => { load(); }, [load]);

  // URL sync
  useEffect(() => {
    const p = new URLSearchParams();
    if (activeCategory) p.set('category', activeCategory);
    if (city) p.set('city', city);
    if (search) p.set('q', search);
    router.replace(p.toString() ? `/services?${p}` : '/services', { scroll: false });
  }, [activeCategory, city, search]);

  // Debounce поиска
  const handleSearchInput = (v: string) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(v), 350);
  };

  const applyCity = (c: string) => {
    setCity(c);
    setShowCityDropdown(false);
    setCityInput('');
    document.cookie = `proev_city=${encodeURIComponent(c)};max-age=${7*86400};path=/`;
  };

  const clearCity = () => {
    setCity('');
    document.cookie = 'proev_city=;max-age=0;path=/';
  };

  // Фильтрация и сортировка
  const filtered = providers.filter(p => !onlyVerified || p.verified);

  const inCity = city ? filtered.filter(p => (p.city || '').toLowerCase().includes(city.toLowerCase())) : [];
  const outCity = city ? filtered.filter(p => !(p.city || '').toLowerCase().includes(city.toLowerCase())) : filtered;

  const totalCount = filtered.length;
  const cityCounts = categories.map(c => ({
    ...c,
    count: providers.filter(p => p.category.slug === c.slug).length,
  }));

  return (
    <div className="min-h-screen bg-paper-50">

      {/* Шапка страницы */}
      <div className="bg-white border-b border-line">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-[22px] md:text-[30px] font-bold text-ink-900 tracking-tight mb-1">
            Сервисы для электромобилей
          </h1>
          <p className="text-sm text-muted">
            Проверенные СТО, зарядные станции и услуги для EV по всей России
          </p>
        </div>
      </div>

      {/* GeoIP баннер */}
      {detectedCity && !searchParams.get('city') && !city && (
        <div className="bg-volt-600/8 border-b border-volt-600/15">
          <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
            <span className="text-base shrink-0">📍</span>
            <p className="text-sm text-ink-900 flex-1">
              Вы в <strong>{detectedCity}</strong> — показать сервисы в вашем городе?
            </p>
            <button onClick={() => applyCity(detectedCity)}
              className="text-xs font-semibold text-white bg-volt-600 px-4 py-1.5 rounded-lg hover:bg-volt-700 transition-colors shrink-0">
              Показать
            </button>
            <button onClick={() => setDetectedCity(null)}
              className="text-xs text-muted hover:text-ink-900 transition-colors shrink-0">
              Нет
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6">

        {/* Фильтры — всё в один ряд */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">

          {/* Поиск — растягивается */}
          <div className="relative" style={{ minWidth: 200, flex: '1 1 200px' }}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs pointer-events-none">🔍</span>
            <input
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Поиск по названию, услуге, марке..."
              className="w-full pl-8 pr-7 py-2 text-sm border border-line rounded-xl focus:outline-none focus:border-volt-600 bg-white"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink-900 text-xs">✕</button>
            )}
          </div>

          {/* Разделитель */}
          <div className="h-7 w-px bg-line hidden sm:block" />

          {/* Категории — иконки с тултипом */}
          <div className="flex items-center gap-1">
            {/* Все */}
            <button onClick={() => setActiveCategory('')}
              title="Все категории"
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold border transition-all
                ${!activeCategory ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-line text-muted hover:border-graphite-900/30 hover:text-ink-900'}`}>
              Все
              <span className={`text-[10px] ${!activeCategory ? 'text-white/60' : 'text-muted'}`}>{providers.length}</span>
            </button>

            {cityCounts.map(cat => (
              <button key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.slug ? '' : cat.slug)}
                title={`${cat.name} (${cat.count})`}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all text-base
                  ${activeCategory === cat.slug
                    ? 'bg-ink-900 border-ink-900'
                    : 'bg-white border-line hover:border-graphite-900/30 hover:bg-paper-50'
                  }`}>
                <span>{CAT_ICONS[cat.slug] || '🏪'}</span>
                {cat.count > 0 && (
                  <span className={`absolute -top-1 -right-1 text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center
                    ${activeCategory === cat.slug ? 'bg-volt-600 text-white' : 'bg-line text-muted'}`}>
                    {cat.count > 9 ? '9+' : cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Разделитель */}
          <div className="h-7 w-px bg-line hidden sm:block" />

          {/* Город */}
          <div className="relative">
            <button onClick={() => setShowCityDropdown(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all font-medium
                ${city ? 'border-volt-600 bg-volt-600/10 text-volt-600' : 'border-line bg-white text-muted hover:border-graphite-900/30 hover:text-ink-900'}`}>
              <span className="text-base leading-none">📍</span>
              <span className="max-w-[80px] truncate">{city || 'Город'}</span>
              {city
                ? <span onClick={e => { e.stopPropagation(); clearCity(); }} className="text-volt-600/60 hover:text-volt-600 font-bold">✕</span>
                : <span className="text-muted text-xs">▾</span>
              }
            </button>
            {showCityDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCityDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-line rounded-xl shadow-xl overflow-hidden w-52">
                  <div className="p-2 border-b border-line">
                    <input autoFocus placeholder="Введите город..."
                      value={cityInput} onChange={e => setCityInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && cityInput.length > 1) applyCity(cityInput); }}
                      className="w-full text-sm px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:border-volt-600" />
                  </div>
                  <div className="py-1 max-h-56 overflow-y-auto">
                    {detectedCity && (
                      <button onClick={() => applyCity(detectedCity)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-paper-50 flex items-center gap-2 border-b border-line">
                        <span className="text-volt-600">📍</span>
                        <span className="font-medium text-ink-900">{detectedCity}</span>
                        <span className="text-xs text-muted ml-auto">Ваш</span>
                      </button>
                    )}
                    {CITIES.filter(c => c !== detectedCity && c.toLowerCase().includes(cityInput.toLowerCase())).map(c => (
                      <button key={c} onClick={() => applyCity(c)}
                        className="w-full text-left px-4 py-2 text-sm text-muted hover:text-ink-900 hover:bg-paper-50 transition-colors">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Верифицированные */}
          <button onClick={() => setOnlyVerified(v => !v)} title="Только верифицированные сервисы"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all font-medium
              ${onlyVerified ? 'border-green-500 bg-green-50 text-green-700' : 'border-line bg-white text-muted hover:border-graphite-900/30 hover:text-ink-900'}`}>
            <span className="text-base leading-none">✅</span>
            <span className="hidden sm:inline">Проверенные</span>
          </button>

        </div>

        {/* Счётчик результатов */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted">
              {totalCount === 0 ? 'Ничего не найдено' :
                `${totalCount} ${totalCount === 1 ? 'сервис' : totalCount < 5 ? 'сервиса' : 'сервисов'}`}
              {city ? ` в ${city}` : ''}
              {search ? ` по запросу «${search}»` : ''}
            </p>
            {(city || search || activeCategory || onlyVerified) && (
              <button onClick={() => {
                setSearch(''); setSearchInput(''); setActiveCategory('');
                clearCity(); setOnlyVerified(false);
              }} className="text-xs text-muted hover:text-ink-900 underline underline-offset-2">
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Скелетон */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} />)}
          </div>
        )}

        {/* Пусто */}
        {!loading && totalCount === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-20">🔍</div>
            <h3 className="text-lg font-semibold text-ink-900 mb-2">Ничего не найдено</h3>
            <p className="text-sm text-muted mb-5">
              {city ? `Нет сервисов в ${city} по вашему запросу` : 'Попробуйте изменить параметры поиска'}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              {city && (
                <button onClick={clearCity}
                  className="text-sm text-volt-600 border border-volt-600/30 px-4 py-2 rounded-xl hover:bg-volt-600/5 transition-colors">
                  Показать по всей России
                </button>
              )}
              {(search || activeCategory) && (
                <button onClick={() => { setSearch(''); setSearchInput(''); setActiveCategory(''); }}
                  className="text-sm text-muted border border-line px-4 py-2 rounded-xl hover:bg-paper-50 transition-colors">
                  Сбросить поиск
                </button>
              )}
            </div>
          </div>
        )}

        {/* Сетка — с разделением по городу */}
        {!loading && totalCount > 0 && city && inCity.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                📍 В {city}
              </span>
              <div className="flex-1 h-px bg-line" />
              <span className="text-xs text-muted">{inCity.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {inCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
            </div>

            {outCity.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                    🗺 Другие города
                  </span>
                  <div className="flex-1 h-px bg-line" />
                  <span className="text-xs text-muted">{outCity.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {outCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* Сетка без разделения */}
        {!loading && totalCount > 0 && (!city || inCity.length === 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
          </div>
        )}

        {/* CTA для партнёров */}
        {!loading && (
          <div className="mt-12 bg-ink-900 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-white font-bold text-lg mb-1">Ваш сервис здесь</h3>
              <p className="text-sm" style={{ color: '#B7C0D1' }}>
                Разместите страницу бесплатно и получайте заявки от владельцев EV
              </p>
            </div>
            <a href="/partner"
              className="shrink-0 px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ background: '#3DDBFF', color: '#0B1220' }}>
              Разместить сервис →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1200px] mx-auto px-4 py-8">
        <div className="h-8 bg-paper-50 rounded-lg w-64 animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} />)}
        </div>
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}

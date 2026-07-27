'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Category { id: string; name: string; slug: string; }
interface Provider {
  id: string; name: string; slug: string; tagline?: string;
  city?: string; logoUrl?: string; ratingAvg?: number; reviewCount: number;
  isPaidPlacement: boolean; verified: boolean; viewCount?: number;
  services: string[]; brands: string[];
  category: { name: string; slug: string };
}

const CATEGORY_ICONS: Record<string, string> = {
  'sto':'🔧','zaryadki-dom':'🔌','ustanovka':'⚡','strahovanie':'🛡️',
  'vykup':'🚗','obuchenie':'📚','arenda':'🔑','tyuning':'⚙️','default':'🏪',
};

const POPULAR_CITIES = [
  'Москва','Санкт-Петербург','Новосибирск','Екатеринбург',
  'Казань','Краснодар','Нижний Новгород','Сочи','Владивосток','Тюмень',
];

function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Загружаем GeoIP при первом открытии (если нет city в URL и нет в cookie)
  useEffect(() => {
    const saved = typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('proev_city='))?.split('=')[1]
      : null;

    if (saved) {
      const decoded = decodeURIComponent(saved);
      setDetectedCity(decoded);
      if (!city) setCity(decoded);
      return;
    }

    setCityLoading(true);
    fetch(`${api}/geoip/city`)
      .then(r => r.json())
      .then(data => {
        if (data.city) {
          setDetectedCity(data.city);
          // Предлагаем но не применяем автоматически — пусть выберет
          // Сохраняем в cookie на 7 дней
          const exp = new Date(Date.now() + 7 * 86400000).toUTCString();
          document.cookie = `proev_city=${encodeURIComponent(data.city)};expires=${exp};path=/`;
        }
      })
      .catch(() => {})
      .finally(() => setCityLoading(false));
  }, []);

  // Загружаем категории один раз
  useEffect(() => {
    fetch(`${api}/service-providers/categories`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Загружаем провайдеров при изменении фильтров
  const loadProviders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (city) params.set('city', city);
    if (search.trim()) params.set('search', search.trim());

    try {
      const data = await fetch(`${api}/service-providers?${params}`).then(r => r.json());
      setProviders(Array.isArray(data) ? data : []);
    } catch { setProviders([]); }
    setLoading(false);
  }, [activeCategory, city, search]);

  useEffect(() => {
    const t = setTimeout(loadProviders, search ? 350 : 0); // debounce поиска
    return () => clearTimeout(t);
  }, [loadProviders]);

  // Обновляем URL при изменении фильтров
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory) params.set('category', activeCategory);
    if (city) params.set('city', city);
    if (search) params.set('q', search);
    const q = params.toString();
    router.replace(q ? `/services?${q}` : '/services', { scroll: false });
  }, [activeCategory, city, search]);

  const applyCity = (c: string) => {
    setCity(c);
    setShowCityDropdown(false);
    const exp = new Date(Date.now() + 7 * 86400000).toUTCString();
    document.cookie = `proev_city=${encodeURIComponent(c)};expires=${exp};path=/`;
  };

  const clearCity = () => {
    setCity('');
    document.cookie = 'proev_city=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
  };

  // Сортируем: сначала по городу (если задан), потом платные, потом верифицированные
  const sorted = [...providers].sort((a, b) => {
    if (city) {
      const aCity = (a.city || '').toLowerCase().includes(city.toLowerCase());
      const bCity = (b.city || '').toLowerCase().includes(city.toLowerCase());
      if (aCity && !bCity) return -1;
      if (!aCity && bCity) return 1;
    }
    if (b.isPaidPlacement !== a.isPaidPlacement) return b.isPaidPlacement ? 1 : -1;
    if (b.verified !== a.verified) return b.verified ? 1 : -1;
    return (b.viewCount || 0) - (a.viewCount || 0);
  });

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-8">

      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-[24px] md:text-[30px] font-bold text-ink-900 tracking-tight mb-1">
          Сервисы для электромобилей
        </h1>
        <p className="text-sm text-muted">
          {providers.length > 0
            ? `${providers.length} ${providers.length === 1 ? 'сервис' : providers.length < 5 ? 'сервиса' : 'сервисов'}${city ? ` в ${city}` : ''}`
            : 'Проверенные СТО, зарядки и услуги для EV по всей России'}
        </p>
      </div>

      {/* GeoIP баннер — предлагаем город если не выбран */}
      {detectedCity && !city && (
        <div className="flex items-center gap-3 bg-volt-600/8 border border-volt-600/20 rounded-xl px-4 py-3 mb-5">
          <span className="text-base">📍</span>
          <p className="text-sm text-ink-900 flex-1">
            Кажется, вы в <strong>{detectedCity}</strong> — показать сервисы в вашем городе?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => applyCity(detectedCity)}
              className="text-sm font-semibold text-white bg-volt-600 px-4 py-1.5 rounded-lg hover:bg-volt-700 transition-colors"
            >
              Да, показать
            </button>
            <button
              onClick={() => setDetectedCity(null)}
              className="text-sm text-muted px-3 py-1.5 rounded-lg hover:bg-paper-50 transition-colors"
            >
              Нет
            </button>
          </div>
        </div>
      )}

      {/* Строка поиска и фильтр по городу */}
      <div className="flex gap-2 mb-5">
        {/* Поиск */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Найти сервис, услугу, марку EV..."
            className="w-full pl-9 pr-9 py-2.5 text-sm border border-line rounded-xl focus:outline-none focus:border-volt-600 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-900"
            >
              ✕
            </button>
          )}
        </div>

        {/* Фильтр города */}
        <div className="relative">
          <button
            onClick={() => setShowCityDropdown(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border transition-colors whitespace-nowrap ${
              city
                ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                : 'border-line text-muted hover:border-graphite-900/30 hover:text-ink-900 bg-white'
            }`}
          >
            📍 {city || 'Город'}
            {city && (
              <span
                onClick={e => { e.stopPropagation(); clearCity(); }}
                className="ml-1 text-volt-600/70 hover:text-volt-600 text-xs font-bold"
              >
                ✕
              </span>
            )}
          </button>

          {showCityDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowCityDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-line rounded-xl shadow-lg overflow-hidden w-52">
                <div className="p-2 border-b border-line">
                  <input
                    autoFocus
                    placeholder="Введите город..."
                    className="w-full text-sm px-3 py-1.5 border border-line rounded-lg focus:outline-none focus:border-volt-600"
                    onChange={e => {
                      const val = e.target.value;
                      if (val.length > 2) applyCity(val);
                    }}
                  />
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {detectedCity && (
                    <button
                      onClick={() => applyCity(detectedCity)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-paper-50 transition-colors flex items-center gap-2"
                    >
                      <span className="text-volt-600">📍</span>
                      <span className="text-ink-900 font-medium">{detectedCity}</span>
                      <span className="text-xs text-muted ml-auto">Ваш город</span>
                    </button>
                  )}
                  {POPULAR_CITIES.filter(c => c !== detectedCity).map(c => (
                    <button
                      key={c}
                      onClick={() => applyCity(c)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-paper-50 transition-colors text-muted hover:text-ink-900"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Фильтры по категориям */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
            !activeCategory
              ? 'bg-ink-900 text-white border-ink-900'
              : 'border-line text-muted hover:border-graphite-900/30 hover:text-ink-900'
          }`}
        >
          Все
          <span className={`text-[11px] ${!activeCategory ? 'text-white/70' : 'text-muted'}`}>
            {providers.length}
          </span>
        </button>
        {categories.map(cat => {
          const count = providers.filter(p => p.category.slug === cat.slug).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.slug ? '' : cat.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                activeCategory === cat.slug
                  ? 'bg-ink-900 text-white border-ink-900'
                  : 'border-line text-muted hover:border-graphite-900/30 hover:text-ink-900'
              }`}
            >
              <span>{CATEGORY_ICONS[cat.slug] || CATEGORY_ICONS['default']}</span>
              {cat.name}
              <span className={`text-[11px] ${activeCategory === cat.slug ? 'text-white/70' : 'text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Список сервисов */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white border border-line rounded-xl p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-paper-50" />
                <div className="flex-1">
                  <div className="h-4 bg-paper-50 rounded mb-2 w-3/4" />
                  <div className="h-3 bg-paper-50 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-paper-50 rounded mb-2" />
              <div className="h-3 bg-paper-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 opacity-20">🏪</div>
          <h3 className="text-lg font-semibold text-ink-900 mb-2">Ничего не найдено</h3>
          <p className="text-sm text-muted mb-4">
            {city ? `Нет сервисов в ${city} по вашему запросу` : 'Попробуйте изменить фильтры'}
          </p>
          {city && (
            <button onClick={clearCity} className="text-sm text-volt-600 underline underline-offset-2">
              Показать по всей России
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Разделитель "В вашем городе" */}
          {city && sorted.some(p => (p.city || '').toLowerCase().includes(city.toLowerCase())) && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                📍 В {city}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {sorted
                  .filter(p => (p.city || '').toLowerCase().includes(city.toLowerCase()))
                  .map(p => <ProviderCard key={p.id} provider={p} searchQuery={search} />)}
              </div>

              {sorted.some(p => !(p.city || '').toLowerCase().includes(city.toLowerCase())) && (
                <>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                    🗺️ Другие города
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted
                      .filter(p => !(p.city || '').toLowerCase().includes(city.toLowerCase()))
                      .map(p => <ProviderCard key={p.id} provider={p} searchQuery={search} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Без фильтра города — обычная сетка */}
          {!city && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map(p => <ProviderCard key={p.id} provider={p} searchQuery={search} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Подсветка совпадений поиска ──────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-volt-400/30 text-ink-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Карточка провайдера ──────────────────────────────────────────────────────

function ProviderCard({ provider: p, searchQuery = '' }: { provider: Provider; searchQuery?: string }) {
  return (
    <a href={`/services/${p.slug}`}
      className="group block bg-white border border-line rounded-xl p-5 hover:border-graphite-900/30 hover:shadow-sm transition-all">

      <div className="flex gap-3 mb-3">
        {/* Логотип или инициалы */}
        <div className="w-11 h-11 rounded-xl bg-paper-50 border border-line flex items-center justify-center overflow-hidden shrink-0">
          {p.logoUrl
            ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            : <span className="text-base font-bold text-ink-900 opacity-40">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-ink-900 text-sm leading-snug truncate group-hover:text-volt-600 transition-colors">
              <Highlight text={p.name} query={searchQuery} />
            </span>
            {p.verified && (
              <span title="Верифицирован proev.ru" className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">
                ✅
              </span>
            )}
            {p.isPaidPlacement && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
                ⭐
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-muted">{CATEGORY_ICONS[p.category.slug] || '🏪'} {p.category.name}</span>
            {p.city && <>
              <span className="text-muted text-[11px]">·</span>
              <span className="text-[11px] text-muted truncate">
                <Highlight text={p.city} query={searchQuery} />
              </span>
            </>}
          </div>
        </div>
      </div>

      {p.tagline && (
        <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-3">
          <Highlight text={p.tagline} query={searchQuery} />
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
            <span className="text-[11px] text-muted px-1">+{p.services.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        {/* Рейтинг */}
        {p.reviewCount > 0 ? (
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-xs">★</span>
            <span className="text-xs font-semibold text-ink-900">
              {p.ratingAvg?.toFixed(1)}
            </span>
            <span className="text-xs text-muted">({p.reviewCount})</span>
          </div>
        ) : (
          <span className="text-[11px] text-muted">Новый партнёр</span>
        )}

        <span className="text-xs text-volt-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Подробнее →
        </span>
      </div>
    </a>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1120px] mx-auto px-4 py-8">
        <div className="h-8 bg-paper-50 rounded w-64 animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-paper-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import CitySelect from '@/components/CitySelect';
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

// Подсветка совпадений поиска
function Hl({ text, q }: { text: string; q: string }) {
  if (!q.trim() || !text) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>{text.slice(0, i)}
    <mark style={{ background: '#FEF3CD', color: 'inherit', borderRadius: 2, padding: '0 2px' }}>
      {text.slice(i, i + q.length)}
    </mark>
    {text.slice(i + q.length)}</>
  );
}

// Карточка провайдера
function ProviderCard({ p, q = '' }: { p: Provider; q?: string }) {
  const stripColor = p.isPaidPlacement
    ? 'linear-gradient(90deg,#F59E0B,#EF9F27)'
    : p.verified ? 'linear-gradient(90deg,#1D9E75,#0BA5CC)'
    : '#E5E7EB';

  return (
    <a href={`/services/${p.slug}`} style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none' }}
      className="group bg-white border border-line rounded-2xl overflow-hidden hover:shadow-md hover:border-graphite-900/20 transition-all duration-200">
      {/* Цветная полоска сверху */}
      <div style={{ height: 3, background: stripColor, flexShrink: 0 }} />

      <div className="p-4 flex flex-col" style={{ flex: 1 }}>
        {/* Шапка */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          {/* Логотип */}
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: '#F9F8F5', border: '1px solid #DCE1E8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {p.logoUrl
              ? <img src={p.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              : <span style={{ fontSize: 16, fontWeight: 700, color: '#B4B2A9' }}>
                  {(p.name[0] || '?').toUpperCase()}
                </span>
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
              <span className="group-hover:text-volt-600" style={{
                fontSize: 13, fontWeight: 600, color: '#10192B', lineHeight: 1.3,
                transition: 'color 0.15s', wordBreak: 'break-word',
              }}>
                <Hl text={p.name} q={q} />
              </span>
              {p.isPaidPlacement && (
                <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF3CD', color: '#B45309', padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>ТОП</span>
              )}
              {p.verified && (
                <span style={{ fontSize: 9, fontWeight: 700, background: '#DCFCE7', color: '#15803D', padding: '2px 6px', borderRadius: 20, flexShrink: 0 }}>✓ Проверен</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#6B7686' }}>
                {CAT_ICONS[p.category.slug] || '🏪'} {p.category.name}
              </span>
              {p.city && (
                <><span style={{ fontSize: 11, color: '#B4B2A9' }}>·</span>
                <span style={{ fontSize: 11, color: '#6B7686' }}><Hl text={p.city} q={q} /></span></>
              )}
            </div>
          </div>
        </div>

        {/* Слоган */}
        {p.tagline && (
          <p style={{ fontSize: 12, color: '#6B7686', lineHeight: 1.5, marginBottom: 10,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <Hl text={p.tagline} q={q} />
          </p>
        )}

        {/* Марки EV */}
        {p.brands.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {p.brands.slice(0, 4).map(b => (
              <span key={b} style={{
                fontSize: 10, background: '#EFF6FF', color: '#1D4ED8',
                padding: '2px 7px', borderRadius: 20, fontWeight: 500,
              }}>{b}</span>
            ))}
            {p.brands.length > 4 && <span style={{ fontSize: 10, color: '#6B7686' }}>+{p.brands.length - 4}</span>}
          </div>
        )}

        {/* Услуги */}
        {p.services.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
            {p.services.slice(0, 3).map(s => (
              <span key={s} style={{
                fontSize: 11, background: '#F9F8F5', border: '1px solid #DCE1E8',
                color: '#6B7686', padding: '2px 8px', borderRadius: 20,
              }}>{s}</span>
            ))}
            {p.services.length > 3 && <span style={{ fontSize: 11, color: '#B4B2A9' }}>+{p.services.length - 3}</span>}
          </div>
        )}

        {/* Футер */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #DCE1E8' }}>
          {p.reviewCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#F59E0B', fontSize: 12 }}>★</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10192B' }}>{p.ratingAvg?.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: '#B4B2A9' }}>({p.reviewCount})</span>
            </div>
          ) : (
            <span style={{ fontSize: 11, color: '#B4B2A9' }}>Новый</span>
          )}
          <span className="group-hover:opacity-100" style={{
            fontSize: 12, color: '#0BA5CC', fontWeight: 500,
            opacity: 0, transition: 'opacity 0.15s',
          }}>Подробнее →</span>
        </div>
      </div>
    </a>
  );
}

// Скелетон
function Skeleton() {
  return (
    <div style={{ background: '#fff', border: '1px solid #DCE1E8', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: 3, background: '#F1EFE8' }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#F1EFE8', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, background: '#F1EFE8', borderRadius: 6, marginBottom: 8, width: '75%' }} />
            <div style={{ height: 11, background: '#F1EFE8', borderRadius: 6, width: '50%' }} />
          </div>
        </div>
        <div style={{ height: 11, background: '#F1EFE8', borderRadius: 6, marginBottom: 6 }} />
        <div style={{ height: 11, background: '#F1EFE8', borderRadius: 6, width: '70%' }} />
      </div>
    </div>
  );
}

// Основной контент
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
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [geoHidden, setGeoHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    const saved = document.cookie.split(';').find(c => c.trim().startsWith('proev_city='))?.split('=')[1];
    if (saved) { const d = decodeURIComponent(saved); setDetectedCity(d); if (!city) setCity(d); return; }
    fetch(`${api}/geoip/city`).then(r => r.json()).then(d => { if (d.city) setDetectedCity(d.city); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${api}/service-providers/categories`).then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

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

  useEffect(() => {
    const p = new URLSearchParams();
    if (activeCategory) p.set('category', activeCategory);
    if (city) p.set('city', city);
    if (search) p.set('q', search);
    router.replace(p.toString() ? `/services?${p}` : '/services', { scroll: false });
  }, [activeCategory, city, search]);

  const handleSearch = (v: string) => {
    setSearchInput(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSearch(v), 350);
  };

  const applyCity = (c: string) => {
    setCity(c); setGeoHidden(true);
    document.cookie = `proev_city=${encodeURIComponent(c)};max-age=${7 * 86400};path=/`;
  };

  const clearCity = () => {
    setCity('');
    document.cookie = 'proev_city=;max-age=0;path=/';
  };

  const clearAll = () => {
    setSearch(''); setSearchInput(''); setActiveCategory(''); clearCity(); setOnlyVerified(false);
  };

  const filtered = providers.filter(p => !onlyVerified || p.verified);
  const inCity = city ? filtered.filter(p => (p.city || '').toLowerCase().includes(city.toLowerCase())) : [];
  const outCity = city ? filtered.filter(p => !(p.city || '').toLowerCase().includes(city.toLowerCase())) : filtered;
  const hasFilters = !!(search || activeCategory || city || onlyVerified);

  const catCounts = categories.map(c => ({
    ...c, count: providers.filter(p => p.category.slug === c.slug).length,
  }));

  // CSS для скрытия скроллбара кроссбраузерно
  const scrollStyle: React.CSSProperties = {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9F8F5' }}>

      {/* Шапка */}
      <div style={{ background: '#fff', borderBottom: '1px solid #DCE1E8' }}>
        <div className="max-w-[1200px] mx-auto px-4 md:px-6" style={{ paddingTop: 24, paddingBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: '#10192B', marginBottom: 4 }}>
            Сервисы для электромобилей
          </h1>
          <p style={{ fontSize: 14, color: '#6B7686' }}>
            Проверенные СТО, зарядные станции и услуги для EV по всей России
          </p>
        </div>
      </div>

      {/* GeoIP баннер */}
      {detectedCity && !city && !geoHidden && (
        <div style={{ background: 'rgba(11,165,204,0.08)', borderBottom: '1px solid rgba(11,165,204,0.2)' }}>
          <div className="max-w-[1200px] mx-auto px-4 md:px-6"
            style={{ paddingTop: 10, paddingBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>📍</span>
            <p style={{ fontSize: 13, color: '#10192B', flex: 1, minWidth: 200 }}>
              Вы в <strong>{detectedCity}</strong> — показать сервисы рядом?
            </p>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => applyCity(detectedCity)} style={{
                fontSize: 12, fontWeight: 600, color: '#fff', background: '#0BA5CC',
                border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              }}>Показать</button>
              <button onClick={() => setGeoHidden(true)} style={{
                fontSize: 12, color: '#6B7686', background: 'none',
                border: 'none', cursor: 'pointer', padding: '6px 0',
              }}>Нет</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6" style={{ paddingTop: 20, paddingBottom: 40 }}>

        {/* Строка 1: поиск + город + верифицированные */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>

          {/* Поиск */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#B4B2A9', pointerEvents: 'none', lineHeight: 1 }}>🔍</span>
            <input
              value={searchInput}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Название, услуга, марка EV..."
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 34, paddingRight: searchInput ? 30 : 12,
                paddingTop: 10, paddingBottom: 10,
                fontSize: 14, border: '1px solid #DCE1E8', borderRadius: 12,
                outline: 'none', background: '#fff', color: '#10192B',
                WebkitAppearance: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = '#0BA5CC'; }}
              onBlur={e => { e.target.style.borderColor = '#DCE1E8'; }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch(''); }} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#B4B2A9', padding: 4, lineHeight: 1,
              }}>✕</button>
            )}
          </div>

          {/* Город */}
          <CitySelect
            value={city}
            onChange={c => { applyCity(c); }}
            placeholder="Выберите город"
            style={{ flexShrink: 0, minWidth: 180 }}
          />

          {/* Верифицированные */}
          <button onClick={() => setOnlyVerified(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', fontSize: 13, fontWeight: 500,
            border: onlyVerified ? '1px solid #22C55E' : '1px solid #DCE1E8',
            borderRadius: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            background: onlyVerified ? '#F0FDF4' : '#fff',
            color: onlyVerified ? '#15803D' : '#6B7686',
            WebkitAppearance: 'none',
          }}>
            ✅
            <span className="hidden sm:inline">Проверенные</span>
          </button>
        </div>

        {/* Строка 2: категории */}
        <div style={{ ...scrollStyle, display: 'flex', gap: 6, paddingBottom: 4, marginBottom: 16 }}>
          <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>

          {/* Все */}
          <button onClick={() => setActiveCategory('')} style={{
            display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
            padding: '8px 14px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
            border: !activeCategory ? '1px solid #0B1220' : '1px solid #DCE1E8',
            borderRadius: 20, cursor: 'pointer',
            background: !activeCategory ? '#0B1220' : '#fff',
            color: !activeCategory ? '#fff' : '#6B7686',
          }}>
            Все
            <span style={{ fontSize: 10, opacity: 0.6 }}>{providers.length}</span>
          </button>

          {catCounts.map(cat => (
            <button key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.slug ? '' : cat.slug)} style={{
                display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                padding: '8px 14px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
                border: activeCategory === cat.slug ? '1px solid #0B1220' : '1px solid #DCE1E8',
                borderRadius: 20, cursor: 'pointer',
                background: activeCategory === cat.slug ? '#0B1220' : '#fff',
                color: activeCategory === cat.slug ? '#fff' : '#6B7686',
              }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{CAT_ICONS[cat.slug] || '🏪'}</span>
              {cat.name}
              <span style={{ fontSize: 10, opacity: 0.6 }}>{cat.count}</span>
            </button>
          ))}
        </div>

        {/* Счётчик и сброс */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#6B7686' }}>
              {filtered.length === 0 ? 'Ничего не найдено'
                : `${filtered.length} ${filtered.length === 1 ? 'сервис' : filtered.length < 5 ? 'сервиса' : 'сервисов'}`
              }
              {city ? ` в ${city}` : ''}
              {search ? ` · «${search}»` : ''}
            </p>
            {hasFilters && (
              <button onClick={clearAll} style={{
                fontSize: 12, color: '#6B7686', background: 'none', border: 'none',
                cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2,
              }}>
                Сбросить фильтры
              </button>
            )}
          </div>
        )}

        {/* Скелетон */}
        {loading && (
          <div style={{ display: 'grid', gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} />)}
          </div>
        )}

        {/* Пусто */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>🔍</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#10192B', marginBottom: 8 }}>Ничего не найдено</h3>
            <p style={{ fontSize: 13, color: '#6B7686', marginBottom: 20 }}>
              {city ? `Нет сервисов в ${city} по вашему запросу` : 'Попробуйте изменить параметры поиска'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {city && (
                <button onClick={clearCity} style={{
                  fontSize: 13, color: '#0BA5CC', background: 'none',
                  border: '1px solid rgba(11,165,204,0.4)', borderRadius: 10,
                  padding: '8px 16px', cursor: 'pointer',
                }}>Показать по всей России</button>
              )}
              {(search || activeCategory) && (
                <button onClick={() => { setSearch(''); setSearchInput(''); setActiveCategory(''); }} style={{
                  fontSize: 13, color: '#6B7686', background: 'none',
                  border: '1px solid #DCE1E8', borderRadius: 10,
                  padding: '8px 16px', cursor: 'pointer',
                }}>Сбросить поиск</button>
              )}
            </div>
          </div>
        )}

        {/* Сетка — responsive auto-fill */}
        {!loading && filtered.length > 0 && (
          <>
            {city && inCity.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7686', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    📍 В {city}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#DCE1E8' }} />
                  <span style={{ fontSize: 11, color: '#B4B2A9' }}>{inCity.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 14, marginBottom: 24,
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
                  {inCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
                </div>

                {outCity.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7686', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        🗺 Другие города
                      </span>
                      <div style={{ flex: 1, height: 1, background: '#DCE1E8' }} />
                      <span style={{ fontSize: 11, color: '#B4B2A9' }}>{outCity.length}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 14,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
                      {outCity.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ display: 'grid', gap: 14,
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))' }}>
                {filtered.map(p => <ProviderCard key={p.id} p={p} q={search} />)}
              </div>
            )}
          </>
        )}

        {/* CTA */}
        {!loading && (
          <div style={{
            marginTop: 48, background: '#0B1220', borderRadius: 20,
            padding: 'clamp(20px, 4vw, 32px)',
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                Ваш сервис здесь
              </h3>
              <p style={{ fontSize: 13, color: '#B7C0D1' }}>
                Разместите страницу бесплатно и получайте заявки от владельцев EV
              </p>
            </div>
            <a href="/partner" style={{
              flexShrink: 0, padding: '12px 24px', borderRadius: 12,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              background: '#3DDBFF', color: '#0B1220', whiteSpace: 'nowrap',
            }}>
              Разместить сервис →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return <ServicesContent />;
}

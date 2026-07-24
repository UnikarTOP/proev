'use client';

import { useEffect, useState } from 'react';

interface Category { id: string; name: string; slug: string; }
interface Provider {
  id: string; name: string; slug: string; tagline?: string; description?: string;
  city?: string; logoUrl?: string; ratingAvg?: number; reviewCount: number;
  isPaidPlacement: boolean; verified: boolean;
  services: string[]; brands: string[];
  category: { name: string; slug: string };
}

const CATEGORY_ICONS: Record<string, string> = {
  'sto': 'ti-tool', 'zaryadki': 'ti-plug', 'strahovanie': 'ti-shield-check',
  'vykup': 'ti-car', 'obuchenie': 'ti-certificate', 'default': 'ti-category',
};

function getIcon(slug: string) {
  return CATEGORY_ICONS[slug] || CATEGORY_ICONS['default'];
}

export default function ServicesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    Promise.all([
      fetch(`${api}/service-providers/categories`).then(r => r.json()),
      fetch(`${api}/service-providers`).then(r => r.json()),
    ]).then(([cats, provs]) => {
      setCategories(cats);
      setProviders(provs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = activeCategory
    ? providers.filter(p => p.category.slug === activeCategory)
    : providers;

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-2">
        Каталог сервисов для электромобилей
      </h1>
      <p className="text-muted mb-6 text-sm">
        СТО, установка домашних зарядных станций, страхование и другие проверенные сервисы.
      </p>

      {/* Категории */}
      <div className="flex gap-2 flex-wrap mb-8">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-colors ${
            !activeCategory ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold' : 'border-line text-muted hover:border-graphite-900/30'
          }`}
        >
          <i className="ti ti-list text-sm" aria-hidden="true" />
          Все сервисы
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${!activeCategory ? 'bg-volt-600/20 text-volt-600' : 'bg-paper-50 text-muted'}`}>
            {providers.length}
          </span>
        </button>
        {categories.map(cat => {
          const count = providers.filter(p => p.category.slug === cat.slug).length;
          return (
            <button key={cat.id}
              onClick={() => setActiveCategory(cat.slug === activeCategory ? '' : cat.slug)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-full border transition-colors ${
                activeCategory === cat.slug ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold' : 'border-line text-muted hover:border-graphite-900/30'
              }`}
            >
              <i className={`ti ${getIcon(cat.slug)} text-sm`} aria-hidden="true" />
              {cat.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat.slug ? 'bg-volt-600/20 text-volt-600' : 'bg-paper-50 text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-5">
          {[0,1,2].map(i => <div key={i} className="animate-pulse bg-paper-50 rounded-xl h-64 border border-line" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-5xl mb-4 opacity-20"><i className="ti ti-building-store" aria-hidden="true" /></div>
          <p className="text-muted text-sm mb-2">Партнёров пока нет в этой категории.</p>
          <p className="text-muted text-sm">
            Хотите разместить свой сервис?{' '}
            <a href="mailto:partners@proev.ru" className="text-volt-600 underline underline-offset-2">Напишите нам</a>
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {filtered.map(p => <ProviderCard key={p.id} provider={p} />)}
        </div>
      )}

      {/* Блок для партнёров */}
      <div className="mt-12 bg-ink-900 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-white text-xl font-bold mb-2">Разместите свой сервис</h2>
          <p className="text-sm" style={{ color: '#6B7686' }}>
            Получайте заявки от владельцев электромобилей. Бесплатное базовое размещение.
          </p>
        </div>
        <a href="mailto:partners@proev.ru"
          className="shrink-0 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
          style={{ background: '#3DDBFF', color: '#0B1220' }}>
          Стать партнёром →
        </a>
      </div>
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  return (
    <a href={`/services/${provider.slug}`}
      className={`group block bg-white rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors ${
        provider.isPaidPlacement ? 'border-2' : 'border border-line'
      }`}
      style={provider.isPaidPlacement ? { borderColor: '#0BA5CC' } : {}}
    >
      {provider.isPaidPlacement && (
        <div className="px-4 py-1.5 text-[11px] font-semibold text-center"
          style={{ background: '#E6F1FB', color: '#185FA5' }}>
          ⭐ Партнёр proev.ru
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-paper-50 border border-line flex items-center justify-center shrink-0 overflow-hidden">
            {provider.logoUrl
              ? <img src={provider.logoUrl} alt="" className="w-full h-full object-cover" />
              : <i className={`ti ${getIcon(provider.category.slug)} text-xl text-muted`} aria-hidden="true" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
              <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-1.5 py-0.5 rounded-full">
                {provider.category.name}
              </span>
              {provider.verified && (
                <span className="text-[11px]" style={{ color: '#1D9E75' }}>
                  <i className="ti ti-rosette-discount-check" aria-hidden="true" />
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-ink-900 group-hover:text-volt-600 transition-colors leading-tight">
              {provider.name}
            </h3>
          </div>
        </div>

        {provider.city && (
          <p className="text-xs text-muted flex items-center gap-1 mb-2">
            <i className="ti ti-map-pin text-xs" aria-hidden="true" />
            {provider.city}
          </p>
        )}

        {provider.ratingAvg && (
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ color: '#EF9F27', fontSize: 12 }}>
              {'★'.repeat(Math.round(provider.ratingAvg))}
              {'☆'.repeat(5 - Math.round(provider.ratingAvg))}
            </span>
            <span className="text-xs font-semibold text-ink-900">{provider.ratingAvg.toFixed(1)}</span>
            <span className="text-xs text-muted">({provider.reviewCount})</span>
          </div>
        )}

        <p className="text-xs text-muted line-clamp-2 leading-relaxed mb-3">
          {provider.tagline || provider.description}
        </p>

        {provider.brands.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {provider.brands.slice(0, 3).map(b => (
              <span key={b} className="text-[11px] px-2 py-0.5 rounded bg-paper-50 border border-line text-muted">{b}</span>
            ))}
            {provider.brands.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-paper-50 border border-line text-muted">
                +{provider.brands.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-line flex items-center justify-between">
        <span className="text-xs text-volt-600 flex items-center gap-1 font-medium">
          Подробнее <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
        </span>
        <span className="text-xs text-muted">Оставить заявку</span>
      </div>
    </a>
  );
}

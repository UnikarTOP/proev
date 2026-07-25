'use client';

import { useState } from 'react';

interface Review {
  id: string;
  rating: number;
  text?: string;
  createdAt: string;
  author?: { name?: string };
}

interface Provider {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  city?: string;
  address?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  website?: string;
  email?: string;
  logoUrl?: string;
  photos: string[];
  services: string[];
  brands: string[];
  workingHours?: string;
  yearFounded?: number;
  isPaidPlacement: boolean;
  verified: boolean;
  ratingAvg?: number;
  reviewCount: number;
  category: { name: string; slug: string };
  reviews: Review[];
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'text-xl' : 'text-sm';
  return (
    <span className={sz} style={{ color: '#EF9F27', letterSpacing: '1px' }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(value) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

function LeadForm({ provider }: { provider: Provider }) {
  const [form, setForm] = useState({ name: '', phone: '', service: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.name || !form.phone) return;
    setLoading(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || '/api';
      await fetch(`${api}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          name: form.name,
          phone: form.phone,
          message: [form.service, form.message].filter(Boolean).join(' — '),
        }),
      });
      setSent(true);
    } catch {
      // показываем успех в любом случае (UX)
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) return (
    <div className="bg-ink-900 rounded-xl p-6 text-center">
      <div className="text-3xl mb-3" style={{ color: '#1D9E75' }}>
        <i className="ti ti-circle-check" aria-hidden="true" />
      </div>
      <p className="text-white font-semibold mb-1">Заявка отправлена</p>
      <p className="text-sm" style={{ color: '#6B7686' }}>
        {provider.name} свяжется с вами в течение 24 часов
      </p>
    </div>
  );

  return (
    <div className="bg-ink-900 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-1">Оставить заявку</h3>
      <p className="text-sm mb-4" style={{ color: '#6B7686' }}>Ответим в течение 24 часов</p>

      <div className="space-y-2">
        <input
          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Ваше имя"
          className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1"
          style={{ background: '#16233A', border: '0.5px solid #22304A', color: '#fff' }}
        />
        <input
          value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          placeholder="+7 (___) ___-__-__"
          className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1"
          style={{ background: '#16233A', border: '0.5px solid #22304A', color: '#fff' }}
        />
        {provider.services.length > 0 && (
          <select
            value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
            className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none"
            style={{ background: '#16233A', border: '0.5px solid #22304A', color: form.service ? '#fff' : '#6B7686' }}
          >
            <option value="">Какая услуга нужна?</option>
            {provider.services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <textarea
          value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          placeholder="Опишите проблему (необязательно)"
          rows={2}
          className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none resize-none"
          style={{ background: '#16233A', border: '0.5px solid #22304A', color: '#fff' }}
        />
        <button
          onClick={submit}
          disabled={loading || !form.name || !form.phone}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
          style={{ background: '#3DDBFF', color: '#0B1220' }}
        >
          {loading ? 'Отправляем...' : 'Отправить заявку →'}
        </button>
        <p className="text-[11px] text-center" style={{ color: '#6B7686' }}>
          Без предоплаты · Данные не передаются третьим лицам
        </p>
      </div>
    </div>
  );
}

export default function ServiceLanding({ provider }: { provider: Provider }) {
  const [showAllReviews, setShowAllReviews] = useState(false);
  const reviews = showAllReviews ? provider.reviews : provider.reviews.slice(0, 3);

  const yearsOnMarket = provider.yearFounded
    ? new Date().getFullYear() - provider.yearFounded
    : null;

  return (
    <div className="max-w-[880px] mx-auto px-4 py-8">
      {/* Хлебные крошки */}
      <nav className="text-sm mb-6 flex items-center gap-2 flex-wrap">
        <a href="/services" className="text-volt-600 hover:underline underline-offset-2 transition-colors">
          ← Все сервисы
        </a>
        <i className="ti ti-chevron-right text-xs text-muted" aria-hidden="true" />
        <a href={`/services?category=${provider.category.slug}`} className="text-muted hover:text-ink-900 hover:underline underline-offset-2 transition-colors">
          {provider.category.name}
        </a>
        <i className="ti ti-chevron-right text-xs text-muted" aria-hidden="true" />
        <span className="text-ink-900 font-medium truncate max-w-[200px]">{provider.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка — основной контент */}
        <div className="lg:col-span-2 space-y-4">

          {/* Герой */}
          <div className="bg-ink-900 rounded-xl p-6 text-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(61,219,255,.15)', color: '#3DDBFF', border: '0.5px solid rgba(61,219,255,.3)' }}>
                    {provider.category.name}
                  </span>
                  {provider.verified && (
                    <span className="text-xs font-semibold flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(29,158,117,.2)', color: '#5DCAA5' }}>
                      <i className="ti ti-rosette-discount-check text-sm" aria-hidden="true" />
                      Проверено proev.ru
                    </span>
                  )}
                  {provider.isPaidPlacement && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(255,176,32,.15)', color: '#FFB020' }}>
                      Партнёр
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold leading-tight mb-1">{provider.name}</h1>
                {provider.tagline && (
                  <p className="text-sm" style={{ color: '#B7C0D1' }}>{provider.tagline}</p>
                )}
              </div>
              {provider.logoUrl && (
                <img src={provider.logoUrl} alt={provider.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                  style={{ border: '0.5px solid #22304A' }} />
              )}
            </div>

            {/* Ключевые цифры */}
            <div className="grid grid-cols-4 gap-3 pt-4" style={{ borderTop: '0.5px solid #22304A' }}>
              {provider.ratingAvg && (
                <div>
                  <div className="font-mono text-lg font-bold">{provider.ratingAvg.toFixed(1)} ★</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7686' }}>Рейтинг</div>
                </div>
              )}
              {provider.reviewCount > 0 && (
                <div>
                  <div className="font-mono text-lg font-bold">{provider.reviewCount}</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7686' }}>Отзывов</div>
                </div>
              )}
              {yearsOnMarket && (
                <div>
                  <div className="font-mono text-lg font-bold">{yearsOnMarket} лет</div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7686' }}>На рынке</div>
                </div>
              )}
              <div>
                <div className="font-mono text-lg font-bold">24ч</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: '#6B7686' }}>Ответ</div>
              </div>
            </div>
          </div>

          {/* О сервисе */}
          {provider.description && (
            <div className="bg-white border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <i className="ti ti-info-circle text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                О сервисе
              </h2>
              <p className="text-sm text-muted leading-relaxed">{provider.description}</p>
            </div>
          )}

          {/* Услуги */}
          {provider.services.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <i className="ti ti-list-check text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                Услуги
              </h2>
              <div className="flex flex-wrap gap-2">
                {provider.services.map(s => (
                  <span key={s} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-line text-muted bg-paper-50">
                    <i className="ti ti-check text-xs" style={{ color: '#1D9E75' }} aria-hidden="true" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Марки */}
          {provider.brands.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <i className="ti ti-car text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                Работаем с марками
              </h2>
              <div className="flex flex-wrap gap-2">
                {provider.brands.map(b => (
                  <span key={b} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line text-ink-900 bg-white">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Фото */}
          {provider.photos.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <i className="ti ti-photo text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                Фото
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {provider.photos.slice(0, 6).map((url, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden bg-paper-50 border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Фото ${i+1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Отзывы */}
          {provider.reviews.length > 0 && (
            <div className="bg-white border border-line rounded-xl p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
                <i className="ti ti-star text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                Отзывы
                <span className="text-xs font-normal text-muted ml-1">{provider.reviewCount} отзывов</span>
              </h2>
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="pb-4 border-b border-line last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-ink-900">
                        {r.author?.name || 'Пользователь proev.ru'}
                      </span>
                      <Stars value={r.rating} />
                    </div>
                    {r.text && <p className="text-sm text-muted leading-relaxed">{r.text}</p>}
                    <p className="text-[11px] text-muted mt-1.5">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
              {provider.reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(v => !v)}
                  className="w-full mt-4 py-2 text-sm text-muted border border-line rounded-lg hover:border-graphite-900/30 hover:text-ink-900 transition-colors"
                >
                  {showAllReviews ? 'Скрыть' : `Все ${provider.reviewCount} отзывов`}
                </button>
              )}
            </div>
          )}

          {/* Мобильная форма (показывается под контентом на мобильных) */}
          <div className="lg:hidden">
            <LeadForm provider={provider} />
          </div>
        </div>

        {/* Правая колонка — контакты + форма (sticky на десктопе) */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">

          {/* Контакты */}
          <div className="bg-white border border-line rounded-xl p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <i className="ti ti-map-pin text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
              Контакты
            </h2>
            <div className="space-y-2.5 text-sm">
              {provider.city && (
                <div className="flex items-start gap-2 text-muted">
                  <i className="ti ti-building text-base shrink-0 mt-0.5" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                  <span>{provider.city}{provider.address && `, ${provider.address}`}</span>
                </div>
              )}
              {provider.workingHours && (
                <div className="flex items-center gap-2 text-muted">
                  <i className="ti ti-clock text-base shrink-0" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                  <span>{provider.workingHours}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {provider.phone && (
                <a href={`tel:${provider.phone}`}
                  className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg border border-line text-sm font-medium text-ink-900 hover:border-volt-600 hover:text-volt-600 transition-colors">
                  <i className="ti ti-phone text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                  {provider.phone}
                </a>
              )}
              {provider.telegram && (
                <a href={`https://t.me/${provider.telegram.replace('@','')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg border border-line text-sm font-medium text-ink-900 hover:border-volt-600 hover:text-volt-600 transition-colors">
                  <i className="ti ti-brand-telegram text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
                  Написать в Telegram
                </a>
              )}
              {provider.whatsapp && (
                <a href={`https://wa.me/${provider.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg border border-line text-sm font-medium text-ink-900 hover:border-volt-600 hover:text-volt-600 transition-colors">
                  <i className="ti ti-brand-whatsapp text-base" style={{ color: '#25D366' }} aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {provider.website && (
                <a href={provider.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 px-3 rounded-lg border border-line text-sm font-medium text-muted hover:text-ink-900 transition-colors">
                  <i className="ti ti-world text-base" aria-hidden="true" />
                  Сайт компании
                  <i className="ti ti-external-link text-xs ml-auto" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          {/* Форма заявки — только на десктопе */}
          <div className="hidden lg:block">
            <LeadForm provider={provider} />
          </div>
        </div>
      </div>
    </div>
  );
}

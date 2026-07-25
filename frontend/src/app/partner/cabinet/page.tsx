'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const MULTI_SELECT_SEPARATOR = '|||';

interface Provider {
  id: string; name: string; slug: string; tagline?: string;
  description?: string; city?: string; address?: string;
  phone?: string; telegram?: string; whatsapp?: string;
  website?: string; email?: string; logoUrl?: string;
  photos: string[]; services: string[]; brands: string[];
  workingHours?: string; yearFounded?: number;
  isPublished: boolean; category: { name: string; slug: string };
}

interface Me { id: string; name: string; email: string; provider: Provider | null; }

export default function CabinetPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState<Partial<Provider>>({});
  const [evModels, setEvModels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [newService, setNewService] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Инициализация — проверяем токен в localStorage
  useEffect(() => {
    const t = localStorage.getItem('partner_token');
    if (t) setToken(t);
  }, []);

  // Загружаем профиль при наличии токена
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${api}/partners/me`, { headers: { 'X-Partner-Token': token } }).then(r => r.ok ? r.json() : null),
      fetch(`${api}/partners/ev-models`).then(r => r.json()).catch(() => ({ models: [] })),
    ]).then(([meData, modelsData]) => {
      if (!meData) { localStorage.removeItem('partner_token'); setToken(null); return; }
      setMe(meData);
      if (meData.provider) setForm(meData.provider);
      setEvModels(modelsData.models || []);
    });
  }, [token]);

  const login = async () => {
    setLoginError('');
    try {
      const res = await fetch(`${api}/partners/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) { setLoginError('Неверный email или пароль'); return; }
      const data = await res.json();
      localStorage.setItem('partner_token', data.token);
      setToken(data.token);
    } catch { setLoginError('Ошибка соединения'); }
  };

  const save = async (publish?: boolean) => {
    if (!token) return;
    setSaving(true);
    try {
      const body = { ...form };
      if (publish !== undefined) body.isPublished = publish;
      const res = await fetch(`${api}/partners/provider`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Partner-Token': token },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setForm(updated);
        setMe(m => m ? { ...m, provider: updated } : m);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    setSaving(false);
  };

  const toggleBrand = (brand: string) => {
    setForm(f => ({
      ...f,
      brands: f.brands?.includes(brand)
        ? f.brands.filter(b => b !== brand)
        : [...(f.brands || []), brand],
    }));
  };

  const addService = () => {
    if (!newService.trim()) return;
    setForm(f => ({ ...f, services: [...(f.services || []), newService.trim()] }));
    setNewService('');
  };

  const removeService = (s: string) => setForm(f => ({ ...f, services: f.services?.filter(x => x !== s) }));

  const addPhoto = () => {
    if (!newPhoto.trim()) return;
    setForm(f => ({ ...f, photos: [...(f.photos || []), newPhoto.trim()] }));
    setNewPhoto('');
  };

  const removePhoto = (url: string) => setForm(f => ({ ...f, photos: f.photos?.filter(x => x !== url) }));

  // ── Экран входа ──────────────────────────────────────────────────────────
  if (!token) return (
    <div className="max-w-[400px] mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-ink-900 mb-2">Личный кабинет партнёра</h1>
        <p className="text-muted text-sm">Войдите чтобы редактировать свою страницу</p>
      </div>
      <div className="bg-white border border-line rounded-2xl p-6 space-y-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Email</label>
          <input type="email" value={loginForm.email}
            onChange={e => setLoginForm(f => ({...f, email: e.target.value}))}
            placeholder="info@evservice.ru"
            className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Пароль</label>
          <input type="password" value={loginForm.password}
            onChange={e => setLoginForm(f => ({...f, password: e.target.value}))}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Пришёл в письме при одобрении"
            className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
        </div>
        {loginError && <p className="text-xs text-red-500">{loginError}</p>}
        <button onClick={login}
          className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold">
          Войти
        </button>
        <p className="text-center text-xs text-muted">
          Нет аккаунта?{' '}
          <a href="/partner" className="text-volt-600 underline underline-offset-2">Подать заявку</a>
        </p>
      </div>
    </div>
  );

  if (!me) return (
    <div className="flex items-center justify-center h-64 text-muted text-sm">
      <i className="ti ti-loader-2 text-2xl animate-spin mr-2" aria-hidden="true" /> Загружаем кабинет...
    </div>
  );

  if (!me.provider) return (
    <div className="max-w-[560px] mx-auto px-6 py-16 text-center">
      <div className="text-5xl mb-4 opacity-30"><i className="ti ti-building-store" aria-hidden="true" /></div>
      <h2 className="text-xl font-bold text-ink-900 mb-2">Страница ещё не создана</h2>
      <p className="text-muted text-sm">Обратитесь в поддержку, мы создадим вашу страницу и вы сможете её заполнить.</p>
      <a href="mailto:partners@proev.ru" className="mt-4 inline-block text-sm text-volt-600 underline underline-offset-2">
        partners@proev.ru
      </a>
    </div>
  );

  const p = form;

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Шапка кабинета */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Личный кабинет</h1>
          <p className="text-sm text-muted">{me.name} · {me.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <i className="ti ti-check" aria-hidden="true" /> Сохранено
            </span>
          )}
          {p.slug && (
            <a href={`/services/${p.slug}`} target="_blank"
              className="text-sm text-volt-600 border border-volt-600 px-4 py-2 rounded-xl hover:bg-volt-600/10 transition-colors">
              <i className="ti ti-external-link text-xs mr-1" aria-hidden="true" />
              Просмотр страницы
            </a>
          )}
          <button onClick={() => { localStorage.removeItem('partner_token'); setToken(null); }}
            className="text-sm text-muted border border-line px-3 py-2 rounded-xl hover:border-graphite-900/30 transition-colors">
            Выйти
          </button>
        </div>
      </div>

      {/* Статус публикации */}
      <div className={`flex items-center justify-between p-4 rounded-xl mb-6 ${p.isPublished ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${p.isPublished ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="text-sm font-medium text-ink-900">
            {p.isPublished ? 'Страница опубликована — видна в каталоге' : 'Страница скрыта — заполните данные и опубликуйте'}
          </span>
        </div>
        <button onClick={() => save(!p.isPublished)}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${p.isPublished ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
          {p.isPublished ? 'Снять с публикации' : 'Опубликовать'}
        </button>
      </div>

      <div className="space-y-5">

        {/* Основная информация */}
        <Section title="Основная информация" icon="ti-building-store">
          <Field label="Название компании *">
            <input value={p.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="EV Service Moscow" className={inputCls} />
          </Field>
          <Field label="Слоган (1 строка)">
            <input value={p.tagline || ''} onChange={e => setForm(f => ({...f, tagline: e.target.value}))}
              placeholder="Сервис для электромобилей с гарантией" className={inputCls} />
          </Field>
          <Field label="Подробное описание">
            <textarea value={p.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))}
              rows={4} placeholder="Расскажите о своём сервисе, опыте, преимуществах..." className={`${inputCls} resize-none`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Год основания">
              <input type="number" value={p.yearFounded || ''} onChange={e => setForm(f => ({...f, yearFounded: parseInt(e.target.value) || undefined}))}
                placeholder="2019" className={inputCls} />
            </Field>
            <Field label="Часы работы">
              <input value={p.workingHours || ''} onChange={e => setForm(f => ({...f, workingHours: e.target.value}))}
                placeholder="Пн–Вс 9:00–21:00" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Контакты */}
        <Section title="Контакты" icon="ti-phone">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Город *">
              <input value={p.city || ''} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                placeholder="Москва" className={inputCls} />
            </Field>
            <Field label="Телефон">
              <input value={p.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="+7 (___) ___-__-__" className={inputCls} />
            </Field>
            <Field label="Адрес">
              <input value={p.address || ''} onChange={e => setForm(f => ({...f, address: e.target.value}))}
                placeholder="ул. Нагатинская, 18с2" className={inputCls} />
            </Field>
            <Field label="Email">
              <input value={p.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="info@evservice.ru" className={inputCls} />
            </Field>
            <Field label="Telegram (@username)">
              <input value={p.telegram || ''} onChange={e => setForm(f => ({...f, telegram: e.target.value}))}
                placeholder="@evservice_msk" className={inputCls} />
            </Field>
            <Field label="WhatsApp (номер)">
              <input value={p.whatsapp || ''} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))}
                placeholder="+79001234567" className={inputCls} />
            </Field>
            <Field label="Сайт" className="col-span-2">
              <input value={p.website || ''} onChange={e => setForm(f => ({...f, website: e.target.value}))}
                placeholder="https://evservice.ru" className={inputCls} />
            </Field>
          </div>
        </Section>

        {/* Услуги */}
        <Section title="Услуги" icon="ti-list-check">
          <div className="flex flex-wrap gap-2 mb-3">
            {(p.services || []).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-paper-50 border border-line rounded-lg text-ink-900">
                {s}
                <button onClick={() => removeService(s)} className="text-muted hover:text-red-500 ml-1">
                  <i className="ti ti-x text-xs" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newService} onChange={e => setNewService(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addService()}
              placeholder="Добавить услугу (Enter)"
              className={`flex-1 ${inputCls}`} />
            <button onClick={addService} className="px-4 py-2 bg-ink-900 text-white rounded-lg text-sm">
              +
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2">Например: Диагностика батареи, ТО по регламенту, Ремонт мотора</p>
        </Section>

        {/* Марки EV */}
        <Section title="Марки электромобилей" icon="ti-car">
          <p className="text-xs text-muted mb-3">Выберите марки, с которыми работаете:</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {evModels.map(brand => (
              <button key={brand} onClick={() => toggleBrand(brand)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  (p.brands || []).includes(brand)
                    ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                    : 'border-line text-muted hover:border-graphite-900/30'
                }`}>
                {brand}
              </button>
            ))}
          </div>
          {(p.brands || []).length > 0 && (
            <p className="text-[11px] text-muted mt-2">
              Выбрано: {(p.brands || []).join(', ')}
            </p>
          )}
        </Section>

        {/* Фото */}
        <Section title="Фото сервиса" icon="ti-photo">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {(p.photos || []).map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-line group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(url)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>
            ))}
            {(p.photos || []).length < 6 && (
              <div className="aspect-square rounded-xl border-2 border-dashed border-line flex items-center justify-center text-muted">
                <i className="ti ti-plus text-2xl" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input value={newPhoto} onChange={e => setNewPhoto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPhoto()}
              placeholder="URL фотографии (Enter для добавления)"
              className={`flex-1 ${inputCls}`} />
            <button onClick={addPhoto} className="px-4 py-2 bg-ink-900 text-white rounded-lg text-sm">
              +
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2">До 6 фото. Рекомендуемый размер: 800×600 пикс.</p>
        </Section>

        {/* Логотип */}
        <Section title="Логотип" icon="ti-photo">
          <Field label="URL логотипа">
            <input value={p.logoUrl || ''} onChange={e => setForm(f => ({...f, logoUrl: e.target.value}))}
              placeholder="https://evservice.ru/logo.png" className={inputCls} />
          </Field>
          {p.logoUrl && (
            <div className="mt-3 w-16 h-16 rounded-xl border border-line overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logoUrl} alt="Логотип" className="w-full h-full object-cover" />
            </div>
          )}
        </Section>

        {/* Кнопка сохранить */}
        <button onClick={() => save()} disabled={saving}
          className="w-full py-4 bg-ink-900 text-white rounded-xl font-semibold text-sm hover:bg-ink-700 transition-colors disabled:opacity-50">
          {saving ? 'Сохраняем...' : 'Сохранить изменения'}
        </button>

        {p.slug && (
          <p className="text-center text-xs text-muted">
            URL вашей страницы:{' '}
            <a href={`/services/${p.slug}`} className="text-volt-600 underline underline-offset-2" target="_blank">
              proev.ru/services/{p.slug}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

// Утилиты
const inputCls = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 bg-white transition-colors';

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <i className={`ti ${icon} text-base`} style={{ color: '#0BA5CC' }} aria-hidden="true" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs text-muted mb-1 block">{label}</label>
      {children}
    </div>
  );
}

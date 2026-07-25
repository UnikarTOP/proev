'use client';

import { useState, useEffect, useCallback } from 'react';

interface Provider {
  id: string; name: string; slug: string; tagline?: string;
  description?: string; city?: string; address?: string;
  phone?: string; telegram?: string; whatsapp?: string;
  website?: string; email?: string; logoUrl?: string;
  photos: string[]; services: string[]; brands: string[];
  workingHours?: string; yearFounded?: number;
  isPublished: boolean; ratingAvg?: number; reviewCount: number;
  category: { name: string; slug: string };
}

interface Review {
  id: string; rating: number; text?: string; createdAt: string;
  author?: { name?: string };
}

interface Lead {
  id: string; name: string; phone: string; message?: string; createdAt: string; status: string;
}

interface Me { id: string; name: string; email: string; provider: Provider | null; }

type Section = 'overview' | 'page' | 'leads' | 'photos' | 'services' | 'contacts' | 'reviews';

const EV_MODELS_SHORT = [
  'Tesla Model 3','Tesla Model Y','Tesla Model S','Tesla Model X',
  'BYD Han','BYD Atto 3','BYD Seal','BYD Dolphin',
  'Zeekr 001','Zeekr X','Zeekr 007',
  'NIO ET5','NIO ET7','NIO EL6',
  'Xpeng P7','Xpeng G6',
  'Li Auto L7','Li Auto L8',
  'Москвич 3е','Москвич 6е',
  'Evolute i-Pro','Evolute i-Joy','Evolute i-Van',
  'АМБЕРАВТО A5','EONYX E1','АТОМ',
  'Xiaomi SU7','Voyah Free',
  'Hyundai IONIQ 5','Hyundai IONIQ 6','Kia EV6',
  'BMW iX','BMW i4','Porsche Taycan',
];

export default function CabinetPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState<Partial<Provider>>({});
  const [section, setSection] = useState<Section>('overview');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [newService, setNewService] = useState('');
  const [newPhoto, setNewPhoto] = useState('');
  const [evModels, setEvModels] = useState<string[]>(EV_MODELS_SHORT);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    const t = localStorage.getItem('partner_token');
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${api}/partners/me`, { headers: { 'X-Partner-Token': token } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { localStorage.removeItem('partner_token'); setToken(null); return; }
        setMe(data);
        if (data.provider) setForm(data.provider);
      });
    fetch(`${api}/partners/ev-models`)
      .then(r => r.json())
      .then(d => { if (d.models?.length) setEvModels(d.models); })
      .catch(() => {});
  }, [token]);

  const login = async () => {
    setLoginError('');
    try {
      const res = await fetch(`${api}/partners/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) { setLoginError('Неверный email или пароль'); return; }
      const data = await res.json();
      localStorage.setItem('partner_token', data.token);
      setToken(data.token);
    } catch { setLoginError('Ошибка соединения'); }
  };

  const save = async (overrides?: Partial<Provider>) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${api}/partners/provider`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Partner-Token': token },
        body: JSON.stringify({ ...form, ...overrides }),
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

  const toggleBrand = (b: string) => setForm(f => ({
    ...f, brands: f.brands?.includes(b) ? f.brands.filter(x => x !== b) : [...(f.brands||[]), b],
  }));
  const addService = () => {
    if (!newService.trim()) return;
    setForm(f => ({ ...f, services: [...(f.services||[]), newService.trim()] }));
    setNewService('');
  };
  const removeService = (s: string) => setForm(f => ({ ...f, services: f.services?.filter(x => x !== s) }));
  const addPhoto = () => {
    if (!newPhoto.trim()) return;
    setForm(f => ({ ...f, photos: [...(f.photos||[]), newPhoto.trim()] }));
    setNewPhoto('');
  };
  const removePhoto = (u: string) => setForm(f => ({ ...f, photos: f.photos?.filter(x => x !== u) }));

  const completeness = (() => {
    if (!form) return 0;
    let done = 0, total = 6;
    if (form.name) done++;
    if (form.phone || form.telegram) done++;
    if ((form.services||[]).length > 0) done++;
    if ((form.photos||[]).length > 0) done++;
    if (form.logoUrl) done++;
    if ((form.brands||[]).length > 0) done++;
    return Math.round((done / total) * 100);
  })();

  const nav: { id: Section; icon: string; label: string; badge?: number }[] = [
    { id: 'overview', icon: 'ti-layout-dashboard', label: 'Обзор' },
    { id: 'page', icon: 'ti-file-description', label: 'Моя страница' },
    { id: 'leads', icon: 'ti-messages', label: 'Заявки' },
    { id: 'photos', icon: 'ti-photo', label: 'Фото и логотип' },
    { id: 'services', icon: 'ti-list-check', label: 'Услуги и марки' },
    { id: 'contacts', icon: 'ti-map-pin', label: 'Контакты' },
    { id: 'reviews', icon: 'ti-star', label: 'Отзывы' },
  ];

  // ── Экран входа ──────────────────────────────────────────────────────────
  if (!token) return (
    <div className="min-h-screen bg-paper-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl text-ink-900">proev<span className="text-volt-600">.ru</span></a>
          <h1 className="text-xl font-semibold text-ink-900 mt-4 mb-1">Кабинет партнёра</h1>
          <p className="text-sm text-muted">Войдите чтобы управлять своей страницей</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Email</label>
            <input type="email" value={loginForm.email}
              onChange={e => setLoginForm(f => ({...f, email: e.target.value}))}
              placeholder="info@evservice.ru"
              className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Пароль</label>
            <input type="password" value={loginForm.password}
              onChange={e => setLoginForm(f => ({...f, password: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="Пришёл в письме при одобрении"
              className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
          </div>
          {loginError && <p className="text-xs text-red-500 flex items-center gap-1"><i className="ti ti-alert-circle" aria-hidden="true"/>{loginError}</p>}
          <button onClick={login}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Войти
          </button>
          <p className="text-center text-xs text-muted pt-1">
            Нет аккаунта? <a href="/partner" className="text-volt-600 underline underline-offset-2">Подать заявку</a>
          </p>
        </div>
      </div>
    </div>
  );

  if (!me) return (
    <div className="min-h-screen bg-paper-50 flex items-center justify-center">
      <div className="text-muted text-sm flex items-center gap-2">
        <i className="ti ti-loader-2 text-xl animate-spin" aria-hidden="true"/>Загружаем кабинет...
      </div>
    </div>
  );

  const p = form;
  const provider = me.provider;

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col md:flex-row">

      {/* ── Боковое меню ── */}
      <aside className="w-full md:w-56 md:min-h-screen bg-white border-b md:border-b-0 md:border-r border-line flex-shrink-0">
        {/* Лого */}
        <div className="p-4 border-b border-line">
          <a href="/" className="font-bold text-base text-ink-900">proev<span className="text-volt-600">.ru</span></a>
          <div className="mt-2.5">
            <div className="text-sm font-semibold text-ink-900 truncate">{provider?.name || me.name}</div>
            <div className="text-xs text-muted mt-0.5">{provider?.category?.name || 'Партнёр'}</div>
          </div>
        </div>

        {/* Навигация */}
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible py-2 md:py-3 px-2 md:px-0 gap-1 md:gap-0.5">
          {nav.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg md:rounded-none md:border-r-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                section === item.id
                  ? 'bg-paper-50 text-ink-900 font-medium md:border-r-2 md:border-volt-600'
                  : 'text-muted hover:text-ink-900 hover:bg-paper-50 md:border-transparent'
              }`}>
              <i className={`ti ${item.icon} text-base`} aria-hidden="true"/>
              {item.label}
              {item.badge ? (
                <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{item.badge}</span>
              ) : null}
            </button>
          ))}
        </nav>

        {/* Пользователь */}
        <div className="hidden md:flex items-center gap-2.5 p-4 border-t border-line mt-auto">
          <div className="w-7 h-7 rounded-full bg-volt-600/10 flex items-center justify-center text-xs font-semibold text-volt-600 shrink-0">
            {me.name.slice(0,2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-ink-900 truncate">{me.name}</div>
            <div className="text-[11px] text-muted truncate">{me.email}</div>
          </div>
          <button onClick={() => { localStorage.removeItem('partner_token'); setToken(null); }}
            title="Выйти"
            className="text-muted hover:text-red-500 transition-colors">
            <i className="ti ti-logout text-base" aria-hidden="true"/>
          </button>
        </div>
      </aside>

      {/* ── Основной контент ── */}
      <main className="flex-1 p-4 md:p-8 min-w-0">

        {/* Уведомление о сохранении */}
        {saved && (
          <div className="fixed top-4 right-4 z-50 bg-ink-900 text-white text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
            <i className="ti ti-check text-green-400" aria-hidden="true"/>Сохранено
          </div>
        )}

        {/* ── ОБЗОР ── */}
        {section === 'overview' && (
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-ink-900">Обзор</h1>
                <p className="text-sm text-muted mt-1">Добро пожаловать в панель управления</p>
              </div>
              {p.slug && (
                <a href={`/services/${p.slug}`} target="_blank"
                  className="text-sm text-volt-600 flex items-center gap-1.5 border border-volt-600 px-3 py-1.5 rounded-lg hover:bg-volt-600/10 transition-colors">
                  <i className="ti ti-external-link text-sm" aria-hidden="true"/>Просмотр
                </a>
              )}
            </div>

            {/* Баннер публикации */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl mb-6 border ${
              p.isPublished ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <i className={`ti ${p.isPublished ? 'ti-eye' : 'ti-eye-off'} text-xl`}
                  style={{ color: p.isPublished ? '#0F6E56' : '#854F0B' }} aria-hidden="true"/>
                <div>
                  <div className="text-sm font-semibold" style={{ color: p.isPublished ? '#0F6E56' : '#633806' }}>
                    {p.isPublished ? 'Страница опубликована' : 'Страница скрыта'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: p.isPublished ? '#1D9E75' : '#854F0B' }}>
                    {p.isPublished ? 'Клиенты могут найти вас в каталоге' : 'Заполните профиль и опубликуйте — вас увидят клиенты'}
                  </div>
                </div>
              </div>
              <button onClick={() => save({ isPublished: !p.isPublished })}
                className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
                style={p.isPublished
                  ? { background: '#fee2e2', color: '#991b1b' }
                  : { background: '#0F6E56', color: '#fff' }}>
                {p.isPublished ? 'Снять с публикации' : 'Опубликовать'}
              </button>
            </div>

            {/* Прогресс заполнения */}
            <div className="bg-white border border-line rounded-xl p-5 mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Заполненность профиля</span>
                <span className="font-semibold text-ink-900">{completeness}%</span>
              </div>
              <div className="h-1.5 bg-paper-50 rounded-full overflow-hidden mb-4">
                <div className="h-full rounded-full transition-all" style={{ width: `${completeness}%`, background: completeness === 100 ? '#1D9E75' : '#0BA5CC' }}/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Название и слоган', done: !!p.name },
                  { label: 'Контакты', done: !!(p.phone || p.telegram) },
                  { label: 'Список услуг', done: (p.services||[]).length > 0 },
                  { label: 'Фотографии', done: (p.photos||[]).length > 0 },
                  { label: 'Логотип', done: !!p.logoUrl },
                  { label: 'Марки EV', done: (p.brands||[]).length > 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.done ? 'bg-green-500' : 'bg-gray-300'}`}/>
                    <span className={item.done ? 'text-ink-900' : 'text-muted'}>{item.label}</span>
                    {!item.done && <i className="ti ti-arrow-right text-xs text-muted ml-auto" aria-hidden="true"/>}
                  </div>
                ))}
              </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: '—', label: 'Просмотров', sub: 'За последние 7 дней', icon: 'ti-eye' },
                { val: '—', label: 'Заявок', sub: 'Всего получено', icon: 'ti-messages' },
                { val: p.ratingAvg ? p.ratingAvg.toFixed(1) : '—', label: 'Рейтинг', sub: `${p.reviewCount || 0} отзывов`, icon: 'ti-star' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-line rounded-xl p-4">
                  <i className={`ti ${s.icon} text-base text-muted mb-2 block`} aria-hidden="true"/>
                  <div className="text-2xl font-semibold text-ink-900 font-mono">{s.val}</div>
                  <div className="text-xs font-medium text-ink-900 mt-1">{s.label}</div>
                  <div className="text-xs text-muted mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── МОЯ СТРАНИЦА ── */}
        {section === 'page' && (
          <div>
            <PageTitle title="Моя страница" sub="Основная информация лендинга"/>
            <Card title="О компании" icon="ti-building-store">
              <Field label="Название компании">
                <input value={p.name||''} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  placeholder="EV Service Moscow" className={inputCls}/>
              </Field>
              <Field label="Слоган — одна цепляющая фраза">
                <input value={p.tagline||''} onChange={e=>setForm(f=>({...f,tagline:e.target.value}))}
                  placeholder="Сервис для электромобилей с гарантией" className={inputCls}/>
                <p className="text-xs text-muted mt-1">Показывается под названием на лендинге</p>
              </Field>
              <Field label="Подробное описание">
                <textarea value={p.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  rows={4} placeholder="Расскажите о сервисе, опыте работы, преимуществах..."
                  className={`${inputCls} resize-none`}/>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Год основания">
                  <input type="number" value={p.yearFounded||''}
                    onChange={e=>setForm(f=>({...f,yearFounded:parseInt(e.target.value)||undefined}))}
                    placeholder="2019" className={inputCls}/>
                </Field>
                <Field label="Часы работы">
                  <input value={p.workingHours||''} onChange={e=>setForm(f=>({...f,workingHours:e.target.value}))}
                    placeholder="Пн–Вс 9:00–21:00" className={inputCls}/>
                </Field>
              </div>
            </Card>
            <SaveBar saving={saving} onSave={() => save()}/>
          </div>
        )}

        {/* ── ЗАЯВКИ ── */}
        {section === 'leads' && (
          <div>
            <PageTitle title="Заявки" sub="Обращения клиентов через вашу страницу"/>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="p-4 border-b border-line flex items-center justify-between">
                <span className="text-sm font-medium text-ink-900">Входящие заявки</span>
                <span className="text-xs text-muted">Обновляется в реальном времени</span>
              </div>
              <div className="divide-y divide-line">
                {leads.length === 0 ? (
                  <div className="py-16 text-center">
                    <i className="ti ti-messages text-4xl text-muted/30 block mb-3" aria-hidden="true"/>
                    <p className="text-sm text-muted">Заявок пока нет</p>
                    <p className="text-xs text-muted mt-1">Они появятся когда клиенты заполнят форму на вашей странице</p>
                  </div>
                ) : leads.map(lead => (
                  <div key={lead.id} className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{lead.name}</div>
                      <div className="text-xs text-muted mt-0.5">{lead.phone}</div>
                      {lead.message && <div className="text-xs text-muted mt-1">{lead.message}</div>}
                    </div>
                    <div className="text-xs text-muted shrink-0">
                      {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ФОТО И ЛОГОТИП ── */}
        {section === 'photos' && (
          <div>
            <PageTitle title="Фото и логотип" sub="Визуальное оформление вашей страницы"/>
            <Card title="Фотографии сервиса" icon="ti-photo">
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(p.photos||[]).map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-line bg-paper-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover"/>
                    <button onClick={() => removePhoto(url)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex">
                      <i className="ti ti-x" aria-hidden="true"/>
                    </button>
                  </div>
                ))}
                {(p.photos||[]).length < 6 && (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-line flex items-center justify-center text-muted">
                    <i className="ti ti-plus text-2xl" aria-hidden="true"/>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input value={newPhoto} onChange={e=>setNewPhoto(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addPhoto()}
                  placeholder="Вставьте URL фотографии..."
                  className={`flex-1 ${inputCls}`}/>
                <button onClick={addPhoto}
                  className="px-4 py-2.5 bg-ink-900 text-white rounded-lg text-sm font-medium">
                  Добавить
                </button>
              </div>
              <p className="text-xs text-muted mt-2">До 6 фото. Рекомендуемый размер: 800×600 пикс.</p>
            </Card>
            <Card title="Логотип" icon="ti-award">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl border border-line bg-paper-50 overflow-hidden flex items-center justify-center shrink-0">
                  {p.logoUrl
                    ? <img src={p.logoUrl} alt="Логотип" className="w-full h-full object-cover"/>
                    : <i className="ti ti-building-store text-2xl text-muted" aria-hidden="true"/>
                  }
                </div>
                <div className="flex-1">
                  <Field label="URL логотипа">
                    <input value={p.logoUrl||''} onChange={e=>setForm(f=>({...f,logoUrl:e.target.value}))}
                      placeholder="https://evservice.ru/logo.png" className={inputCls}/>
                  </Field>
                  <p className="text-xs text-muted mt-1">Рекомендуемый размер: 200×200 пикс., квадратный формат</p>
                </div>
              </div>
            </Card>
            <SaveBar saving={saving} onSave={() => save()}/>
          </div>
        )}

        {/* ── УСЛУГИ И МАРКИ ── */}
        {section === 'services' && (
          <div>
            <PageTitle title="Услуги и марки" sub="Что вы делаете и с какими EV работаете"/>
            <Card title="Список услуг" icon="ti-list-check">
              <div className="flex flex-wrap gap-2 min-h-[40px] mb-3">
                {(p.services||[]).map(s => (
                  <span key={s} className="flex items-center gap-1.5 text-xs bg-paper-50 border border-line px-3 py-1.5 rounded-lg text-ink-900">
                    {s}
                    <button onClick={()=>removeService(s)} className="text-muted hover:text-red-500 transition-colors ml-1">
                      <i className="ti ti-x text-xs" aria-hidden="true"/>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newService} onChange={e=>setNewService(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addService()}
                  placeholder="Диагностика батареи (Enter для добавления)"
                  className={`flex-1 ${inputCls}`}/>
                <button onClick={addService}
                  className="px-4 py-2.5 bg-ink-900 text-white rounded-lg text-sm font-medium">
                  +
                </button>
              </div>
              <p className="text-xs text-muted mt-2">Например: ТО по регламенту, Ремонт мотора, Замена зарядного порта</p>
            </Card>
            <Card title="Марки электромобилей" icon="ti-car">
              <p className="text-xs text-muted mb-3">Выберите марки, с которыми работаете:</p>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                {evModels.map(brand => (
                  <button key={brand} onClick={()=>toggleBrand(brand)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      (p.brands||[]).includes(brand)
                        ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                        : 'border-line text-muted hover:border-ink-900/30 hover:text-ink-900'
                    }`}>
                    {brand}
                  </button>
                ))}
              </div>
              {(p.brands||[]).length > 0 && (
                <p className="text-xs text-muted mt-3">
                  Выбрано {(p.brands||[]).length}: {(p.brands||[]).slice(0,5).join(', ')}{(p.brands||[]).length > 5 ? ` и ещё ${(p.brands||[]).length - 5}` : ''}
                </p>
              )}
            </Card>
            <SaveBar saving={saving} onSave={() => save()}/>
          </div>
        )}

        {/* ── КОНТАКТЫ ── */}
        {section === 'contacts' && (
          <div>
            <PageTitle title="Контакты" sub="Как клиенты могут с вами связаться"/>
            <Card title="Адрес и время работы" icon="ti-map-pin">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Город">
                  <input value={p.city||''} onChange={e=>setForm(f=>({...f,city:e.target.value}))}
                    placeholder="Москва" className={inputCls}/>
                </Field>
                <Field label="Время работы">
                  <input value={p.workingHours||''} onChange={e=>setForm(f=>({...f,workingHours:e.target.value}))}
                    placeholder="Пн–Вс 9:00–21:00" className={inputCls}/>
                </Field>
              </div>
              <Field label="Полный адрес">
                <input value={p.address||''} onChange={e=>setForm(f=>({...f,address:e.target.value}))}
                  placeholder="ул. Нагатинская, 18с2" className={inputCls}/>
              </Field>
            </Card>
            <Card title="Способы связи" icon="ti-phone">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Телефон">
                  <div className="relative">
                    <i className="ti ti-phone absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true"/>
                    <input value={p.phone||''} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}
                      placeholder="+7 (___) ___-__-__" className={`${inputCls} pl-9`}/>
                  </div>
                </Field>
                <Field label="Email">
                  <div className="relative">
                    <i className="ti ti-mail absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true"/>
                    <input type="email" value={p.email||''} onChange={e=>setForm(f=>({...f,email:e.target.value}))}
                      placeholder="info@evservice.ru" className={`${inputCls} pl-9`}/>
                  </div>
                </Field>
                <Field label="Telegram">
                  <div className="relative">
                    <i className="ti ti-brand-telegram absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true"/>
                    <input value={p.telegram||''} onChange={e=>setForm(f=>({...f,telegram:e.target.value}))}
                      placeholder="@evservice_msk" className={`${inputCls} pl-9`}/>
                  </div>
                </Field>
                <Field label="WhatsApp">
                  <div className="relative">
                    <i className="ti ti-brand-whatsapp absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true"/>
                    <input value={p.whatsapp||''} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))}
                      placeholder="+79001234567" className={`${inputCls} pl-9`}/>
                  </div>
                </Field>
                <Field label="Сайт компании" className="col-span-2">
                  <div className="relative">
                    <i className="ti ti-world absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true"/>
                    <input value={p.website||''} onChange={e=>setForm(f=>({...f,website:e.target.value}))}
                      placeholder="https://evservice.ru" className={`${inputCls} pl-9`}/>
                  </div>
                </Field>
              </div>
            </Card>
            <SaveBar saving={saving} onSave={() => save()}/>
          </div>
        )}

        {/* ── ОТЗЫВЫ ── */}
        {section === 'reviews' && (
          <div>
            <PageTitle title="Отзывы" sub="Отзывы клиентов с вашей страницы"/>
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {(provider?.reviewCount || 0) === 0 ? (
                <div className="py-16 text-center">
                  <i className="ti ti-star text-4xl text-muted/30 block mb-3" aria-hidden="true"/>
                  <p className="text-sm text-muted">Отзывов пока нет</p>
                  <p className="text-xs text-muted mt-1">Они появятся когда клиенты оставят отзыв на вашей странице</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {(provider as any)?.reviews?.map((r: Review) => (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink-900">
                          {r.author?.name || 'Пользователь proev.ru'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span style={{ color: '#EF9F27', fontSize: 13 }}>
                            {'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}
                          </span>
                          <span className="text-xs text-muted">
                            {new Date(r.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                      {r.text && <p className="text-sm text-muted leading-relaxed">{r.text}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

const inputCls = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 bg-white transition-colors';

function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
      <p className="text-sm text-muted mt-1">{sub}</p>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5 mb-4">
      <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <i className={`ti ${icon} text-base`} style={{ color: '#0BA5CC' }} aria-hidden="true"/>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SaveBar({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-2">
      <p className="text-xs text-muted">Все поля необязательны — заполняйте постепенно</p>
      <button onClick={onSave} disabled={saving}
        className="px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center gap-2">
        {saving && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true"/>}
        {saving ? 'Сохраняем...' : 'Сохранить'}
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Provider {
  id: string; name: string; slug: string; tagline?: string;
  description?: string; city?: string; address?: string;
  phone?: string; telegram?: string; whatsapp?: string;
  website?: string; email?: string; logoUrl?: string;
  photos: string[]; services: string[]; brands: string[];
  workingHours?: string; yearFounded?: number;
  isPublished: boolean; isPaidPlacement: boolean;
  ratingAvg?: number; reviewCount: number;
  category: { name: string; slug: string };
}

interface Lead {
  id: string; name: string; phone: string; message?: string;
  status: string; createdAt: string;
}

interface Review {
  id: string; rating: number; text?: string; createdAt: string;
  author?: { name?: string };
}

interface Me {
  id: string; name: string; email: string;
  provider: Provider | null;
}

type Section = 'overview' | 'page' | 'leads' | 'reviews' | 'settings';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('partner_token');
}

function authHeaders() {
  return { 'Content-Type': 'application/json', 'X-Partner-Token': getToken() || '' };
}

// ── Утилиты ────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return `${Math.round(s / 60)} мин. назад`;
  if (s < 86400) return `${Math.round(s / 3600)} ч. назад`;
  if (s < 172800) return 'вчера';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function Stars({ v }: { v: number }) {
  return <span style={{ color: '#EF9F27', fontSize: 13 }}>{'★'.repeat(Math.round(v))}{'☆'.repeat(5 - Math.round(v))}</span>;
}

function profileCompletion(p: Provider): number {
  const fields = [p.name, p.tagline, p.description, p.city, p.phone,
    p.address, p.workingHours, p.logoUrl,
    p.services.length > 0, p.brands.length > 0, p.photos.length > 0];
  return Math.round(fields.filter(Boolean).length / fields.length * 100);
}

// ── Компоненты разделов ─────────────────────────────────────────────────────

function Overview({ provider, leads, reviews }: { provider: Provider; leads: Lead[]; reviews: Review[] }) {
  const pct = profileCompletion(provider);
  const newLeads = leads.filter(l => l.status === 'new');

  return (
    <div className="space-y-5">
      {/* Заполненность профиля */}
      {pct < 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-amber-900">Заполненность профиля</span>
            <span className="font-semibold text-amber-700">{pct}%</span>
          </div>
          <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          {pct < 70 && (
            <p className="text-xs text-amber-700 mt-2">
              {!provider.photos.length && '📷 Добавьте фотографии — страницы с фото получают в 3× больше заявок. '}
              {!provider.tagline && '✏️ Добавьте слоган — он показывается в каталоге. '}
              {!provider.phone && '📞 Укажите телефон. '}
            </p>
          )}
        </div>
      )}

      {/* Метрики */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { val: leads.length, lbl: 'Заявок всего', icon: 'ti-mail' },
          { val: newLeads.length, lbl: 'Новых заявок', icon: 'ti-bell', accent: newLeads.length > 0 },
          { val: provider.ratingAvg ? provider.ratingAvg.toFixed(1) : '—', lbl: 'Рейтинг', icon: 'ti-star' },
        ].map(m => (
          <div key={m.lbl} className={`rounded-xl p-4 ${m.accent ? 'bg-red-50 border border-red-200' : 'bg-paper-50 border border-line'}`}>
            <i className={`ti ${m.icon} text-xl mb-2 block ${m.accent ? 'text-red-500' : 'text-muted'}`} aria-hidden="true" />
            <div className={`text-2xl font-bold ${m.accent ? 'text-red-700' : 'text-ink-900'}`}>{m.val}</div>
            <div className="text-xs text-muted mt-0.5">{m.lbl}</div>
          </div>
        ))}
      </div>

      {/* Последние заявки */}
      <div className="bg-white border border-line rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex justify-between items-center">
          <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <i className="ti ti-clock text-base text-muted" aria-hidden="true" />
            Последние заявки
          </h3>
          {leads.length === 0 && <span className="text-xs text-muted">Пока нет</span>}
        </div>
        {leads.slice(0, 5).map((l, i) => (
          <div key={l.id} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(4, leads.length - 1) ? 'border-b border-line' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-paper-50 border border-line flex items-center justify-center text-xs font-semibold text-ink-900">
              {l.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-900">{l.name}</div>
              {l.message && <div className="text-xs text-muted truncate">{l.message}</div>}
            </div>
            <div className="text-right shrink-0">
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${l.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-paper-50 text-muted border border-line'}`}>
                {l.status === 'new' ? 'Новая' : 'В работе'}
              </span>
              <div className="text-[11px] text-muted mt-0.5">{timeAgo(l.createdAt)}</div>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <div className="py-8 text-center text-sm text-muted">
            <i className="ti ti-mail-off text-2xl block mb-2 opacity-30" aria-hidden="true" />
            Заявок пока нет. Опубликуйте страницу — и они появятся.
          </div>
        )}
      </div>

      {/* Последние отзывы */}
      {reviews.length > 0 && (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
              <i className="ti ti-star text-base text-muted" aria-hidden="true" />
              Последние отзывы
            </h3>
          </div>
          {reviews.slice(0, 3).map((r, i) => (
            <div key={r.id} className={`px-4 py-3 ${i < Math.min(2, reviews.length - 1) ? 'border-b border-line' : ''}`}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-sm font-medium text-ink-900">{r.author?.name || 'Пользователь'}</span>
                <Stars v={r.rating} />
              </div>
              {r.text && <p className="text-xs text-muted leading-relaxed">{r.text}</p>}
              <p className="text-[11px] text-muted mt-1">{timeAgo(r.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PageEditor({ provider, evModels, onSave, saving, saved }: {
  provider: Provider; evModels: string[];
  onSave: (data: Partial<Provider>) => void;
  saving: boolean; saved: boolean;
}) {
  const [form, setForm] = useState<Partial<Provider>>(provider);
  const [newService, setNewService] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  const upd = (k: keyof Provider, v: any) => setForm(f => ({ ...f, [k]: v }));
  const addService = () => { if (newService.trim()) { upd('services', [...(form.services || []), newService.trim()]); setNewService(''); } };
  const removeService = (s: string) => upd('services', (form.services || []).filter(x => x !== s));
  const toggleBrand = (b: string) => upd('brands', (form.brands || []).includes(b) ? (form.brands || []).filter(x => x !== b) : [...(form.brands || []), b]);
  const addPhoto = () => { if (newPhoto.trim()) { upd('photos', [...(form.photos || []), newPhoto.trim()]); setNewPhoto(''); } };
  const removePhoto = (u: string) => upd('photos', (form.photos || []).filter(x => x !== u));

  const inp = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 bg-white transition-colors';

  return (
    <div className="space-y-4">
      {/* Основная информация */}
      <Card title="Основная информация" icon="ti-building-store">
        <div className="space-y-3">
          <Field label="Название"><input value={form.name || ''} onChange={e => upd('name', e.target.value)} placeholder="EV Service Moscow" className={inp} /></Field>
          <Field label="Слоган — одна фраза о вашем преимуществе">
            <input value={form.tagline || ''} onChange={e => upd('tagline', e.target.value)} placeholder="Сервис для электромобилей с гарантией на все работы" className={inp} />
          </Field>
          <Field label="Подробное описание">
            <textarea value={form.description || ''} onChange={e => upd('description', e.target.value)} rows={4} placeholder="Расскажите о сервисе, опыте, что умеете лучше всего..." className={`${inp} resize-none`} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Год основания"><input type="number" value={form.yearFounded || ''} onChange={e => upd('yearFounded', parseInt(e.target.value) || undefined)} placeholder="2019" className={inp} /></Field>
            <Field label="Режим работы"><input value={form.workingHours || ''} onChange={e => upd('workingHours', e.target.value)} placeholder="Пн–Вс 9:00–21:00" className={inp} /></Field>
          </div>
        </div>
      </Card>

      {/* Контакты */}
      <Card title="Контакты" icon="ti-phone">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Город"><input value={form.city || ''} onChange={e => upd('city', e.target.value)} placeholder="Москва" className={inp} /></Field>
          <Field label="Телефон"><input value={form.phone || ''} onChange={e => upd('phone', e.target.value)} placeholder="+7 (___) ___-__-__" className={inp} /></Field>
          <Field label="Адрес"><input value={form.address || ''} onChange={e => upd('address', e.target.value)} placeholder="ул. Нагатинская, 18с2" className={inp} /></Field>
          <Field label="Email"><input value={form.email || ''} onChange={e => upd('email', e.target.value)} placeholder="info@evservice.ru" className={inp} /></Field>
          <Field label="Telegram (@username)"><input value={form.telegram || ''} onChange={e => upd('telegram', e.target.value)} placeholder="@evservice_msk" className={inp} /></Field>
          <Field label="WhatsApp"><input value={form.whatsapp || ''} onChange={e => upd('whatsapp', e.target.value)} placeholder="+79001234567" className={inp} /></Field>
          <Field label="Сайт" className="col-span-2"><input value={form.website || ''} onChange={e => upd('website', e.target.value)} placeholder="https://evservice.ru" className={inp} /></Field>
        </div>
      </Card>

      {/* Услуги */}
      <Card title="Услуги" icon="ti-list-check">
        <div className="flex flex-wrap gap-2 mb-3">
          {(form.services || []).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-paper-50 border border-line rounded-full text-ink-900">
              {s}
              <button onClick={() => removeService(s)} className="text-muted hover:text-red-500 ml-0.5">
                <i className="ti ti-x text-xs" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newService} onChange={e => setNewService(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addService()}
            placeholder="Введите услугу и нажмите Enter..."
            className={`flex-1 ${inp}`} />
          <button onClick={addService} className="px-3 py-2 bg-ink-900 text-white rounded-lg text-sm hover:bg-ink-700 transition-colors">
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[11px] text-muted mt-2">Примеры: Диагностика батареи, ТО по регламенту, Ремонт мотора, Замена разъёма</p>
      </Card>

      {/* Марки */}
      <Card title="Марки электромобилей" icon="ti-car">
        <p className="text-xs text-muted mb-3">Выберите марки с которыми работаете:</p>
        <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto pr-1">
          {evModels.map(b => (
            <button key={b} onClick={() => toggleBrand(b)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${(form.brands || []).includes(b) ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold' : 'border-line text-muted hover:border-graphite-900/30'}`}>
              {b}
            </button>
          ))}
        </div>
        {(form.brands || []).length > 0 && (
          <p className="text-[11px] text-muted mt-2">Выбрано: {(form.brands || []).length} марок</p>
        )}
      </Card>

      {/* Фото */}
      <Card title="Фотографии сервиса" icon="ti-photo">
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(form.photos || []).map((url, i) => (
            <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border border-line bg-paper-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="ti ti-x text-[10px]" aria-hidden="true" />
              </button>
            </div>
          ))}
          {(form.photos || []).length < 6 && (
            <div className="aspect-video rounded-lg border-2 border-dashed border-line flex items-center justify-center text-muted">
              <i className="ti ti-plus text-xl" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input value={newPhoto} onChange={e => setNewPhoto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPhoto()}
            placeholder="Вставьте URL фотографии..."
            className={`flex-1 ${inp}`} />
          <button onClick={addPhoto} className="px-3 py-2 bg-ink-900 text-white rounded-lg text-sm hover:bg-ink-700 transition-colors">
            <i className="ti ti-plus" aria-hidden="true" />
          </button>
        </div>
        <p className="text-[11px] text-muted mt-2">До 6 фото. Рекомендуемый размер 800×600 пикс. Вставьте прямую ссылку на изображение.</p>
      </Card>

      {/* Логотип */}
      <Card title="Логотип" icon="ti-brand-abstract">
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 rounded-xl border border-line bg-paper-50 flex items-center justify-center overflow-hidden shrink-0">
            {form.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={form.logoUrl} alt="Логотип" className="w-full h-full object-cover" />
              : <i className="ti ti-photo text-2xl text-muted" aria-hidden="true" />}
          </div>
          <Field label="URL логотипа" className="flex-1">
            <input value={form.logoUrl || ''} onChange={e => upd('logoUrl', e.target.value)}
              placeholder="https://evservice.ru/logo.png" className={inp} />
          </Field>
        </div>
      </Card>

      {/* Сохранить */}
      <div className="flex items-center justify-between bg-white border border-line rounded-xl p-4">
        <p className="text-xs text-muted">Изменения сохраняются только после нажатия кнопки</p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><i className="ti ti-check" aria-hidden="true" />Сохранено</span>}
          <button onClick={() => onSave(form)} disabled={saving}
            className="px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
            {saving ? 'Сохраняем...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadsSection({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<'all' | 'new' | 'done'>('all');
  const filtered = leads.filter(l => filter === 'all' ? true : filter === 'new' ? l.status === 'new' : l.status !== 'new');

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[['all', 'Все'], ['new', 'Новые'], ['done', 'Обработанные']].map(([v, lbl]) => (
          <button key={v} onClick={() => setFilter(v as any)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${filter === v ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold' : 'border-line text-muted hover:border-graphite-900/30'}`}>
            {lbl}
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${filter === v ? 'bg-volt-600/20 text-volt-600' : 'bg-paper-50 text-muted'}`}>
              {v === 'all' ? leads.length : v === 'new' ? leads.filter(l => l.status === 'new').length : leads.filter(l => l.status !== 'new').length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center bg-white border border-line rounded-xl">
          <i className="ti ti-mail-off text-3xl text-muted block mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm text-muted">Заявок нет</p>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {filtered.map((l, i) => (
            <div key={l.id} className={`flex gap-3 p-4 ${i < filtered.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-paper-50 border border-line flex items-center justify-center text-sm font-semibold text-ink-900 shrink-0">
                {l.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-ink-900">{l.name}</span>
                  <a href={`tel:${l.phone}`} className="text-xs text-volt-600 hover:underline">{l.phone}</a>
                </div>
                {l.message && <p className="text-xs text-muted leading-relaxed">{l.message}</p>}
                <p className="text-[11px] text-muted mt-1">{timeAgo(l.createdAt)}</p>
              </div>
              <span className={`shrink-0 text-[11px] px-2.5 py-1 rounded-full h-fit ${l.status === 'new' ? 'bg-green-100 text-green-700' : 'bg-paper-50 text-muted border border-line'}`}>
                {l.status === 'new' ? 'Новая' : 'Обработана'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsSection({ reviews, provider }: { reviews: Review[]; provider: Provider }) {
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
  const dist = [5,4,3,2,1].map(s => ({ s, n: reviews.filter(r => r.rating === s).length }));

  return (
    <div className="space-y-4">
      {reviews.length > 0 && (
        <div className="bg-white border border-line rounded-xl p-5">
          <div className="flex items-start gap-6">
            <div className="text-center shrink-0">
              <div className="text-4xl font-bold text-ink-900">{avg.toFixed(1)}</div>
              <Stars v={avg} />
              <div className="text-xs text-muted mt-1">{reviews.length} отзывов</div>
            </div>
            <div className="flex-1 space-y-1.5">
              {dist.map(({ s, n }) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-3 text-right">{s}</span>
                  <i className="ti ti-star text-xs text-amber-400" aria-hidden="true" />
                  <div className="flex-1 h-1.5 bg-paper-50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: reviews.length ? `${n / reviews.length * 100}%` : '0%' }} />
                  </div>
                  <span className="text-[11px] text-muted w-3">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="py-16 text-center bg-white border border-line rounded-xl">
          <i className="ti ti-star-off text-3xl text-muted block mb-3 opacity-30" aria-hidden="true" />
          <p className="text-sm text-muted mb-1">Отзывов пока нет</p>
          <p className="text-xs text-muted">Отзывы появляются после того как клиенты оставят заявки</p>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {reviews.map((r, i) => (
            <div key={r.id} className={`p-4 ${i < reviews.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-sm font-medium text-ink-900">{r.author?.name || 'Пользователь proev.ru'}</span>
                <Stars v={r.rating} />
              </div>
              {r.text && <p className="text-sm text-muted leading-relaxed">{r.text}</p>}
              <p className="text-[11px] text-muted mt-1.5">{timeAgo(r.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection({ me, provider, token, onSave, saving }: { me: Me; provider: Provider; token: string; onSave: (d: any) => void; saving: boolean }) {
  const [pwd, setPwd] = useState({ old: '', new1: '', new2: '' });
  const [pwdMsg, setPwdMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const inp = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600';
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const changePassword = async () => {
    if (!pwd.old || !pwd.new1 || !pwd.new2) { setPwdMsg({ text: 'Заполните все поля', ok: false }); return; }
    if (pwd.new1 !== pwd.new2) { setPwdMsg({ text: 'Новые пароли не совпадают', ok: false }); return; }
    if (pwd.new1.length < 6) { setPwdMsg({ text: 'Минимум 6 символов', ok: false }); return; }
    setPwdLoading(true);
    try {
      const res = await fetch(`${api}/partners/change-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Partner-Token': token },
        body: JSON.stringify({ currentPassword: pwd.old, newPassword: pwd.new1 }),
      });
      if (res.ok) {
        setPwdMsg({ text: 'Пароль изменён', ok: true });
        setPwd({ old: '', new1: '', new2: '' });
      } else {
        const err = await res.json();
        setPwdMsg({ text: err.message || 'Ошибка', ok: false });
      }
    } catch { setPwdMsg({ text: 'Ошибка соединения', ok: false }); }
    setPwdLoading(false);
    setTimeout(() => setPwdMsg(null), 3000);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Card title="Аккаунт" icon="ti-user">
        <div className="space-y-3">
          <Field label="Email (логин)">
            <input value={me.email} readOnly className={`${inp} bg-paper-50 text-muted cursor-not-allowed`} />
            <p className="text-xs text-muted mt-1">Для смены email обратитесь на <a href="mailto:partners@proev.ru" className="text-volt-600 underline underline-offset-2">partners@proev.ru</a></p>
          </Field>
        </div>
      </Card>

      <Card title="Сменить пароль" icon="ti-lock">
        <div className="space-y-3">
          <Field label="Текущий пароль">
            <input type="password" value={pwd.old} onChange={e => setPwd(p => ({...p, old: e.target.value}))}
              placeholder="Текущий пароль" className={inp} />
          </Field>
          <Field label="Новый пароль">
            <input type="password" value={pwd.new1} onChange={e => setPwd(p => ({...p, new1: e.target.value}))}
              placeholder="Минимум 6 символов" className={inp} />
          </Field>
          <Field label="Повторите новый пароль">
            <input type="password" value={pwd.new2} onChange={e => setPwd(p => ({...p, new2: e.target.value}))}
              onKeyDown={e => e.key === 'Enter' && changePassword()}
              placeholder="Повторите новый пароль" className={inp} />
          </Field>
          {pwdMsg && (
            <div className={`text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg ${pwdMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <i className={`ti ${pwdMsg.ok ? 'ti-check' : 'ti-alert-circle'} text-sm`} aria-hidden="true"/>
              {pwdMsg.text}
            </div>
          )}
          <button onClick={changePassword} disabled={pwdLoading}
            className="w-full py-2.5 bg-ink-900 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {pwdLoading && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true"/>}
            {pwdLoading ? 'Меняем...' : 'Изменить пароль'}
          </button>
        </div>
      </Card>

      <Card title="Тариф" icon="ti-crown">
        <div className="flex items-start gap-3">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${provider.isPaidPlacement ? 'bg-amber-100 text-amber-800' : 'bg-paper-50 text-muted border border-line'}`}>
            {provider.isPaidPlacement ? '⭐ Партнёр proev.ru' : 'Базовый'}
          </div>
          {!provider.isPaidPlacement && (
            <p className="text-sm text-muted">Обновитесь до тарифа Партнёр — карточка показывается первой и выделяется синей рамкой.{' '}
              <a href="mailto:partners@proev.ru" className="text-volt-600 underline underline-offset-2">Написать нам</a>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Переиспользуемые компоненты ─────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center gap-2">
        <i className={`ti ${icon} text-base text-muted`} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
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

// ── Экран входа ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      const res = await fetch(`${API}/partners/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { setErr('Неверный email или пароль'); setLoading(false); return; }
      const data = await res.json();
      localStorage.setItem('partner_token', data.token);
      onLogin();
    } catch { setErr('Ошибка соединения'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-paper-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold text-ink-900">proev<span className="text-volt-600">.ru</span></a>
          <h1 className="text-lg font-semibold text-ink-900 mt-4 mb-1">Кабинет партнёра</h1>
          <p className="text-sm text-muted">Войдите чтобы управлять своей страницей</p>
        </div>
        <div className="bg-white border border-line rounded-2xl p-6 space-y-3">
          <Field label="Email">
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="info@evservice.ru" onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
          </Field>
          <Field label="Пароль">
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="Пришёл в письме при одобрении" onKeyDown={e => e.key === 'Enter' && submit()}
              className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
          </Field>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button onClick={submit} disabled={loading || !form.email || !form.password}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
            {loading ? 'Входим...' : 'Войти'}
          </button>
          <div className="flex items-center justify-between">
            <a href="/partner" className="text-xs text-muted underline underline-offset-2 hover:text-ink-900">
              Подать заявку
            </a>
            <ForgotPasswordInline email={form.email} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Главный компонент ────────────────────────────────────────────────────────

export default function CabinetPage() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [evModels, setEvModels] = useState<string[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => { setToken(localStorage.getItem('partner_token')); }, []);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API}/partners/me`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/partners/ev-models`).then(r => r.json()).catch(() => ({ models: [] })),
    ]).then(([meData, modData]) => {
      if (!meData) { localStorage.removeItem('partner_token'); setToken(null); return; }
      setMe(meData);
      setEvModels(modData.models || []);
    });
  }, [token]);

  useEffect(() => {
    if (!me?.provider) return;
    // Загружаем заявки и отзывы для провайдера
    fetch(`${API}/service-providers/${me.provider.id}/reviews`).then(r => r.json()).then(setReviews).catch(() => {});
  }, [me]);

  const save = useCallback(async (data: Partial<Provider>) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/partners/provider`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setMe(m => m ? { ...m, provider: updated } : m);
        setSaved(true); setTimeout(() => setSaved(false), 2500);
      }
    } catch {}
    setSaving(false);
  }, [token]);

  const togglePublish = useCallback(async () => {
    if (!me?.provider) return;
    await save({ isPublished: !me.provider.isPublished });
  }, [me, save]);

  const logout = () => { localStorage.removeItem('partner_token'); setToken(null); setMe(null); };

  if (!token) return <LoginScreen onLogin={() => setToken(localStorage.getItem('partner_token'))} />;
  if (!me) return (
    <div className="flex items-center justify-center h-64 text-muted text-sm">
      <i className="ti ti-loader-2 animate-spin text-xl mr-2" aria-hidden="true" />Загружаем...
    </div>
  );

  const p = me.provider;
  const newLeadsCount = leads.filter(l => l.status === 'new').length;

  const navItems: { id: Section; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Обзор', icon: 'ti-layout-dashboard' },
    { id: 'page', label: 'Моя страница', icon: 'ti-file-pencil' },
    { id: 'leads', label: 'Заявки', icon: 'ti-mail', badge: newLeadsCount },
    { id: 'reviews', label: 'Отзывы', icon: 'ti-star' },
    { id: 'settings', label: 'Настройки', icon: 'ti-settings' },
  ];

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Мобильный хедер */}
      <div className="md:hidden bg-white border-b border-line px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div>
          <div className="text-sm font-semibold text-ink-900">{p?.name || me.name}</div>
          <div className="text-xs text-muted">{p?.category?.name}</div>
        </div>
        <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 text-muted hover:text-ink-900">
          <i className={`ti ${mobileMenuOpen ? 'ti-x' : 'ti-menu-2'} text-xl`} aria-hidden="true" />
        </button>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-line px-4 py-2 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setSection(item.id); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${section === item.id ? 'bg-volt-600/10 text-volt-600 font-semibold' : 'text-muted hover:bg-paper-50'}`}>
              <i className={`ti ${item.icon} text-base`} aria-hidden="true" />
              {item.label}
              {item.badge ? <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50">
            <i className="ti ti-logout text-base" aria-hidden="true" />Выйти
          </button>
        </div>
      )}

      <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-6 flex gap-6">
        {/* Боковое меню (десктоп) */}
        <aside className="hidden md:flex flex-col w-52 shrink-0">
          <div className="bg-white border border-line rounded-xl overflow-hidden sticky top-6">
            {/* Профиль */}
            <div className="p-4 border-b border-line">
              <div className="w-10 h-10 rounded-xl bg-volt-600/10 flex items-center justify-center mb-3">
                {p?.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.logoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                  : <i className="ti ti-building-store text-xl text-volt-600" aria-hidden="true" />}
              </div>
              <div className="text-sm font-semibold text-ink-900 leading-tight">{p?.name || me.name}</div>
              <div className="text-xs text-muted mt-0.5">{p?.category?.name}</div>
            </div>

            {/* Навигация */}
            <nav className="p-2">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left mb-0.5 ${section === item.id ? 'bg-volt-600/10 text-volt-600 font-semibold' : 'text-muted hover:bg-paper-50 hover:text-ink-900'}`}>
                  <i className={`ti ${item.icon} text-base`} aria-hidden="true" />
                  {item.label}
                  {item.badge ? <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{item.badge}</span> : null}
                </button>
              ))}
              <div className="border-t border-line mt-2 pt-2">
                <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <i className="ti ti-logout text-base" aria-hidden="true" />Выйти
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Основной контент */}
        <main className="flex-1 min-w-0">
          {/* Шапка раздела */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-ink-900">
              {navItems.find(n => n.id === section)?.label}
            </h1>
            <div className="flex items-center gap-2">
              {p && (
                <>
                  {p.slug && (
                    <a href={`/services/${p.slug}`} target="_blank"
                      className="hidden sm:flex items-center gap-1.5 text-xs text-muted border border-line px-3 py-2 rounded-lg hover:border-graphite-900/30 hover:text-ink-900 transition-colors">
                      <i className="ti ti-external-link text-sm" aria-hidden="true" />
                      Просмотр
                    </a>
                  )}
                  <button onClick={togglePublish}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${p.isPublished ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100' : 'bg-paper-50 border-line text-muted hover:border-graphite-900/30'}`}>
                    <i className={`ti ${p.isPublished ? 'ti-circle-check' : 'ti-circle'} text-sm`} aria-hidden="true" />
                    {p.isPublished ? 'Опубликовано' : 'Скрыто'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Нет провайдера */}
          {!p ? (
            <div className="py-20 text-center bg-white border border-line rounded-xl">
              <i className="ti ti-building-store text-4xl text-muted block mb-3 opacity-30" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink-900 mb-2">Страница ещё не создана</h2>
              <p className="text-sm text-muted mb-4">Администратор создаст страницу после одобрения заявки</p>
              <a href="mailto:partners@proev.ru" className="text-sm text-volt-600 underline underline-offset-2">partners@proev.ru</a>
            </div>
          ) : (
            <>
              {section === 'overview' && <Overview provider={p} leads={leads} reviews={reviews} />}
              {section === 'page' && <PageEditor provider={p} evModels={evModels} onSave={save} saving={saving} saved={saved} />}
              {section === 'leads' && <LeadsSection leads={leads} />}
              {section === 'reviews' && <ReviewsSection reviews={reviews} provider={p} />}
              {section === 'settings' && <SettingsSection me={me} provider={p} token={token} onSave={save} saving={saving} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Компонент "Забыли пароль?" встроенный в форму входа
function ForgotPasswordInline({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const request = async () => {
    const emailToUse = email.trim();
    if (!emailToUse) {
      alert('Введите email в поле выше, затем нажмите "Забыли пароль?"');
      return;
    }
    setLoading(true);
    try {
      await fetch(`${api}/partners/request-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });
      setSent(true);
    } catch {}
    setLoading(false);
  };

  if (sent) return (
    <span className="text-xs text-green-600 flex items-center gap-1">
      <i className="ti ti-check text-xs" aria-hidden="true"/>Письмо отправлено
    </span>
  );

  return (
    <button onClick={request} disabled={loading}
      className="text-xs text-volt-600 underline underline-offset-2 hover:opacity-80 disabled:opacity-50 transition-opacity">
      {loading ? 'Отправляем...' : 'Забыли пароль?'}
    </button>
  );
}

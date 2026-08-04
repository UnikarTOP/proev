'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string; email: string; name?: string; phone?: string;
  city?: string; bio?: string;
  carBrand?: string; carModel?: string; carYear?: number;
  carRange?: number; connectorType?: string;
}

const CONNECTORS = [
  { val: 'GBT',     label: 'GB/T (китайский DC)' },
  { val: 'CCS2',    label: 'CCS2 / Combo 2 (DC)' },
  { val: 'CHAdeMO', label: 'CHAdeMO (DC)' },
  { val: 'Type2',   label: 'Type 2 (AC)' },
  { val: 'Type1',   label: 'Type 1 (AC, Nissan Leaf)' },
];

export default function ProfileClient() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [tab, setTab] = useState<'profile'|'car'|'security'|'trips'>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [evBrands, setEvBrands] = useState<string[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [tripStats, setTripStats] = useState<any>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('user_token');
    if (!token) { router.push('/login'); return; }

    // Загружаем профиль
    fetch(`${api}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setUser(d); setForm(d); })
      .catch(() => { localStorage.removeItem('user_token'); router.push('/login'); });

    // Загружаем поездки
    fetch(`${api}/trips`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => Array.isArray(d) && setTrips(d))
      .catch(() => {});

    fetch(`${api}/trips/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setTripStats(d))
      .catch(() => {});

    // Загружаем бренды из API
    fetch(`${api}/ev-models/brands`)
      .then(r => r.json())
      .then(d => Array.isArray(d) && setEvBrands(d))
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true); setSaved(false);
    const token = localStorage.getItem('user_token');
    try {
      const res = await fetch(`${api}/users/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { alert('Ошибка сохранения'); }
    setSaving(false);
  };

  const changePassword = async () => {
    setPwError(''); setPwOk(false);
    if (!pwForm.current || !pwForm.next) return setPwError('Заполните все поля');
    if (pwForm.next.length < 8) return setPwError('Минимум 8 символов');
    if (pwForm.next !== pwForm.confirm) return setPwError('Пароли не совпадают');
    const token = localStorage.getItem('user_token');
    try {
      const res = await fetch(`${api}/users/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (res.ok) { setPwOk(true); setPwForm({ current: '', next: '', confirm: '' }); }
      else { const d = await res.json(); setPwError(d.message || 'Неверный текущий пароль'); }
    } catch { setPwError('Ошибка соединения'); }
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!mounted) return null;
  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-line border-t-volt-600 animate-spin" />
    </div>
  );

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-2.5 focus:outline-none focus:border-volt-600 bg-white';

  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Шапка профиля */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-ink-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-900">{user.name || 'Профиль'}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-muted hover:text-red-500 transition-colors">Выйти</button>
      </div>

      {/* Табы */}
      <div className="flex gap-1 mb-6 bg-paper-50 border border-line rounded-xl p-1">
        {[
          { id: 'profile', label: '👤 Профиль' },
          { id: 'car',     label: '⚡ Мой EV' },
          { id: 'security',label: '🔒 Безопасность' },
          { id: 'trips',   label: '📓 Поездки' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${tab === t.id ? 'bg-white shadow-sm text-ink-900' : 'text-muted hover:text-ink-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Профиль */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Имя</label>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Александр" className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Телефон</label>
              <input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+7 999 123-45-67" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Город</label>
            <input value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Москва" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">О себе</label>
            <textarea value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Опыт с EV, советы..." rows={3} className={`${inp} resize-none`} />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
            {saving ? 'Сохраняем...' : saved ? '✅ Сохранено' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Мой EV */}
      {tab === 'car' && (
        <div className="space-y-4">
          <div className="bg-volt-600/8 border border-volt-600/20 rounded-xl p-4 text-sm">
            ⚡ Данные используются для фильтрации зарядок и расчёта маршрутов
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Марка</label>
              <select value={form.carBrand || ''} onChange={e => setForm(f => ({ ...f, carBrand: e.target.value, carModel: '' }))} className={inp}>
                <option value="">Выберите марку</option>
                {evBrands.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="Другое">Другое</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Модель</label>
              <input value={form.carModel || ''} onChange={e => setForm(f => ({ ...f, carModel: e.target.value }))}
                placeholder="i-SKY, Model 3..." className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Год выпуска</label>
              <input type="number" value={form.carYear || ''} onChange={e => setForm(f => ({ ...f, carYear: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="2023" min={2010} max={2026} className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Реальный запас хода, км</label>
              <input type="number" value={form.carRange || ''} onChange={e => setForm(f => ({ ...f, carRange: e.target.value ? parseInt(e.target.value) : undefined }))}
                placeholder="350" min={50} max={1000} className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-3">Тип разъёма</label>
            <div className="space-y-2">
              {CONNECTORS.map(c => (
                <label key={c.val} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${form.connectorType === c.val ? 'border-volt-600 bg-volt-600/8' : 'border-line hover:border-graphite-900/20'}`}>
                  <input type="radio" name="connector" value={c.val} checked={form.connectorType === c.val}
                    onChange={() => setForm(f => ({ ...f, connectorType: c.val }))} className="accent-volt-600" />
                  <span className="text-sm text-ink-900">{c.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={save} disabled={saving}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
            {saving ? 'Сохраняем...' : saved ? '✅ Сохранено' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Безопасность */}
      {tab === 'security' && (
        <div className="space-y-4">
          <h2 className="font-semibold text-ink-900">Смена пароля</h2>
          {[
            { label: 'Текущий пароль', key: 'current', ph: '••••••••' },
            { label: 'Новый пароль', key: 'next', ph: 'Минимум 8 символов' },
            { label: 'Повторите новый', key: 'confirm', ph: '••••••••' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">{f.label}</label>
              <input value={pwForm[f.key as keyof typeof pwForm]}
                onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                type="password" placeholder={f.ph} className={inp} />
            </div>
          ))}
          {pwError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{pwError}</div>}
          {pwOk && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">✅ Пароль успешно изменён</div>}
          <button onClick={changePassword}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Изменить пароль
          </button>
          <div className="pt-4 border-t border-line">
            <button onClick={logout}
              className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

      {/* Поездки */}
      {tab === 'trips' && (
        <div className="space-y-4">
          {/* Статистика */}
          {tripStats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: tripStats.count || 0, label: 'Поездок', icon: '🚗' },
                { val: `${Math.round((tripStats.totalKm || 0))} км`, label: 'Всего км', icon: '📍' },
                { val: `${Math.round(tripStats.totalKwh || 0)} кВт·ч`, label: 'Израсходовано', icon: '⚡' },
                { val: `${Math.round(tripStats.totalCost || 0)} ₽`, label: 'Потрачено', icon: '💰' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-line rounded-xl p-3 text-center">
                  <div className="text-lg mb-1">{s.icon}</div>
                  <div className="text-base font-bold text-ink-900">{s.val}</div>
                  <div className="text-[10px] text-muted">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Список поездок */}
          {trips.length === 0 ? (
            <div className="text-center py-10 bg-white border border-line rounded-2xl">
              <div className="text-4xl mb-3">📍</div>
              <p className="font-medium text-ink-900 mb-2">Поездок пока нет</p>
              <p className="text-sm text-muted mb-4">Рассчитайте маршрут и нажмите «Записать в дневник»</p>
              <a href="/route-planner" className="inline-block px-5 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold no-underline hover:bg-ink-700 transition-colors">
                Рассчитать маршрут →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((t: any) => (
                <div key={t.id} className="bg-white border border-line rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-medium text-ink-900">
                        {t.fromCity || '—'} → {t.toCity || '—'}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {t.date ? new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                        {t.carBrand && ` · ${t.carBrand} ${t.carModel || ''}`}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-ink-900">{t.distanceKm || 0} км</div>
                      <div className="text-xs text-muted">{t.cost || 0} ₽</div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[11px] text-muted">
                    {t.chargedKwh && <span>⚡ {t.chargedKwh} кВт·ч</span>}
                    {t.durationMin && <span>⏱ {Math.floor(t.durationMin/60)}ч {t.durationMin%60}мин</span>}
                    {t.stops > 0 && <span>🔌 {t.stops} зарядки</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <a href="/route-planner" className="flex items-center justify-center gap-2 w-full py-3 border border-line text-muted rounded-xl text-sm hover:text-ink-900 hover:border-graphite-900/20 transition-colors no-underline">
            + Рассчитать новый маршрут
          </a>
        </div>
      )}
    </div>
  );
}

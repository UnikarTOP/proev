'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CitySelect from '@/components/CitySelect';
import { EV_BRANDS, getModelsByBrand } from '@/lib/ev-database';


interface UserProfile {
  id: string; email: string; name?: string; phone?: string;
  city?: string; bio?: string;
  carBrand?: string; carModel?: string; carYear?: number;
  carRange?: number; connectorType?: string;
}

const [availableModels, setAvailableModels] = useState<string[]>([]);

const CONNECTORS = [
  { val: 'Type2', label: 'Type 2 (AC)' },
  { val: 'CCS2', label: 'CCS2 / Combo 2 (DC)' },
  { val: 'CHAdeMO', label: 'CHAdeMO (DC)' },
  { val: 'GBT', label: 'GB/T (китайский DC)' },
  { val: 'Type1', label: 'Type 1 (AC, Nissan Leaf)' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [tab, setTab] = useState<'profile'|'car'|'security'>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${api}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setUser(d); setForm(d); })
      .catch(() => { localStorage.removeItem('user_token'); router.push('/login'); });
  }, []);

  const save = async () => {
    setSaving(true);
    const token = localStorage.getItem('user_token');
    await fetch(`${api}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const changePassword = async () => {
    setPwError(''); setPwOk(false);
    if (!pwForm.current || !pwForm.next) return setPwError('Заполните все поля');
    if (pwForm.next.length < 8) return setPwError('Минимум 8 символов');
    if (pwForm.next !== pwForm.confirm) return setPwError('Пароли не совпадают');
    const token = localStorage.getItem('user_token');
    const res = await fetch(`${api}/users/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    if (res.ok) { setPwOk(true); setPwForm({ current: '', next: '', confirm: '' }); }
    else { const d = await res.json(); setPwError(d.message || 'Ошибка'); }
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #DCE1E8', borderTopColor: '#0BA5CC', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-2.5 focus:outline-none focus:border-volt-600 bg-white';
  const TABS = [
    { id: 'profile', label: '👤 Профиль' },
    { id: 'car', label: '⚡ Мой электромобиль' },
    { id: 'security', label: '🔒 Безопасность' },
  ];

  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 py-8 md:py-12">

      {/* Шапка */}
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
        <button onClick={logout} className="text-xs text-muted hover:text-red-500 transition-colors">
          Выйти
        </button>
      </div>

      {/* Табы */}
      <div className="flex gap-1 mb-6 bg-paper-50 border border-line rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex-1 text-xs font-medium py-2 rounded-lg transition-all ${
              tab === t.id ? 'bg-white shadow-sm text-ink-900' : 'text-muted hover:text-ink-900'
            }`}>
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
              <input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Александр" className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Телефон</label>
              <input value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="+7 999 123-45-67" type="tel" className={inp} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Город</label>
            <CitySelect value={form.city || ''} onChange={city => setForm(f => ({...f, city}))} placeholder="Выберите город" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">О себе</label>
            <textarea value={form.bio || ''} onChange={e => setForm(f => ({...f, bio: e.target.value}))}
              placeholder="Расскажите немного о себе — опыт с EV, советы другим владельцам..."
              rows={3} className={`${inp} resize-none`} />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
            {saving ? 'Сохраняем...' : saved ? '✅ Сохранено' : 'Сохранить'}
          </button>
        </div>
      )}

      {/* Электромобиль */}
      {tab === 'car' && (
        <div className="space-y-4">
          <div className="bg-volt-600/8 border border-volt-600/20 rounded-xl p-4 mb-2">
            <p className="text-sm text-ink-900 font-medium mb-1">⚡ Данные вашего электромобиля</p>
            <p className="text-xs text-muted">Помогают подбирать подходящие зарядки и сервисы. Видны только вам.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Марка</label>
              <select value={form.carBrand || ''} onChange={e => setForm(f => ({...f, carBrand: e.target.value}))}
                className={inp}>
                <option value="">Выберите марку</option>
                {EV_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                <option value="Другой">Другой</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Модель</label>
              <input value={form.carModel || ''} onChange={e => setForm(f => ({...f, carModel: e.target.value}))}
                placeholder="Model 3, Han, 001..." className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Год выпуска</label>
              <input value={form.carYear || ''} onChange={e => setForm(f => ({...f, carYear: parseInt(e.target.value) || undefined}))}
                placeholder="2023" type="number" min="2010" max="2026" className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Реальный запас хода, км</label>
              <input value={form.carRange || ''} onChange={e => setForm(f => ({...f, carRange: parseInt(e.target.value) || undefined}))}
                placeholder="350" type="number" className={inp} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Тип разъёма</label>
            <div className="grid grid-cols-1 gap-2">
              {CONNECTORS.map(c => (
                <label key={c.val} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  form.connectorType === c.val ? 'border-volt-600 bg-volt-600/8' : 'border-line hover:border-graphite-900/20'
                }`}>
                  <input type="radio" name="connector" value={c.val} checked={form.connectorType === c.val}
                    onChange={() => setForm(f => ({...f, connectorType: c.val}))} className="accent-volt-600" />
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
          <h2 className="font-semibold text-ink-900 mb-4">Смена пароля</h2>

          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Текущий пароль</label>
            <input value={pwForm.current} onChange={e => setPwForm(f => ({...f, current: e.target.value}))}
              type="password" placeholder="••••••••" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Новый пароль</label>
            <input value={pwForm.next} onChange={e => setPwForm(f => ({...f, next: e.target.value}))}
              type="password" placeholder="Минимум 8 символов" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Повторите новый пароль</label>
            <input value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))}
              type="password" placeholder="Повторите пароль" className={inp} />
          </div>

          {pwError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{pwError}</div>}
          {pwOk && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">✅ Пароль изменён</div>}

          <button onClick={changePassword}
            className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Изменить пароль
          </button>

          <div className="pt-4 border-t border-line">
            <button onClick={logout} className="w-full py-3 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

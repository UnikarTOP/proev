'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'user' | 'partner';

export default function LoginClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('user');
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    const p = window.location.search;
    if (p.includes('registered=1')) setSuccess('Аккаунт создан! Войдите.');
    if (p.includes('tab=partner')) setTab('partner');
  }, []);

  useEffect(() => {
    setError(''); setSuccess('');
    setForm({ email: '', password: '' });
  }, [tab]);

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Заполните все поля');
    setLoading(true);
    try {
      const endpoint = tab === 'user' ? '/users/login' : '/partners/login';
      const res = await fetch(`${api}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Неверный email или пароль');

      if (tab === 'user') {
        localStorage.setItem('user_token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('storage'));
        router.push('/profile');
      } else {
        localStorage.setItem('partner_token', data.accessToken);
        localStorage.setItem('partner', JSON.stringify(data.user || data.partner));
        router.push('/partner/cabinet');
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const inp = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '11px 14px', fontSize: 14,
    border: '1px solid #DCE1E8', borderRadius: 12,
    outline: 'none', background: '#fff',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9F8F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Логотип */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/" style={{ fontSize: 24, fontWeight: 700, textDecoration: 'none', color: '#10192B' }}>
            proev<span style={{ color: '#0BA5CC' }}>.ru</span>
          </a>
          <p style={{ marginTop: 6, fontSize: 14, color: '#6B7686' }}>Войдите в аккаунт</p>
        </div>

        {/* Таб-переключатель */}
        <div style={{ display: 'flex', gap: 4, background: '#EFF0F0', borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {([['user', '👤 Я владелец EV'], ['partner', '💼 Я партнёр']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '9px 0', fontSize: 13, fontWeight: tab === id ? 600 : 400,
                border: 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                background: tab === id ? '#fff' : 'transparent',
                color: tab === id ? '#10192B' : '#6B7686',
                boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Форма */}
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #DCE1E8', padding: 28 }}>

          {/* Описание */}
          <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 10, fontSize: 12, lineHeight: 1.5,
            background: tab === 'user' ? '#E6F5EE' : '#EEF2FF',
            color: tab === 'user' ? '#0F6E56' : '#4338CA',
          }}>
            {tab === 'user'
              ? '🔋 Для владельцев электромобилей — доступ к профилю, дневнику поездок и персональным настройкам'
              : '💼 Для партнёров — вход в кабинет управления сервисом, CRM и аналитику'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {success && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#16A34A' }}>
                {success}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                type="email" placeholder="you@email.ru" style={inp} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Пароль</label>
                {tab === 'partner' && (
                  <a href="/partner/reset-password" style={{ fontSize: 11, color: '#0BA5CC', textDecoration: 'none' }}>Забыли пароль?</a>
                )}
              </div>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                type="password" placeholder="••••••••" style={inp}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444' }}>
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              style={{
                width: '100%', padding: '13px', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, transition: 'all 0.15s',
                background: tab === 'user' ? '#0B1220' : '#4338CA',
                color: '#fff',
              }}>
              {loading ? 'Входим...' : tab === 'user' ? 'Войти как владелец EV' : 'Войти в кабинет партнёра'}
            </button>
          </div>
        </div>

        {/* Ссылки под формой */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          {tab === 'user' ? (
            <p style={{ fontSize: 14, color: '#6B7686' }}>
              Нет аккаунта?{' '}
              <a href="/register" style={{ color: '#0BA5CC', fontWeight: 500 }}>Зарегистрироваться</a>
            </p>
          ) : (
            <p style={{ fontSize: 14, color: '#6B7686' }}>
              Ещё не партнёр?{' '}
              <a href="/partner" style={{ color: '#0BA5CC', fontWeight: 500 }}>Подать заявку</a>
            </p>
          )}
        </div>

        {/* Переключатель типа */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          {tab === 'user' ? (
            <button onClick={() => setTab('partner')}
              style={{ fontSize: 12, color: '#B4B2A9', background: 'none', border: 'none', cursor: 'pointer' }}>
              Вы партнёр? Войти в кабинет партнёра →
            </button>
          ) : (
            <button onClick={() => setTab('user')}
              style={{ fontSize: 12, color: '#B4B2A9', background: 'none', border: 'none', cursor: 'pointer' }}>
              Вы владелец EV? Войти как пользователь →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

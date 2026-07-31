'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const submit = async () => {
    setError('');
    if (!form.name || !form.email || !form.password) return setError('Заполните все поля');
    if (form.password.length < 8) return setError('Пароль минимум 8 символов');
    if (form.password !== form.confirm) return setError('Пароли не совпадают');

    setLoading(true);
    try {
      const res = await fetch(`${api}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка регистрации');
      router.push('/login?registered=1');
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
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 24, fontWeight: 700, textDecoration: 'none', color: '#10192B' }}>
            proev<span style={{ color: '#0BA5CC' }}>.ru</span>
          </a>
          <p style={{ marginTop: 8, fontSize: 14, color: '#6B7686' }}>Создайте аккаунт</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #DCE1E8', padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Имя</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Александр" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                type="email" placeholder="you@email.ru" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Пароль</label>
              <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                type="password" placeholder="Минимум 8 символов" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7686', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Повторите пароль</label>
              <input value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                type="password" placeholder="Повторите пароль" style={inp}
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#EF4444' }}>
                {error}
              </div>
            )}

            <button onClick={submit} disabled={loading}
              style={{ width: '100%', padding: '13px', background: '#0B1220', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </button>

            <p style={{ fontSize: 11, color: '#B4B2A9', textAlign: 'center', lineHeight: 1.5 }}>
              Регистрируясь, вы соглашаетесь с{' '}
              <a href="/privacy" style={{ color: '#0BA5CC' }}>политикой конфиденциальности</a>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#6B7686' }}>
          Уже есть аккаунт?{' '}
          <a href="/login" style={{ color: '#0BA5CC', fontWeight: 500 }}>Войти</a>
        </p>

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#B4B2A9' }}>
          Вы партнёр (сервис)?{' '}
          <a href="/partner" style={{ color: '#6B7686' }}>Регистрация партнёра →</a>
        </p>
      </div>
    </div>
  );
}

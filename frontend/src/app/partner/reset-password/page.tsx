'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [step, setStep] = useState<'check' | 'form' | 'expired' | 'done'>('check');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    if (!token) { setStep('expired'); return; }
    fetch(`${api}/partners/reset-token-valid/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) { setEmail(data.email || ''); setStep('form'); }
        else setStep(data.expired ? 'expired' : 'expired');
      })
      .catch(() => setStep('expired'));
  }, [token]);

  const submit = async () => {
    if (password.length < 6) { setError('Пароль должен быть не менее 6 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${api}/partners/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (res.ok) setStep('done');
      else setError(data.message || 'Ошибка сброса пароля');
    } catch { setError('Ошибка соединения'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper-50 flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <a href="/" className="font-bold text-xl text-ink-900">proev<span className="text-volt-600">.ru</span></a>
        </div>

        {step === 'check' && (
          <div className="bg-white border border-line rounded-2xl p-8 text-center">
            <i className="ti ti-loader-2 text-3xl text-muted animate-spin block mb-3" aria-hidden="true"/>
            <p className="text-sm text-muted">Проверяем ссылку...</p>
          </div>
        )}

        {step === 'expired' && (
          <div className="bg-white border border-line rounded-2xl p-8 text-center">
            <i className="ti ti-link-off text-4xl block mb-4" style={{ color: '#E24B4A' }} aria-hidden="true"/>
            <h1 className="text-lg font-semibold text-ink-900 mb-2">Ссылка недействительна</h1>
            <p className="text-sm text-muted mb-6">Ссылка устарела или уже использована. Запросите новую.</p>
            <a href="/partner/cabinet"
              className="block w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold text-center hover:bg-ink-700 transition-colors">
              Войти в кабинет
            </a>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white border border-line rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-ink-900 mb-1">Новый пароль</h1>
            {email && <p className="text-sm text-muted mb-5">Для аккаунта {email}</p>}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full text-sm border border-line rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-volt-600"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-900">
                    <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'} text-base`} aria-hidden="true"/>
                  </button>
                </div>
                {/* Индикатор надёжности */}
                {password.length > 0 && (
                  <div className="mt-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-colors"
                          style={{ background: i <= Math.min(4, Math.floor(password.length / 2)) ? '#1D9E75' : '#DCE1E8' }}/>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      {password.length < 6 ? 'Слишком короткий' : password.length < 8 ? 'Нормальный' : password.length < 12 ? 'Хороший' : 'Надёжный'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">
                  Повторите пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="Повторите новый пароль"
                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none transition-colors ${
                      confirm && password !== confirm
                        ? 'border-red-400 focus:border-red-400'
                        : confirm && password === confirm
                        ? 'border-green-400 focus:border-green-400'
                        : 'border-line focus:border-volt-600'
                    }`}
                  />
                  {confirm && (
                    <i className={`ti ${password === confirm ? 'ti-check text-green-500' : 'ti-x text-red-400'} absolute right-3 top-1/2 -translate-y-1/2 text-base`} aria-hidden="true"/>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  <i className="ti ti-alert-circle" aria-hidden="true"/>
                  {error}
                </div>
              )}

              <button onClick={submit} disabled={loading}
                className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {loading && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true"/>}
                {loading ? 'Сохраняем...' : 'Сохранить пароль'}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-white border border-line rounded-2xl p-8 text-center">
            <i className="ti ti-circle-check text-4xl block mb-4" style={{ color: '#1D9E75' }} aria-hidden="true"/>
            <h1 className="text-lg font-semibold text-ink-900 mb-2">Пароль изменён</h1>
            <p className="text-sm text-muted mb-6">Войдите в кабинет с новым паролем.</p>
            <a href="/partner/cabinet"
              className="block w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold text-center hover:bg-ink-700 transition-colors">
              Войти в кабинет →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

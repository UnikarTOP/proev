'use client';
import { useState, useEffect } from 'react';

type Step = 'form' | 'sent' | 'status';

export default function PartnerRegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{id:string;name:string;slug:string}[]>([]);
  const [form, setForm] = useState({
    companyName: '', city: '', phone: '', email: '',
    categoryId: '', description: '', website: '',
  });
  const [checkEmail, setCheckEmail] = useState('');

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    fetch(`${api}/service-providers/categories`).then(r => r.json()).then(setCategories).catch(()=>{});
  }, []);

  const submit = async () => {
    if (!form.companyName || !form.city || !form.phone || !form.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) setStep('sent');
      else {
        const err = await res.json();
        alert(err.message || 'Ошибка при отправке');
      }
    } catch { alert('Ошибка соединения'); }
    setLoading(false);
  };

  const checkStatus = async () => {
    if (!checkEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/partners/application-status/${encodeURIComponent(checkEmail)}`);
      const data = await res.json();
      setStatusInfo(data);
      setStep('status');
    } catch { alert('Ошибка'); }
    setLoading(false);
  };

  return (
    <div className="max-w-[640px] mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-volt-600 uppercase tracking-widest">Партнёрам</span>
          <a href="/partner/cabinet"
            className="flex items-center gap-2 text-sm font-semibold bg-ink-900 text-white px-4 py-2 rounded-xl hover:bg-ink-700 transition-colors">
            <i className="ti ti-layout-dashboard text-sm" aria-hidden="true" />
            Войти в кабинет
          </a>
        </div>
        <h1 className="text-3xl font-bold text-ink-900 mb-3">Разместите свой сервис на proev.ru</h1>
        <p className="text-muted text-sm leading-relaxed">
          Заполните заявку — мы проверим её в течение 1–2 рабочих дней и пришлём данные для входа в личный кабинет, где вы самостоятельно создадите страницу своего сервиса.
        </p>
      </div>

      {/* Преимущества */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: 'ti-users', title: 'Аудитория EV', desc: 'Владельцы электромобилей по всей России' },
          { icon: 'ti-file-pencil', title: 'Свой лендинг', desc: 'Редактируйте страницу без программистов' },
          { icon: 'ti-chart-line', title: 'Заявки напрямую', desc: 'Лиды приходят прямо вам' },
        ].map(item => (
          <div key={item.title} className="bg-white border border-line rounded-xl p-4 text-center">
            <i className={`ti ${item.icon} text-2xl mb-2 block`} style={{ color: '#0BA5CC' }} aria-hidden="true" />
            <div className="text-xs font-semibold text-ink-900 mb-1">{item.title}</div>
            <div className="text-[11px] text-muted leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>

      {step === 'form' && (
        <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-ink-900 mb-4">Заявка на размещение</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">Название компании *</label>
              <input value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))}
                placeholder="EV Service Moscow" className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Город *</label>
              <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}
                placeholder="Москва" className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Телефон *</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                placeholder="+7 (___) ___-__-__" className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">Email для входа в кабинет *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                placeholder="info@evservice.ru" className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">Категория услуг</label>
              <select value={form.categoryId} onChange={e => setForm(f => ({...f, categoryId: e.target.value}))}
                className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600">
                <option value="">Выберите категорию</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">Сайт компании</label>
              <input value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))}
                placeholder="https://evservice.ru" className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted mb-1 block">Кратко о бизнесе</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Специализируемся на обслуживании электромобилей BYD, Zeekr, Tesla в Москве..."
                rows={3} className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 resize-none" />
            </div>
          </div>

          <button onClick={submit} disabled={loading || !form.companyName || !form.city || !form.phone || !form.email}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-ink-900 text-white hover:bg-ink-700 transition-colors disabled:opacity-50">
            {loading ? 'Отправляем...' : 'Отправить заявку →'}
          </button>
          <p className="text-[11px] text-muted text-center">
            Нажимая кнопку, вы соглашаетесь с условиями размещения на proev.ru
          </p>

          {/* Проверить статус */}
          <div className="border-t border-line pt-4 mt-2">
            <p className="text-xs text-muted mb-2">Уже подавали заявку? Проверьте статус:</p>
            <div className="flex gap-2">
              <input value={checkEmail} onChange={e => setCheckEmail(e.target.value)}
                placeholder="Ваш email" className="flex-1 text-sm border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-volt-600" />
              <button onClick={checkStatus} disabled={loading}
                className="px-4 py-2 text-sm border border-line rounded-lg text-muted hover:border-graphite-900/30 hover:text-ink-900 transition-colors">
                Проверить
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'sent' && (
        <div className="bg-white border border-line rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4" style={{ color: '#1D9E75' }}>
            <i className="ti ti-circle-check" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">Заявка отправлена</h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Мы рассмотрим её в течение 1–2 рабочих дней. После одобрения вы получите данные для входа в личный кабинет на <strong>{form.email}</strong>.
          </p>
          <a href="/" className="text-sm text-volt-600 underline underline-offset-2">На главную</a>
        </div>
      )}

      {step === 'status' && statusInfo && (
        <div className="bg-white border border-line rounded-2xl p-8 text-center">
          {statusInfo.status === 'not_found' && (
            <>
              <div className="text-4xl mb-4 opacity-30"><i className="ti ti-search" aria-hidden="true" /></div>
              <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка не найдена</h2>
              <p className="text-muted text-sm">Проверьте email или подайте новую заявку.</p>
            </>
          )}
          {statusInfo.status === 'pending' && (
            <>
              <div className="text-4xl mb-4" style={{ color: '#FFB020' }}><i className="ti ti-clock" aria-hidden="true" /></div>
              <h2 className="text-lg font-bold text-ink-900 mb-2">На рассмотрении</h2>
              <p className="text-muted text-sm">Мы рассматриваем заявку. Обычно это занимает 1–2 рабочих дня.</p>
            </>
          )}
          {statusInfo.status === 'approved' && (
            <>
              <div className="text-4xl mb-4" style={{ color: '#1D9E75' }}><i className="ti ti-circle-check" aria-hidden="true" /></div>
              <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка одобрена!</h2>
              <p className="text-muted text-sm mb-4">Данные для входа отправлены на ваш email. Войдите в личный кабинет.</p>
              <a href="/partner/cabinet"
                className="inline-block px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold">
                Войти в кабинет →
              </a>
            </>
          )}
          {statusInfo.status === 'rejected' && (
            <>
              <div className="text-4xl mb-4" style={{ color: '#E24B4A' }}><i className="ti ti-x-circle" aria-hidden="true" /></div>
              <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка отклонена</h2>
              {statusInfo.rejectionReason && <p className="text-muted text-sm">{statusInfo.rejectionReason}</p>}
            </>
          )}
          <button onClick={() => { setStep('form'); setStatusInfo(null); }}
            className="mt-4 text-sm text-muted underline underline-offset-2">
            Назад
          </button>
        </div>
      )}
    </div>
  );
}

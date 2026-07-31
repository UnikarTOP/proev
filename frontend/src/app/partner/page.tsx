'use client';
import CitySelect from '@/components/CitySelect';
import { useState, useEffect } from 'react';

type Step = 'landing' | 'form' | 'sent' | 'status';

export default function PartnerPage() {
  const [step, setStep] = useState<Step>('landing');
  const [form, setForm] = useState({ companyName: '', city: '', phone: '', email: '', categoryId: '', description: '', website: '' });
  const [categories, setCategories] = useState<{id:string;name:string}[]>([]);
  const [checkEmail, setCheckEmail] = useState('');
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    fetch(`${api}/service-providers/categories`).then(r => r.json()).then(setCategories).catch(()=>{});
  }, []);

  const submit = async () => {
    if (!form.companyName || !form.city || !form.phone || !form.email) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/partners/apply`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      if (res.ok) setStep('sent');
      else { const e = await res.json(); alert(e.message || 'Ошибка'); }
    } catch { alert('Ошибка соединения'); }
    setLoading(false);
  };

  const checkStatus = async () => {
    if (!checkEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${api}/partners/application-status/${encodeURIComponent(checkEmail)}`);
      setStatusInfo(await res.json());
      setStep('status');
    } catch {}
    setLoading(false);
  };

  const inp = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600';

  if (step === 'landing') return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-10 md:py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          <span>⚡</span> Для бизнеса
        </div>
        <h1 className="text-[28px] md:text-[40px] font-bold text-ink-900 tracking-tight leading-tight mb-4">
          Привлекайте клиентов<br/>с электромобилями
        </h1>
        <p className="text-muted text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          proev.ru — платформа для владельцев EV в России. Разместите свой сервис и получайте целевые заявки от аудитории, которая уже ищет вас.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => setStep('form')}
            className="px-8 py-3.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Разместить сервис бесплатно →
          </button>
          <a href="/partner/cabinet"
            className="px-8 py-3.5 border border-line text-ink-900 rounded-xl text-sm font-semibold hover:border-graphite-900/30 transition-colors text-center">
            Войти в кабинет
          </a>
        </div>
      </div>

      {/* Преимущества */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        {[
          { icon: '🎯', title: 'Целевая аудитория', desc: 'Только владельцы и покупатели электромобилей — люди которые уже ищут ваши услуги.' },
          { icon: '📄', title: 'Собственная страница', desc: 'Мини-лендинг с описанием, фото, услугами, отзывами и блогом. Редактируйте сами.' },
          { icon: '📩', title: 'Заявки напрямую', desc: 'Клиенты оставляют заявки прямо на вашей странице. Вы управляете ими в CRM.' },
        ].map(f => (
          <div key={f.title} className="bg-white border border-line rounded-xl p-5">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-ink-900 mb-2">{f.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Что входит */}
      <div className="bg-ink-900 rounded-2xl p-6 md:p-8 mb-8">
        <h2 className="text-white text-lg font-semibold mb-5">Что вы получаете бесплатно</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Страница вашего сервиса на proev.ru',
            'Форма заявки с согласием 152-ФЗ',
            'CRM для управления заявками',
            'Блог для экспертного контента',
            'Галерея фото и услуги',
            'Отзывы клиентов',
            'Аналитика просмотров (скоро)',
            'Уведомления о новых заявках (скоро)',
          ].map(item => (
            <div key={item} className="flex items-center gap-2.5 text-sm" style={{ color: '#B7C0D1' }}>
              <span style={{ color: '#1D9E75' }}>✓</span> {item}
            </div>
          ))}
        </div>
      </div>

      {/* Демо-ссылка */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted mb-3">Посмотрите как выглядит страница партнёра:</p>
        <a href="/services" target="_blank"
          className="text-volt-600 text-sm underline underline-offset-2 hover:opacity-80">
          Пример страницы СТО →
        </a>
      </div>

      {/* Проверить статус */}
      <div className="bg-white border border-line rounded-xl p-5">
        <p className="text-sm font-medium text-ink-900 mb-3">Уже подавали заявку? Проверьте статус:</p>
        <div className="flex gap-2">
          <input value={checkEmail} onChange={e => setCheckEmail(e.target.value)}
            placeholder="Ваш email" className={`flex-1 ${inp}`} />
          <button onClick={checkStatus} disabled={loading}
            className="px-4 py-2 text-sm border border-line rounded-lg text-muted hover:border-graphite-900/30 hover:text-ink-900 transition-colors disabled:opacity-50">
            Проверить
          </button>
        </div>
      </div>
    </div>
  );

  if (step === 'form') return (
    <div className="max-w-[560px] mx-auto px-4 md:px-6 py-10">
      <button onClick={() => setStep('landing')} className="text-sm text-muted mb-6 flex items-center gap-1 hover:text-ink-900">
        ← Назад
      </button>
      <h1 className="text-2xl font-bold text-ink-900 mb-2">Заявка на размещение</h1>
      <p className="text-muted text-sm mb-6">Рассмотрим в течение 1–2 рабочих дней</p>

      <div className="bg-white border border-line rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Название компании *</label>
          <input value={form.companyName} onChange={e => setForm(f=>({...f,companyName:e.target.value}))} placeholder="EV Service Moscow" className={inp}/>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Город *</label>
            <CitySelect
              value={form.city}
              onChange={city => setForm(f=>({...f, city}))}
              placeholder="Выберите город"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Телефон *</label>
            <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="+7..." className={inp}/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="info@evservice.ru" className={inp}/>
        </div>
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Категория</label>
          <select value={form.categoryId} onChange={e => setForm(f=>({...f,categoryId:e.target.value}))} className={inp}>
            <option value="">Выберите категорию</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">О компании</label>
          <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
            placeholder="Кратко о вашем бизнесе..." rows={3} className={`${inp} resize-none`}/>
        </div>
        <button onClick={submit} disabled={loading || !form.companyName || !form.city || !form.phone || !form.email}
          className="w-full py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
          {loading ? 'Отправляем...' : 'Отправить заявку'}
        </button>
      </div>
    </div>
  );

  if (step === 'sent') return (
    <div className="max-w-[480px] mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4" style={{color:'#1D9E75'}}>✓</div>
      <h2 className="text-xl font-bold text-ink-900 mb-2">Заявка отправлена</h2>
      <p className="text-muted text-sm mb-6">Рассмотрим в течение 1–2 рабочих дней. Ответим на <strong>{form.email}</strong></p>
      <a href="/" className="text-sm text-volt-600 underline underline-offset-2">На главную</a>
    </div>
  );

  if (step === 'status' && statusInfo) return (
    <div className="max-w-[480px] mx-auto px-4 py-16 text-center">
      {statusInfo.status === 'not_found' && <>
        <div className="text-4xl mb-4 opacity-30">🔍</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка не найдена</h2>
        <p className="text-muted text-sm">Проверьте email или подайте заявку.</p>
      </>}
      {statusInfo.status === 'pending' && <>
        <div className="text-4xl mb-4" style={{color:'#EF9F27'}}>⏳</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">На рассмотрении</h2>
        <p className="text-muted text-sm">Обычно 1–2 рабочих дня.</p>
      </>}
      {statusInfo.status === 'approved' && <>
        <div className="text-4xl mb-4" style={{color:'#1D9E75'}}>✓</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка одобрена!</h2>
        <p className="text-muted text-sm mb-4">Данные для входа отправлены на email.</p>
        <a href="/partner/cabinet" className="inline-block px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold">
          Войти в кабинет →
        </a>
      </>}
      {statusInfo.status === 'rejected' && <>
        <div className="text-4xl mb-4" style={{color:'#E24B4A'}}>✗</div>
        <h2 className="text-lg font-bold text-ink-900 mb-2">Заявка отклонена</h2>
        {statusInfo.rejectionReason && <p className="text-muted text-sm">{statusInfo.rejectionReason}</p>}
      </>}
      <button onClick={() => setStep('landing')} className="mt-6 text-sm text-muted underline underline-offset-2">Назад</button>
    </div>
  );

  return null;
}

'use client';

import { useState } from 'react';

const BENEFITS = [
  {
    icon: '🗺️',
    title: 'Карта с реальными статусами',
    desc: 'Ваши станции появятся на интерактивной карте proev.ru. Водители видят тип разъёма, мощность и статус в реальном времени.',
  },
  {
    icon: '🥇',
    title: 'Золотой партнёр навсегда',
    desc: 'Бесплатное размещение в каталоге сервисов с бейджем «Золотой партнёр». Приоритет в выдаче, верификация, отдельный лендинг.',
  },
  {
    icon: '📩',
    title: 'Заявки от клиентов',
    desc: 'Форма заявки на вашем лендинге — водители пишут напрямую вам. CRM для управления обращениями в личном кабинете.',
  },
  {
    icon: '📰',
    title: 'Контент и PR',
    desc: 'Публикуем новости о вашей сети в нашей ленте. Рассказываем аудитории о новых станциях, акциях и расширении.',
  },
  {
    icon: '⚡',
    title: 'OCPI 2.2.1 интеграция',
    desc: 'Поддерживаем стандартный протокол обмена данными. Если у вас есть OCPI — подключение займёт 1-2 дня.',
  },
  {
    icon: '📊',
    title: 'Аналитика и отзывы',
    desc: 'Видите просмотры страницы, отзывы водителей и репорты о статусах станций. Обратная связь от реальных пользователей.',
  },
];

const STEPS = [
  { num: '01', title: 'Оставьте заявку', desc: 'Заполните форму ниже — укажите контакты и расскажите о вашей сети.' },
  { num: '02', title: 'Согласуем данные', desc: 'Свяжемся в течение 24 часов, согласуем формат передачи данных о станциях.' },
  { num: '03', title: 'Подключаем карту', desc: 'Ваши станции появляются на карте proev.ru. Загружаем через OCPI, API или Excel.' },
  { num: '04', title: 'Золотой партнёр', desc: 'Создаём ваш лендинг в каталоге, активируем статус Золотого партнёра навсегда.' },
];

const OPERATORS = [
  { name: 'Сети ЭЗС', desc: 'Федеральные и региональные операторы зарядной инфраструктуры', icon: '🏢' },
  { name: 'Торговые центры', desc: 'ТЦ и ТРК с собственными зарядными станциями на парковке', icon: '🏬' },
  { name: 'Отели и офисы', desc: 'Объекты с зарядкой для клиентов и резидентов', icon: '🏨' },
  { name: 'Застройщики', desc: 'ЖК и бизнес-парки с инфраструктурой для EV', icon: '🏗️' },
];

export default function OperatorsPage() {
  const [form, setForm] = useState({ company: '', name: '', phone: '', email: '', stationsCount: '', comment: '' });
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp = 'w-full text-sm border border-line rounded-xl px-4 py-3 focus:outline-none focus:border-volt-600 bg-white';

  const submit = async () => {
    if (!form.company || !form.email || !form.phone) return;
    setLoading(true);
    // Отправляем через стандартную форму партнёра с пометкой что это оператор
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      await fetch(`${api}/partners/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.company,
          city: '',
          phone: form.phone,
          email: form.email,
          description: `[ОПЕРАТОР ЭЗС] Станций: ${form.stationsCount}. ${form.comment}`,
          website: '',
        }),
      });
      setSent(true);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <div className="bg-ink-900 text-white">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-400 bg-volt-400/10 px-3 py-1.5 rounded-full mb-6">
            ⚡ Для операторов зарядных станций
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-[30px] md:text-[46px] font-bold leading-tight mb-6 tracking-tight">
                Разместите ваши<br />
                <span className="text-volt-400">зарядные станции</span><br />
                на карте proev.ru
              </h1>
              <p className="text-base md:text-lg text-white/70 leading-relaxed mb-8">
                Бесплатно подключаем операторов ЭЗС к нашей карте и размещаем в каталоге как Золотого партнёра навсегда. Никаких платежей — только ваши данные о станциях.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#form"
                  className="px-8 py-3.5 rounded-xl text-sm font-semibold transition-colors no-underline"
                  style={{ background: '#3DDBFF', color: '#0B1220' }}>
                  Подключить станции →
                </a>
                <a href="#how"
                  className="px-8 py-3.5 border border-white/20 text-white rounded-xl text-sm font-semibold hover:border-white/40 transition-colors no-underline">
                  Как это работает
                </a>
              </div>
            </div>

            {/* Метрики */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: '1 000+', label: 'Станций на карте', sub: 'и растём каждый день' },
                { val: '0 ₽', label: 'Стоимость подключения', sub: 'навсегда бесплатно' },
                { val: '1-2 дня', label: 'Время интеграции', sub: 'при наличии OCPI' },
                { val: '🥇', label: 'Золотой партнёр', sub: 'бессрочный статус' },
              ].map(m => (
                <div key={m.label} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">{m.val}</div>
                  <div className="text-sm font-medium text-white/80">{m.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Кому подходит */}
      <div className="bg-paper-50 py-14 md:py-20">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <h2 className="text-[22px] md:text-[30px] font-bold text-ink-900 mb-3 text-center">Кому подходит</h2>
          <p className="text-muted text-center mb-10 text-sm">Работаем с любыми владельцами зарядной инфраструктуры</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {OPERATORS.map(op => (
              <div key={op.name} className="bg-white border border-line rounded-2xl p-5 text-center">
                <div className="text-3xl mb-3">{op.icon}</div>
                <div className="font-semibold text-ink-900 text-sm mb-1">{op.name}</div>
                <div className="text-xs text-muted leading-relaxed">{op.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Что получаете */}
      <div className="bg-white py-14 md:py-20">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <h2 className="text-[22px] md:text-[30px] font-bold text-ink-900 mb-3 text-center">Что вы получаете</h2>
          <p className="text-muted text-center mb-10 text-sm">Полный пакет бесплатно — только за данные о ваших станциях</p>
          <div className="grid md:grid-cols-3 gap-5">
            {BENEFITS.map(b => (
              <div key={b.title} className="border border-line rounded-2xl p-6 hover:border-volt-600/30 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{b.icon}</div>
                <h3 className="font-semibold text-ink-900 mb-2">{b.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Как это работает */}
      <div id="how" className="bg-paper-50 py-14 md:py-20">
        <div className="max-w-[800px] mx-auto px-4 md:px-8">
          <h2 className="text-[22px] md:text-[30px] font-bold text-ink-900 mb-3 text-center">Как это работает</h2>
          <p className="text-muted text-center mb-12 text-sm">Простой процесс без бюрократии</p>
          <div className="space-y-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-ink-900 text-white flex items-center justify-center font-bold text-sm">
                  {s.num}
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="font-semibold text-ink-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="absolute ml-6 mt-14 w-px h-6 bg-line" style={{ position: 'relative', left: -224, top: 8, marginLeft: 24, height: 24 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Форматы данных */}
      <div className="bg-white py-14 md:py-16">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <h2 className="text-[22px] md:text-[28px] font-bold text-ink-900 mb-10 text-center">Поддерживаемые форматы</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: '🔌',
                title: 'OCPI 2.2.1',
                desc: 'Стандартный протокол для операторов ЭЗС. Подключение за 1-2 дня, автоматическое обновление статусов.',
                badge: 'Рекомендуем',
                badgeColor: 'bg-green-100 text-green-700',
              },
              {
                icon: '🔗',
                title: 'REST API',
                desc: 'Если у вас есть собственный API с данными о станциях — интегрируемся напрямую по согласованному формату.',
                badge: null,
                badgeColor: '',
              },
              {
                icon: '📋',
                title: 'Excel / CSV',
                desc: 'Загрузим ваши станции из таблицы. Подходит если нет API. Обновление данных по запросу или по расписанию.',
                badge: 'Быстрый старт',
                badgeColor: 'bg-blue-100 text-blue-700',
              },
            ].map(f => (
              <div key={f.title} className="border border-line rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <div className="font-semibold text-ink-900">{f.title}</div>
                    {f.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.badgeColor}`}>{f.badge}</span>}
                  </div>
                </div>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Форма */}
      <div id="form" className="bg-paper-50 py-14 md:py-20">
        <div className="max-w-[560px] mx-auto px-4 md:px-8">
          <h2 className="text-[22px] md:text-[30px] font-bold text-ink-900 mb-3 text-center">
            Подключить станции
          </h2>
          <p className="text-muted text-center mb-10 text-sm">
            Оставьте контакты — свяжемся в течение 24 часов
          </p>

          {sent ? (
            <div className="bg-white border border-line rounded-2xl p-10 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-ink-900 mb-2">Заявка принята!</h3>
              <p className="text-sm text-muted leading-relaxed">
                Мы получили вашу заявку и свяжемся в течение 24 часов для согласования деталей подключения.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-line rounded-2xl p-6 md:p-8 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">
                  Название компании / сети *
                </label>
                <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="ООО «ЭнергоЗаряд» / PUNKT E" className={inp} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Ваше имя</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Александр" className={inp} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Кол-во станций</label>
                  <input value={form.stationsCount} onChange={e => setForm(f => ({ ...f, stationsCount: e.target.value }))}
                    placeholder="100" type="number" min="1" className={inp} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Телефон *</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (999) 123-45-67" type="tel" className={inp} />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Email *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="partner@company.ru" type="email" className={inp} />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">
                  Как передаёте данные? (OCPI / API / Excel)
                </label>
                <textarea value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="Есть OCPI 2.2.1, 150 станций в 10 городах России..."
                  rows={3} className={`${inp} resize-none`} />
              </div>

              <div className="flex items-start gap-3">
                <input type="checkbox" id="consent" checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-volt-600 cursor-pointer flex-shrink-0" />
                <label htmlFor="consent" className="text-xs text-muted leading-relaxed cursor-pointer">
                  Согласен на обработку персональных данных в соответствии с{' '}
                  <a href="/privacy" className="underline underline-offset-2 hover:text-ink-900">
                    политикой конфиденциальности
                  </a>{' '}
                  и Федеральным законом № 152-ФЗ
                </label>
              </div>

              <button onClick={submit} disabled={loading || !form.company || !form.email || !form.phone || !consent}
                className="w-full py-3.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <span className="animate-spin">⟳</span>}
                Отправить заявку
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Финальный CTA */}
      <div className="bg-ink-900 py-14 text-center">
        <div className="max-w-[600px] mx-auto px-4">
          <div className="text-3xl mb-4">🥇</div>
          <h2 className="text-[24px] font-bold text-white mb-3">
            Станьте Золотым партнёром proev.ru
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Бесплатно и навсегда. Ваши станции на карте, лендинг в каталоге,
            заявки от клиентов и поддержка команды proev.ru.
          </p>
          <a href="#form"
            className="inline-block px-10 py-3.5 rounded-xl text-sm font-semibold no-underline"
            style={{ background: '#3DDBFF', color: '#0B1220' }}>
            Подключить бесплатно →
          </a>
          <p className="text-white/30 text-xs mt-6">
            Или напишите напрямую:{' '}
            <a href="mailto:partners@proev.ru" className="text-volt-400 hover:text-volt-400/80">
              partners@proev.ru
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

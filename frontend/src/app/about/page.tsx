import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О проекте — proev.ru',
  description: 'proev.ru — платформа для владельцев электромобилей в России. Карта зарядок, каталог сервисов, новости.',
};

export default function AboutPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-10 md:py-16">

      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          <span>⚡</span> О проекте
        </div>
        <h1 className="text-[28px] md:text-[40px] font-bold text-ink-900 tracking-tight leading-tight mb-4">
          Мы строим экосистему<br />для электромобилей в России
        </h1>
        <p className="text-muted text-base md:text-lg leading-relaxed">
          proev.ru — информационная платформа, которая объединяет карту зарядных станций,
          каталог EV-сервисов и актуальные новости об электромобилях.
        </p>
      </div>

      {/* Миссия */}
      <div className="bg-ink-900 rounded-2xl p-6 md:p-8 mb-10">
        <div className="text-xs font-semibold text-volt-400 uppercase tracking-wider mb-3">Наша миссия</div>
        <p className="text-white text-base md:text-lg leading-relaxed">
          Сделать переход на электромобиль простым и понятным для каждого водителя в России.
          Мы верим, что доступная инфраструктура и качественная информация — ключевые факторы роста EV-рынка.
        </p>
      </div>

      {/* Что мы делаем */}
      <div className="mb-10">
        <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 mb-6">Что мы делаем</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '🗺️', title: 'Карта зарядных станций', desc: 'Актуальные статусы — обновляют сами водители в реальном времени. OCPI-интеграция с операторами сетей.' },
            { icon: '🔧', title: 'Каталог EV-сервисов', desc: 'Проверенные СТО, установщики зарядных станций, страховщики и другие специалисты для владельцев EV.' },
            { icon: '📰', title: 'Новости об электромобилях', desc: 'Агрегатор актуальных материалов из ведущих российских изданий — всё в одном месте.' },
            { icon: '💼', title: 'Инструменты для бизнеса', desc: 'CRM, блог, публичный API и аналитика для партнёров платформы. Первые лиды уже в день регистрации.' },
          ].map(f => (
            <div key={f.title} className="bg-white border border-line rounded-xl p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-ink-900 mb-2">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Рынок */}
      <div className="mb-10">
        <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 mb-6">Рынок и потенциал</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { val: '50 000+', label: 'электромобилей в России', sub: 'данные 2025 года' },
            { val: '40%', label: 'рост год к году', sub: 'по данным Автостата' },
            { val: '₽3 млрд', label: 'объём рынка EV-сервисов', sub: 'прогноз к 2027 году' },
          ].map(m => (
            <div key={m.label} className="bg-paper-50 border border-line rounded-xl p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-ink-900 mb-1">{m.val}</div>
              <div className="text-xs text-muted leading-snug">{m.label}</div>
              <div className="text-[10px] text-muted/60 mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted leading-relaxed">
          Россия входит в топ-10 мировых рынков по темпам роста продаж электромобилей. К 2027 году
          прогнозируется более <strong className="text-ink-900">200 000 электромобилей</strong> на дорогах страны.
          Спрос на инфраструктуру и сервисы растёт пропорционально.
        </p>
      </div>

      {/* Бизнес-модель */}
      <div className="mb-10">
        <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 mb-6">Бизнес-модель</h2>
        <div className="space-y-3">
          {[
            { icon: '💰', title: 'Платное размещение', desc: 'Продвижение в каталоге, Featured-места, приоритет в выдаче для партнёров' },
            { icon: '📊', title: 'Аналитика и лиды', desc: 'Расширенная статистика, экспорт данных, интеграции с CRM через API' },
            { icon: '📣', title: 'Рекламные интеграции', desc: 'Нативная реклама EV-брендов для целевой аудитории владельцев электромобилей' },
            { icon: '🤝', title: 'Партнёрские программы', desc: 'Реферальные выплаты, White-label виджеты, B2B-интеграции' },
          ].map(b => (
            <div key={b.title} className="flex gap-4 p-4 bg-white border border-line rounded-xl">
              <span className="text-xl flex-shrink-0">{b.icon}</span>
              <div>
                <div className="font-semibold text-ink-900 text-sm mb-0.5">{b.title}</div>
                <div className="text-xs text-muted leading-relaxed">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Роадмап */}
      <div className="mb-10">
        <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 mb-6">История и планы</h2>
        <div className="space-y-4">
          {[
            { date: 'Апрель 2026', title: 'Старт разработки', done: true },
            { date: 'Июль 2026', title: 'Запуск MVP — карта, каталог, новости, кабинет партнёра с CRM и блогом', done: true },
            { date: 'Q3 2026', title: 'Рост партнёрской сети, первые платящие клиенты', done: false },
            { date: 'Q4 2026', title: 'Монетизация через ЮKassa, расширенная аналитика', done: false },
            { date: '2027', title: 'Мобильное приложение, OCPI-интеграции с операторами, Telegram-бот', done: false },
          ].map(r => (
            <div key={r.date} className="flex gap-4 items-start">
              <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${r.done ? 'bg-volt-600' : 'bg-line'}`} />
              <div>
                <div className="text-xs font-semibold text-muted mb-0.5">{r.date}</div>
                <div className={`text-sm ${r.done ? 'text-ink-900 font-medium' : 'text-muted'}`}>{r.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="border border-line rounded-2xl p-6 md:p-8">
        <h2 className="text-[18px] font-bold text-ink-900 mb-3">Сотрудничество</h2>
        <p className="text-sm text-muted leading-relaxed mb-6">
          Мы открыты к разговору с инвесторами, стратегическими партнёрами и EV-компаниями.
          Если вы оператор зарядных станций — бесплатно разместим ваши объекты на карте.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/operators"
            className="px-5 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Операторам ЭЗС →
          </a>
          <a href="/partner"
            className="px-5 py-2.5 border border-line text-ink-900 rounded-xl text-sm font-semibold hover:border-graphite-900/30 transition-colors">
            Стать партнёром
          </a>
          <a href="mailto:hello@proev.ru"
            className="px-5 py-2.5 border border-line text-muted rounded-xl text-sm hover:border-graphite-900/30 hover:text-ink-900 transition-colors">
            hello@proev.ru
          </a>
        </div>
      </div>

    </div>
  );
}

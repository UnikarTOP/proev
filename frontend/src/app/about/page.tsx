import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'О проекте — proev.ru',
  description: 'proev.ru — платформа для владельцев электромобилей в России. Карта зарядок, каталог сервисов, сообщество.',
};

const TEAM = [
  { name: 'Анатолий', role: 'Основатель & CEO', desc: 'Серийный предприниматель. Владелец электромобиля с 2022 года.' },
];

const STATS = [
  { val: '30+', label: 'городов', desc: 'Зарядные станции по всей России' },
  { val: '5', label: 'источников новостей', desc: 'Автоматическая агрегация EV-контента' },
  { val: '8', label: 'категорий сервисов', desc: 'От СТО до страхования' },
  { val: '2026', label: 'год запуска', desc: 'MVP выпущен в июле 2026' },
];

const TIMELINE = [
  { date: 'Апрель 2026', event: 'Идея и начало разработки', desc: 'Появилась идея создать единую платформу для EV-аудитории России' },
  { date: 'Июль 2026', event: 'Запуск MVP v0.1', desc: 'Карта зарядных станций, каталог сервисов, новости, партнёрский кабинет с CRM и блогом' },
  { date: 'Q3 2026', event: 'Рост партнёрской сети', desc: 'Подключение первых платящих партнёров, верификация сервисов' },
  { date: 'Q4 2026', event: 'Монетизация', desc: 'Платное размещение, продвижение, реклама для EV-аудитории' },
  { date: '2027', event: 'Масштабирование', desc: 'Мобильное приложение, OCPI-интеграция с зарядными сетями, Telegram-бот' },
];

export default function AboutPage() {
  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-10 md:py-16">

      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          О проекте
        </div>
        <h1 className="text-[32px] md:text-[44px] font-bold text-ink-900 tracking-tight leading-tight mb-5">
          Мы строим экосистему<br/>для электромобилей в России
        </h1>
        <p className="text-base md:text-lg text-muted leading-relaxed max-w-2xl">
          proev.ru — платформа которая объединяет владельцев электромобилей, зарядную инфраструктуру
          и сервисные компании. Мы делаем переход на электромобиль простым и понятным для каждого.
        </p>
      </div>

      {/* Проблема и решение */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <div className="text-2xl mb-3">😤</div>
          <h2 className="font-semibold text-ink-900 mb-3">Проблема</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Нет единой карты зарядных станций с реальными статусами</li>
            <li>• Сложно найти СТО которое умеет работать с EV</li>
            <li>• Нет сообщества и экспертного контента на русском</li>
            <li>• EV-сервисы не могут найти свою аудиторию</li>
          </ul>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
          <div className="text-2xl mb-3">⚡</div>
          <h2 className="font-semibold text-ink-900 mb-3">Решение</h2>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Карта с актуальными статусами от водителей</li>
            <li>• Каталог верифицированных EV-сервисов</li>
            <li>• Агрегатор новостей и экспертный контент</li>
            <li>• B2B-платформа с CRM для партнёров</li>
          </ul>
        </div>
      </div>

      {/* Цифры */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {STATS.map(s => (
          <div key={s.label} className="text-center bg-white border border-line rounded-xl p-4">
            <div className="text-3xl font-bold text-ink-900 font-mono mb-1">{s.val}</div>
            <div className="text-sm font-semibold text-ink-900 mb-1">{s.label}</div>
            <div className="text-xs text-muted leading-relaxed">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Рынок */}
      <div className="bg-ink-900 rounded-2xl p-6 md:p-8 mb-12 text-white">
        <h2 className="text-xl font-bold mb-5">Рынок и потенциал</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { val: '50 000+', label: 'EV в России (2025)', desc: 'Рост 40% год к году' },
            { val: '200 000+', label: 'Прогноз к 2027', desc: 'По данным Минпромторга' },
            { val: '₽3 млрд', label: 'Объём рынка EV-сервисов', desc: 'Оценка TAM к 2027' },
          ].map(m => (
            <div key={m.label}>
              <div className="text-2xl font-bold font-mono mb-1" style={{ color: '#3DDBFF' }}>{m.val}</div>
              <div className="text-sm font-semibold mb-1">{m.label}</div>
              <div className="text-xs" style={{ color: '#6B7686' }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Бизнес-модель */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-ink-900 mb-5">Бизнес-модель</h2>
        <div className="space-y-3">
          {[
            { icon: '🎯', title: 'Платное размещение (в разработке)', desc: 'Партнёры платят за продвижение в каталоге, Featured-места, приоритет в выдаче', tag: 'основной доход' },
            { icon: '📊', title: 'Аналитика и лиды (в разработке)', desc: 'Расширенная статистика, экспорт лидов, интеграции с CRM-системами', tag: 'SaaS' },
            { icon: '📢', title: 'Рекламные интеграции (в разработке)', desc: 'Нативная реклама EV-брендов, зарядных сетей, автодилеров для EV-аудитории', tag: 'медиа' },
            { icon: '🤝', title: 'Партнёрские программы', desc: 'Реферальные выплаты за привлечение клиентов к партнёрам через API и вебхуки', tag: 'работает сейчас' },
          ].map(m => (
            <div key={m.title} className="flex gap-4 bg-white border border-line rounded-xl p-4">
              <div className="text-2xl shrink-0">{m.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-ink-900 text-sm">{m.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${m.tag === 'работает сейчас' ? 'bg-green-100 text-green-700' : 'bg-paper-50 border border-line text-muted'}`}>
                    {m.tag}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Таймлайн */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-ink-900 mb-6">Развитие проекта</h2>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-line" />
          <div className="space-y-6">
            {TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-5">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${i <= 1 ? 'bg-ink-900 border-ink-900' : 'bg-white border-line'}`}>
                  {i <= 1 ? <span className="text-white text-xs">✓</span> : <span className="text-muted text-xs">{i + 1}</span>}
                </div>
                <div className="pb-2">
                  <div className="text-xs font-semibold text-volt-600 mb-0.5">{item.date}</div>
                  <div className="font-semibold text-ink-900 text-sm mb-1">{item.event}</div>
                  <div className="text-xs text-muted leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Команда */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-ink-900 mb-5">Команда</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEAM.map(p => (
            <div key={p.name} className="bg-white border border-line rounded-xl p-5 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-volt-600/10 flex items-center justify-center text-lg font-bold text-volt-600 shrink-0">
                {p.name[0]}
              </div>
              <div>
                <div className="font-semibold text-ink-900">{p.name}</div>
                <div className="text-xs text-volt-600 mb-2">{p.role}</div>
                <p className="text-xs text-muted leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
          <div className="bg-paper-50 border border-dashed border-line rounded-xl p-5 flex items-center justify-center text-center">
            <div>
              <div className="text-2xl mb-2">👋</div>
              <div className="text-sm font-medium text-ink-900 mb-1">Мы растём</div>
              <p className="text-xs text-muted">Ищем партнёров и инвесторов</p>
              <a href="mailto:hello@proev.ru" className="text-xs text-volt-600 underline underline-offset-2 mt-2 block">
                hello@proev.ru
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA для инвесторов */}
      <div className="bg-ink-900 rounded-2xl p-6 md:p-8 text-center text-white">
        <h2 className="text-xl font-bold mb-3">Интересует сотрудничество?</h2>
        <p className="text-sm mb-6" style={{ color: '#B7C0D1' }}>
          Мы открыты к разговору с инвесторами, стратегическими партнёрами и EV-компаниями
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:hello@proev.ru"
            className="px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#3DDBFF', color: '#0B1220' }}>
            Написать нам
          </a>
          <a href="/partner"
            className="px-6 py-3 rounded-xl text-sm font-semibold border text-white transition-colors"
            style={{ borderColor: '#33415E' }}>
            Стать партнёром
          </a>
        </div>
      </div>

    </div>
  );
}

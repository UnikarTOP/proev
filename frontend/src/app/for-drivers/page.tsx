import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Для владельцев электромобилей — proev.ru',
  description: 'Всё что нужно владельцу электромобиля: карта зарядок, сервисы, сообщество, дневник поездок и планировщик маршрутов.',
};

const FEATURES = [
  { icon: '🗺️', title: 'Карта зарядных станций', desc: 'Более 1 500 зарядных станций по всей России с актуальными статусами. Фильтр по типу разъёма, мощности и сети.', link: '/charge-map', linkText: 'Открыть карту' },
  { icon: '🔧', title: 'Каталог EV-сервисов', desc: 'Проверенные СТО, установщики домашних зарядных станций, страховщики. Реальные отзывы и прямая форма заявки.', link: '/services', linkText: 'Найти сервис' },
  { icon: '⚡', title: 'Профиль и данные авто', desc: 'Укажите марку, модель, реальный запас хода и тип разъёма — карта покажет только совместимые станции.', link: '/register', linkText: 'Создать профиль' },
  { icon: '📋', title: 'Дневник поездок', desc: 'Записывайте каждую зарядку: кВт·ч, стоимость, реальная скорость. Статистика расходов и оценки станций.', link: '/profile', linkText: 'Открыть дневник' },
  { icon: '🧭', title: 'Планировщик маршрутов', desc: 'Укажите откуда и куда — система рассчитает где нужно зарядиться с учётом вашего реального запаса хода.', link: '/route-planner', linkText: 'Рассчитать маршрут' },
  { icon: '👥', title: 'Сообщество по маркам', desc: 'Найдите владельцев такого же электромобиля. Советы по обслуживанию и проверенные маршруты.', link: '/community', linkText: 'В сообщество' },
  { icon: '📰', title: 'Новости об электромобилях', desc: 'Агрегатор из ведущих российских изданий. Только релевантные новости про EV и инфраструктуру.', link: '/news', linkText: 'Читать новости' },
  { icon: '🔌', title: 'Краудсорсинг статусов', desc: 'Нашли неработающую зарядку? Отметьте прямо с карты — помогайте другим водителям.', link: '/charge-map', linkText: 'Открыть карту' },
];

const CABINET = [
  { icon: '👤', title: 'Профиль', desc: 'Имя, город, телефон, рассказ о себе' },
  { icon: '⚡', title: 'Данные авто', desc: 'Марка, модель, год, реальный запас хода, тип разъёма' },
  { icon: '📋', title: 'Дневник поездок', desc: 'История зарядок, расходы, оценки станций' },
  { icon: '📊', title: 'Статистика', desc: 'Всего кВт·ч, потрачено рублей, часов на зарядке' },
  { icon: '🔒', title: 'Безопасность', desc: 'Смена пароля, управление сессией' },
];

const FAQ = [
  { q: 'Это бесплатно?', a: 'Да, для владельцев электромобилей proev.ru полностью бесплатен — карта, сервисы, дневник, планировщик и сообщество.' },
  { q: 'Нужна ли регистрация?', a: 'Карту и каталог можно смотреть без регистрации. Для дневника, профиля авто и умной фильтрации нужен аккаунт.' },
  { q: 'Как добавить свою зарядку на карту?', a: 'Станции добавляются автоматически из OpenChargeMap. Если вашей нет — напишите на hello@proev.ru.' },
  { q: 'Как оставить отзыв о сервисе?', a: 'Найдите сервис в каталоге и нажмите кнопку отзыва на его странице. Отзывы видят все пользователи.' },
];

export default function ForDriversPage() {
  return (
    <div className="min-h-screen">

      <div className="bg-ink-900 text-white">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-16 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-400 bg-volt-400/10 px-3 py-1.5 rounded-full mb-6">
            ⚡ Для владельцев электромобилей
          </div>
          <h1 className="text-[28px] md:text-[48px] font-bold leading-tight mb-5 tracking-tight">
            Всё для вашего<br /><span className="text-volt-400">электромобиля</span> в России
          </h1>
          <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-[580px] mx-auto mb-8">
            Карта зарядок, каталог сервисов, дневник поездок и планировщик маршрутов — в одном месте, бесплатно.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/register" className="px-8 py-3.5 rounded-xl text-sm font-semibold no-underline" style={{ background: '#3DDBFF', color: '#0B1220' }}>Создать аккаунт бесплатно</a>
            <a href="/charge-map" className="px-8 py-3.5 border border-white/20 text-white rounded-xl text-sm font-semibold hover:border-white/40 transition-colors no-underline">Карта зарядок →</a>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-14 md:py-20">
        <h2 className="text-[22px] md:text-[32px] font-bold text-ink-900 text-center mb-12">Что вы получаете</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white border border-line rounded-2xl p-5 flex flex-col hover:shadow-md transition-all">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-ink-900 mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-muted leading-relaxed flex-1 mb-4">{f.desc}</p>
              <a href={f.link} className="text-xs font-semibold text-volt-600 no-underline hover:underline">{f.linkText} →</a>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-paper-50 py-14 md:py-20">
        <div className="max-w-[1100px] mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-5">👤 Личный кабинет</div>
              <h2 className="text-[22px] md:text-[32px] font-bold text-ink-900 mb-4">Ваш аккаунт —<br />всё в одном месте</h2>
              <p className="text-muted text-sm leading-relaxed mb-6">Зарегистрируйтесь один раз — никакой рекламы, никаких платежей для водителей.</p>
              <a href="/register" className="inline-block px-6 py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors no-underline">Создать аккаунт →</a>
            </div>
            <div className="space-y-3">
              {CABINET.map(f => (
                <div key={f.title} className="flex gap-4 items-start bg-white border border-line rounded-xl p-4">
                  <span className="text-xl flex-shrink-0">{f.icon}</span>
                  <div>
                    <div className="font-semibold text-ink-900 text-sm mb-0.5">{f.title}</div>
                    <div className="text-xs text-muted">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[700px] mx-auto px-4 md:px-8 py-14 md:py-20">
        <h2 className="text-[22px] font-bold text-ink-900 text-center mb-10">Частые вопросы</h2>
        <div className="space-y-4">
          {FAQ.map(f => (
            <div key={f.q} className="bg-white border border-line rounded-xl p-5">
              <h3 className="font-semibold text-ink-900 mb-2 text-sm">{f.q}</h3>
              <p className="text-xs text-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-ink-900 py-14 text-center">
        <div className="max-w-[500px] mx-auto px-4">
          <h2 className="text-[22px] font-bold text-white mb-3">Присоединяйтесь</h2>
          <p className="text-white/60 text-sm mb-6">Тысячи владельцев электромобилей уже используют proev.ru каждый день</p>
          <a href="/register" className="inline-block px-10 py-3.5 rounded-xl text-sm font-semibold no-underline" style={{ background: '#3DDBFF', color: '#0B1220' }}>Начать бесплатно →</a>
        </div>
      </div>

    </div>
  );
}

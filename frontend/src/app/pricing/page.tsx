import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Тарифы — proev.ru',
  description: 'Разместите свой EV-сервис на proev.ru. Бесплатное базовое размещение для всех партнёров.',
};

const PLANS = [
  {
    name: 'Базовый',
    price: 'Бесплатно',
    period: 'навсегда',
    color: '#6B7686',
    features: [
      'Страница сервиса в каталоге',
      'Форма заявки с 152-ФЗ',
      'До 6 фотографий',
      'Список услуг и марок EV',
      'CRM для управления заявками',
      'Блог (до 5 статей)',
      'Базовая аналитика',
    ],
    cta: 'Начать бесплатно',
    ctaHref: '/partner',
    highlight: false,
  },
  {
    name: 'Партнёр',
    price: '₽2 900',
    period: 'в месяц',
    color: '#0BA5CC',
    badge: 'Популярный',
    features: [
      'Всё из Базового',
      'Приоритет в каталоге',
      'Бейдж «Проверено proev.ru»',
      'Безлимитный блог',
      'API-ключи и вебхуки',
      'Email-уведомления о заявках',
      'Расширенная аналитика',
      'Поддержка 24/7',
    ],
    cta: 'Подключить',
    ctaHref: '/partner',
    highlight: true,
  },
  {
    name: 'Бизнес',
    price: '₽7 900',
    period: 'в месяц',
    color: '#0F6E56',
    features: [
      'Всё из Партнёра',
      'Несколько локаций',
      'Белый лейбл виджета',
      'Интеграция с amoCRM/Bitrix24',
      'Персональный менеджер',
      'Размещение в топе главной',
      'Нативные статьи в новостях',
    ],
    cta: 'Обсудить',
    ctaHref: 'mailto:hello@proev.ru',
    highlight: false,
  },
];

const FAQ = [
  { q: 'Можно ли начать бесплатно?', a: 'Да, базовое размещение бесплатно навсегда. Вы получаете страницу сервиса, форму заявки и CRM без каких-либо обязательств.' },
  { q: 'Когда запускаются платные тарифы?', a: 'Платные тарифы планируются к запуску в Q3 2026. Все кто зарегистрировался до этого получат скидку 50% на первые 3 месяца.' },
  { q: 'Есть ли API для интеграции?', a: 'Да, API доступен уже сейчас. Вы можете подключить свою CRM-систему через REST API или вебхуки. Документация в личном кабинете.' },
  { q: 'Как считается стоимость?', a: 'Фиксированная ежемесячная оплата без скрытых комиссий. Не берём процент с заявок.' },
];

export default function PricingPage() {
  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-6 py-10 md:py-16">

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          Тарифы
        </div>
        <h1 className="text-[28px] md:text-[40px] font-bold text-ink-900 tracking-tight mb-4">
          Начните бесплатно
        </h1>
        <p className="text-muted text-base max-w-lg mx-auto">
          Базовое размещение бесплатно. Платные функции появятся позже — первые партнёры получат их со скидкой.
        </p>
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-4 py-2 rounded-full mt-4">
          🎉 Ранний доступ — регистрируйтесь сейчас и получите скидку 50% на первые 3 месяца
        </div>
      </div>

      {/* Тарифные планы */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {PLANS.map(plan => (
          <div key={plan.name}
            className={`rounded-2xl overflow-hidden ${plan.highlight ? 'ring-2 ring-[#0BA5CC]' : 'border border-line'}`}>
            {plan.highlight && (
              <div className="py-2 text-center text-xs font-bold text-white" style={{ background: plan.color }}>
                {plan.badge}
              </div>
            )}
            <div className="bg-white p-6">
              <div className="mb-5">
                <h2 className="font-bold text-ink-900 text-lg mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-ink-900 font-mono">{plan.price}</span>
                  <span className="text-sm text-muted">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                    <span className="text-muted">{f}</span>
                  </li>
                ))}
              </ul>

              <a href={plan.ctaHref}
                className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors"
                style={plan.highlight
                  ? { background: plan.color, color: '#fff' }
                  : { background: '#F1EFE8', color: '#10192B' }}>
                {plan.cta}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Сравнение */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden mb-14">
        <div className="px-6 py-4 border-b border-line">
          <h2 className="font-semibold text-ink-900">Подробное сравнение тарифов</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-50">
                <th className="text-left px-6 py-3 text-muted font-medium">Функция</th>
                {PLANS.map(p => <th key={p.name} className="px-6 py-3 text-center font-semibold text-ink-900">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Страница в каталоге', true, true, true],
                ['Форма заявок + 152-ФЗ', true, true, true],
                ['CRM воронка продаж', true, true, true],
                ['Блог с редактором', '5 статей', '∞', '∞'],
                ['Фотографии', '6', '20', '∞'],
                ['API и вебхуки', false, true, true],
                ['Приоритет в каталоге', false, true, 'ТОП'],
                ['Бейдж «Проверено»', false, true, true],
                ['Несколько локаций', false, false, true],
                ['Персональный менеджер', false, false, true],
              ].map(([feature, ...vals]) => (
                <tr key={feature as string} className="border-b border-line last:border-0">
                  <td className="px-6 py-3 text-muted">{feature}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="px-6 py-3 text-center">
                      {v === true ? <span className="text-green-500">✓</span>
                        : v === false ? <span className="text-gray-300">—</span>
                        : <span className="font-medium text-ink-900">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-ink-900 mb-6 text-center">Частые вопросы</h2>
        <div className="space-y-3">
          {FAQ.map(item => (
            <div key={item.q} className="bg-white border border-line rounded-xl p-5">
              <h3 className="font-semibold text-ink-900 mb-2 text-sm">{item.q}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-ink-900 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-bold mb-3">Зарегистрируйтесь сейчас</h2>
        <p className="text-sm mb-6" style={{ color: '#B7C0D1' }}>
          Бесплатно, без кредитной карты. Займёт 2 минуты.
        </p>
        <a href="/partner"
          className="inline-block px-8 py-3.5 rounded-xl text-sm font-semibold"
          style={{ background: '#3DDBFF', color: '#0B1220' }}>
          Начать бесплатно →
        </a>
      </div>

    </div>
  );
}

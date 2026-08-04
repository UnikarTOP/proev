import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Контакты — proev.ru',
  description: 'Свяжитесь с командой proev.ru. Email: info@proev.ru, Telegram: @proev_pro.',
};

export default function ContactsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 py-10 md:py-16">
      <h1 className="text-[28px] md:text-[36px] font-bold text-ink-900 mb-3">Контакты</h1>
      <p className="text-muted text-base mb-10">Мы открыты для партнёрства, предложений и вопросов</p>

      <div className="grid md:grid-cols-2 gap-4 mb-10">
        <a href="mailto:info@proev.ru" className="flex items-start gap-4 bg-white border border-line rounded-2xl p-5 hover:border-volt-600/40 hover:shadow-sm transition-all no-underline group">
          <div className="w-10 h-10 rounded-xl bg-paper-50 border border-line flex items-center justify-center text-lg flex-shrink-0">✉️</div>
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Email</div>
            <div className="text-sm font-semibold text-ink-900 group-hover:text-volt-600 transition-colors">info@proev.ru</div>
            <div className="text-xs text-muted mt-0.5">Ответим в течение 24 часов</div>
          </div>
        </a>
        <a href="https://t.me/proev_pro" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 bg-white border border-line rounded-2xl p-5 hover:border-volt-600/40 hover:shadow-sm transition-all no-underline group">
          <div className="w-10 h-10 rounded-xl bg-paper-50 border border-line flex items-center justify-center text-lg flex-shrink-0">✈️</div>
          <div>
            <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Telegram</div>
            <div className="text-sm font-semibold text-ink-900 group-hover:text-volt-600 transition-colors">@proev_pro</div>
            <div className="text-xs text-muted mt-0.5">Быстрый ответ в рабочее время</div>
          </div>
        </a>
      </div>

      <div className="space-y-4 mb-10">
        <h2 className="text-lg font-bold text-ink-900 mb-4">По каким вопросам писать</h2>
        {[
          { icon: '💼', title: 'Партнёрство и размещение сервиса', desc: 'Хотите разместить свой EV-сервис на платформе — напишите нам или подайте заявку онлайн.', link: '/partner', linkText: 'Подать заявку онлайн' },
          { icon: '🔌', title: 'Операторам зарядных станций', desc: 'Интеграция данных о ваших ЭЗС на карту, OCPI-подключение, совместные проекты.', link: '/operators', linkText: 'Подробнее для операторов' },
          { icon: '🐞', title: 'Ошибки и предложения', desc: 'Нашли ошибку или есть идея улучшения — пишите на email, рассмотрим каждое обращение.' },
          { icon: '📰', title: 'Пресса и СМИ', desc: 'Для журналистов и блогеров — статистика по рынку EV, комментарии, партнёрские материалы.' },
        ].map(item => (
          <div key={item.title} className="bg-white border border-line rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <div className="font-semibold text-ink-900 mb-1">{item.title}</div>
                <div className="text-sm text-muted leading-relaxed">{item.desc}</div>
                {item.link && <a href={item.link} className="inline-block mt-2 text-sm font-medium text-volt-600 hover:underline">{item.linkText} →</a>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-ink-900 rounded-2xl p-6 text-center mb-8">
        <h2 className="text-white font-bold text-lg mb-2">Присоединяйтесь к платформе</h2>
        <p className="text-white/60 text-sm mb-5">1600+ зарядных станций на карте. Регистрация бесплатна.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a href="/register" className="px-5 py-2.5 bg-volt-400 text-ink-900 rounded-xl text-sm font-bold hover:bg-volt-300 transition-colors no-underline">Зарегистрироваться</a>
          <a href="/partner" className="px-5 py-2.5 border border-white/20 text-white rounded-xl text-sm font-medium hover:bg-white/10 transition-colors no-underline">Разместить сервис</a>
        </div>
      </div>

      <div className="text-center text-xs text-muted">
        <a href="/privacy" className="hover:text-ink-900">Политика конфиденциальности</a>
        {' · '}
        <a href="/terms" className="hover:text-ink-900">Пользовательское соглашение</a>
      </div>
    </div>
  );
}

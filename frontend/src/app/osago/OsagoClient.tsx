'use client';
import { useEffect, useRef, useState } from 'react';

export default function OsagoClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const s = document.createElement('script');
    s.src = 'https://www.sravni.ru/widgets/loader.js';
    s.setAttribute('data-product', 'osago');
    s.setAttribute('data-is-New-Wl', 'true');
    s.setAttribute('data-inFrame', 'true');
    s.setAttribute('data-layout', 'short');
    s.setAttribute('data-theme', 'sravni_light');
    s.setAttribute('data-aff_sub', '9');
    s.setAttribute('data-offer_id', '1064');
    s.setAttribute('data-source', '10640');
    s.setAttribute('data-aff_id', '101339');
    s.onerror = () => setBlocked(true);

    // Вставляем скрипт внутрь контейнера
    containerRef.current.appendChild(s);

    return () => { try { containerRef.current?.removeChild(s); } catch {} };
  }, []);

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full mb-4">🛡️ Страхование</div>
        <h1 className="text-[24px] md:text-[32px] font-bold text-ink-900 mb-3">ОСАГО для электромобиля — онлайн</h1>
        <p className="text-muted text-base leading-relaxed">Сравните цены от 25+ страховых компаний и оформите полис за 2 минуты. Полис на email.</p>
      </div>

      {/* Контейнер для виджета */}
      <div className="bg-white border border-line rounded-2xl overflow-hidden mb-6">
        {blocked ? (
          <div className="text-center py-12 px-6">
            <div className="text-4xl mb-4">🛡️</div>
            <p className="font-semibold text-ink-900 mb-2">Виджет заблокирован AdBlock</p>
            <p className="text-sm text-muted mb-5">Отключите блокировщик для этой страницы или перейдите напрямую</p>
            <a href="https://go.sravni.ru/aff_c?aff_id=101339&offer_id=1064&source=10640&out=https%3A%2F%2Fwww.sravni.ru%2Fosago%2F%3F"
              target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm no-underline hover:bg-blue-700 transition-colors">
              Рассчитать ОСАГО на Сравни.ру →
            </a>
          </div>
        ) : (
          <div ref={containerRef} className="min-h-[400px]" />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          {icon:'💰',title:'Экономия до 40%',desc:'Сравниваем цены всех страховых и находим лучшее предложение'},
          {icon:'⚡',title:'За 2 минуты',desc:'Вводите данные один раз — предложения от всех страховщиков'},
          {icon:'📱',title:'Полис на email',desc:'Электронный е-ОСАГО сразу на почту, без визита в офис'},
        ].map(f => (
          <div key={f.title} className="bg-white border border-line rounded-xl p-4">
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-ink-900 text-sm mb-1">{f.title}</div>
            <div className="text-xs text-muted leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 mb-6">
        <h2 className="text-lg font-bold text-ink-900">Частые вопросы</h2>
        {[
          {q:'Можно оформить для Zeekr, Evolute, BYD?',a:'Да, все электромобили страхуются онлайн. Нужны ПТС, права и паспорт.'},
          {q:'Когда вступает в силу электронный полис?',a:'Через 3 дня после оформления. Планируйте заранее.'},
          {q:'Есть льготы на ОСАГО для EV?',a:'Специальных льгот нет, но транспортный налог в Москве для EV = 0.'},
        ].map(f => (
          <details key={f.q} className="bg-white border border-line rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-ink-900 list-none">
              {f.q}<span className="ml-2">▾</span>
            </summary>
            <div className="px-4 pb-4 text-sm text-muted">{f.a}</div>
          </details>
        ))}
      </div>
      <p className="text-xs text-muted text-center">Реклама · Услуги оказывает ООО «Сравни» · proev.ru получает комиссию</p>
    </div>
  );
}

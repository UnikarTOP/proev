import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import MobileNav from '@/components/MobileNav';

export const metadata: Metadata = {
  title: 'proev.ru — всё для владельцев электромобилей в России',
  description: 'Карта зарядных станций, сервисы для электромобилей, сообщество и советы для владельцев EV в России.',
};

const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        {METRIKA_ID && (
          <Script id="metrika-init" strategy="afterInteractive">{`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${METRIKA_ID}, "init", {
              clickmap: true,
              trackLinks: true,
              accurateTrackBounce: true,
              webvisor: true,
              ecommerce: false
            });
          `}</Script>
        )}
      </head>
      <body className="min-h-screen bg-paper-50 text-graphite-900">
        <header className="border-b border-line bg-white/95 backdrop-blur-sm sticky top-0 z-50">
          <nav className="max-w-[1120px] mx-auto flex items-center justify-between px-4 md:px-6 py-4">
            <a href="/" className="font-bold text-xl tracking-tight text-ink-900 shrink-0">
              proev<span className="text-volt-600">.ru</span>
            </a>

            {/* Десктопное меню */}
            <div className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium text-ink-700">
              <a href="/charge-map" className="hover:text-volt-600 transition-colors">Карта зарядок</a>
              <a href="/services" className="hover:text-volt-600 transition-colors">Сервисы</a>
              <a href="/news" className="hover:text-volt-600 transition-colors">Новости</a>
              <a href="/about" className="hover:text-volt-600 transition-colors">О проекте</a>
              <a href="/pricing" className="hover:text-volt-600 transition-colors">Тарифы</a>
            </div>

            <div className="flex items-center gap-3">
              <a href="/partner" className="bg-ink-900 text-white text-sm font-semibold px-4 py-2.5 rounded-[10px] whitespace-nowrap hidden sm:block">
                Разместить сервис
              </a>
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <MobileNav />

        <footer className="border-t border-line mt-16 mb-20 md:mb-0">
          <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="font-bold text-lg text-ink-900 mb-3">
                  proev<span className="text-volt-600">.ru</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Платформа для владельцев электромобилей в России
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Сервисы</div>
                <div className="space-y-2">
                  {[['Карта зарядок','/charge-map'],['Каталог сервисов','/services'],['Новости EV','/news']].map(([l,h]) => (
                    <a key={h} href={h} className="block text-sm text-muted hover:text-ink-900 transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Бизнесу</div>
                <div className="space-y-2">
                  {[['Для партнёров','/partner'],['Тарифы','/pricing'],['API документация','/partner/cabinet']].map(([l,h]) => (
                    <a key={h} href={h} className="block text-sm text-muted hover:text-ink-900 transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Компания</div>
                <div className="space-y-2">
                  {[['О проекте','/about'],['Политика конфиденциальности','/privacy'],['Пользовательское соглашение','/terms']].map(([l,h]) => (
                    <a key={h} href={h} className="block text-sm text-muted hover:text-ink-900 transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-line pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted">© {new Date().getFullYear()} proev.ru — все права защищены</p>
              <p className="text-xs text-muted">
                <a href="mailto:hello@proev.ru" className="hover:text-ink-900 transition-colors">hello@proev.ru</a>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

function MobileMenu() {
  // Простое мобильное меню через checkbox trick — без JS/useState
  return (
    <div className="md:hidden relative">
      <input type="checkbox" id="mobile-menu" className="peer hidden" />
      <label htmlFor="mobile-menu" className="cursor-pointer flex flex-col gap-1.5 p-2" aria-label="Меню">
        <span className="w-5 h-0.5 bg-ink-900 block" />
        <span className="w-5 h-0.5 bg-ink-900 block" />
        <span className="w-5 h-0.5 bg-ink-900 block" />
      </label>
      {/* Выпадающее меню */}
      <div className="hidden peer-checked:flex flex-col absolute right-0 top-full mt-2 w-52 bg-white border border-line rounded-xl shadow-lg overflow-hidden z-50">
        <a href="/charge-map" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">Карта зарядок</a>
        <a href="/services" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">Сервисы</a>
        <a href="/news" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">Новости</a>
        <a href="/about" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">О проекте</a>
        <a href="/pricing" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">Тарифы</a>
        <a href="/partner" className="px-4 py-3 text-sm font-semibold text-volt-600 hover:bg-paper-50">Разместить сервис</a>
      </div>
    </div>
  );
}

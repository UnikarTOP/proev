import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import MobileNav from '@/components/MobileNav';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1220',
};

export const metadata: Metadata = {
  title: {
    default: 'proev.ru — карта зарядок и сервисы для электромобилей в России',
    template: '%s — proev.ru',
  },
  description: 'Карта зарядных станций, каталог EV-сервисов, новости об электромобилях. Всё для владельцев электромобилей в России.',
  keywords: ['электромобили', 'зарядные станции', 'EV сервис', 'карта зарядок', 'электрокары Россия'],
  authors: [{ name: 'proev.ru', url: 'https://proev.ru' }],
  metadataBase: new URL('https://proev.ru'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://proev.ru',
    siteName: 'proev.ru',
    title: 'proev.ru — карта зарядок и сервисы для электромобилей',
    description: 'Карта зарядных станций, каталог EV-сервисов, новости об электромобилях в России.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192' },
    ],
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'proev.ru',
  },
};

const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-paper-50 text-graphite-900">
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
        <header className="border-b border-line bg-white/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-[1120px] mx-auto px-4 md:px-6">

            {/* Верхняя строка: логотип + CTA */}
            <div className="flex items-center justify-between py-3 border-b border-line/60">
              <a href="/" className="font-bold text-xl tracking-tight text-ink-900 shrink-0">
                proev<span className="text-volt-600">.ru</span>
              </a>
              <div className="flex items-center gap-3">
                <a href="/login" id="header-login-btn"
                  className="text-sm font-medium text-muted hover:text-ink-900 transition-colors hidden sm:block whitespace-nowrap">
                  Войти
                </a>
                <a href="/partner"
                  className="bg-ink-900 text-white text-sm font-semibold px-4 py-2 rounded-[10px] whitespace-nowrap hidden sm:block hover:bg-ink-700 transition-colors">
                  Для бизнеса
                </a>
              </div>
            </div>

            {/* Нижняя строка: навигация сегментированная */}
            <nav className="hidden md:flex items-center gap-0.5 py-2">
              {/* Группа 1 — инфраструктура */}
              <a href="/charge-map" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Карта зарядок</a>
              <a href="/services" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Сервисы</a>
              <a href="/news" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Новости</a>

              {/* Разделитель */}
              <span className="w-px h-4 bg-line mx-2 flex-shrink-0" />

              {/* Группа 2 — инструменты */}
              <a href="/ev-catalog" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">
                База EV
                <span className="ml-1 text-[9px] font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full align-middle">NEW</span>
              </a>
              <a href="/route-planner" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Маршрут</a>
              <a href="/community" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Сообщество</a>

              {/* Разделитель */}
              <span className="w-px h-4 bg-line mx-2 flex-shrink-0" />

              {/* Группа 3 — бизнес */}
              <a href="/pricing" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">Тарифы</a>
              <a href="/about" className="text-sm text-muted hover:text-ink-900 hover:bg-paper-50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap">О проекте</a>
            </nav>

          </div>

          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              var t = localStorage.getItem('user_token');
              var u = localStorage.getItem('user');
              var btn = document.getElementById('header-login-btn');
              if(t && u && btn) {
                try {
                  var name = JSON.parse(u).name || 'Профиль';
                  btn.href = '/profile';
                  btn.textContent = name.split(' ')[0];
                } catch(e){}
              }
            })();
          `}} />
        </header>

        <main className="pb-20 md:pb-0">{children}</main>

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
                  {[['О проекте','/about'],['Водителям','/for-drivers'],['База EV','/ev-catalog'],['Операторам ЭЗС','/operators'],['Сообщество','/community'],['Планировщик маршрута','/route-planner'],['Политика конфиденциальности','/privacy'],['Пользовательское соглашение','/terms']].map(([l,h]) => (
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

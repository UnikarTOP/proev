import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'proev.ru — всё для владельцев электромобилей в России',
  description: 'Карта зарядных станций, сервисы для электромобилей, сообщество и советы для владельцев EV в России.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
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
              <a href="/partner" className="hover:text-volt-600 transition-colors">Партнёрам</a>
            </div>

            <div className="flex items-center gap-3">
              <a href="/services" className="bg-ink-900 text-white text-sm font-semibold px-4 py-2.5 rounded-[10px] whitespace-nowrap hidden sm:block">
                Оставить заявку
              </a>
              {/* Мобильное меню — бургер */}
              <MobileMenu />
            </div>
          </nav>
        </header>

        <main>{children}</main>

        <footer className="border-t border-line mt-16">
          <div className="max-w-[1120px] mx-auto px-4 md:px-6 py-8">
            {/* Мобильные ссылки в футере */}
            <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-muted mb-6">
              <a href="/charge-map" className="hover:text-ink-900 transition-colors">Карта зарядок</a>
              <a href="/services" className="hover:text-ink-900 transition-colors">Сервисы</a>
              <a href="/news" className="hover:text-ink-900 transition-colors">Новости</a>
              <a href="/partner" className="hover:text-ink-900 transition-colors">Партнёрам</a>
            </div>
            <p className="text-center md:text-left text-sm text-muted">© {new Date().getFullYear()} proev.ru</p>
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
        <a href="/partner" className="px-4 py-3 text-sm font-medium text-ink-900 hover:bg-paper-50 border-b border-line">Партнёрам</a>
        <a href="/services" className="px-4 py-3 text-sm font-semibold text-volt-600 hover:bg-paper-50">Оставить заявку</a>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'proev.ru — всё для владельцев электромобилей в России',
  description:
    'Карта зарядных станций, сервисы для электромобилей, сообщество и советы для владельцев EV в России.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-paper-50 text-graphite-900">
        <header>
          <nav className="max-w-[1120px] mx-auto flex items-center justify-between px-6 py-6">
            <a href="/" className="font-bold text-xl tracking-tight text-ink-900">
              proev<span className="text-volt-600">.ru</span>
            </a>
            <div className="hidden md:flex gap-8 text-sm font-medium text-ink-700">
              <a href="/charge-map" className="hover:text-volt-600">Карта зарядок</a>
              <a href="/services" className="hover:text-volt-600">Сервисы</a>
              <a href="/blog" className="hover:text-volt-600">Блог</a>
            </div>
            <a href="/services" className="bg-ink-900 text-white text-sm font-semibold px-4 py-2.5 rounded-[10px] whitespace-nowrap">
              Оставить заявку
            </a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="max-w-[1120px] mx-auto px-6 py-8 mt-14 text-center text-sm text-muted">
          © {new Date().getFullYear()} proev.ru
        </footer>
      </body>
    </html>
  );
}

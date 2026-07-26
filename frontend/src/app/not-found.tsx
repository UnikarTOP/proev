import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl font-bold text-ink-900 mb-4" style={{ fontFamily: 'monospace' }}>404</div>
      <h1 className="text-xl font-semibold text-ink-900 mb-2">Страница не найдена</h1>
      <p className="text-muted text-sm mb-8">Возможно, она была удалена или адрес введён неверно.</p>
      <Link href="/"
        className="px-6 py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
        На главную →
      </Link>
    </div>
  );
}

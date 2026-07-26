'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-4xl mb-4">⚡</div>
      <h1 className="text-xl font-semibold text-ink-900 mb-2">Что-то пошло не так</h1>
      <p className="text-muted text-sm mb-8">Попробуйте обновить страницу или вернитесь позже.</p>
      <div className="flex gap-3">
        <button onClick={reset}
          className="px-5 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
          Попробовать снова
        </button>
        <a href="/"
          className="px-5 py-2.5 border border-line text-muted rounded-xl text-sm hover:border-graphite-900/30 hover:text-ink-900 transition-colors">
          На главную
        </a>
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import NewsPageClient from '@/components/NewsPageClient';

export const metadata = {
  title: 'Новости об электромобилях в России — proev.ru',
  description: 'Актуальные новости про электромобили, зарядную инфраструктуру, рынок EV и законодательство России.',
  openGraph: {
    title: 'Новости об электромобилях — proev.ru',
    description: 'Всё важное об EV в России: зарядки, рынок, технологии, законодательство.',
    url: 'https://proev.ru/news',
  },
};

export const dynamic = 'force-dynamic';

export default function NewsPage() {
  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-1">
          Новости об электромобилях
        </h1>
        <p className="text-muted text-sm">Только актуальное про EV, зарядную инфраструктуру и рынок России</p>
      </div>
      <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-64 bg-paper-50 rounded-xl"/></div>}>
        <NewsPageClient />
      </Suspense>
    </div>
  );
}

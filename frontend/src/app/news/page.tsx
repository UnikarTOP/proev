import { Suspense } from 'react';
import NewsPageClient from '@/components/NewsPageClient';

export const metadata = {
  title: 'Новости об электромобилях — proev.ru',
  description: 'Актуальные новости про электромобили, зарядную инфраструктуру и EV-рынок России.',
};

export const dynamic = 'force-dynamic';

export default function NewsPage() {
  return (
    <div className="max-w-[960px] mx-auto px-4 md:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-1">
          Новости об электромобилях
        </h1>
        <p className="text-muted text-sm">
          Только актуальное про EV, зарядную инфраструктуру и рынок
        </p>
      </div>
      <Suspense fallback={<NewsSkeleton />}>
        <NewsPageClient />
      </Suspense>
    </div>
  );
}

function NewsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-paper-50 rounded-xl h-64 border border-line" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-paper-50 rounded-xl h-16 border border-line" />
        ))}
      </div>
    </div>
  );
}

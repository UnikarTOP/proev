import { sanitizeHtml } from '@/lib/sanitize';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

async function getNews(id: string) {
  const api = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/news/${id}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await getNews(params.slug);
  if (!item) return { title: 'Новость не найдена' };
  return {
    title: `${item.title} — proev.ru`,
    description: item.summary || item.title,
    openGraph: { title: item.title, description: item.summary, url: `https://proev.ru/news/${params.slug}` },
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function NewsItemPage({ params }: { params: { slug: string } }) {
  const item = await getNews(params.slug);
  if (!item) notFound();

  return (
    <div className="max-w-[740px] mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="mb-6">
        <a href="/news" className="text-xs text-muted hover:text-ink-900 flex items-center gap-1">
          ← Все новости
        </a>
      </div>

      {item.category && (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          {item.category}
        </div>
      )}

      <h1 className="text-[22px] md:text-[30px] font-bold text-ink-900 leading-tight mb-4">
        {item.title}
      </h1>

      <div className="flex items-center gap-4 text-xs text-muted mb-8 pb-6 border-b border-line">
        {item.sourceName && (
          <div className="flex items-center gap-1.5">
            {item.faviconUrl && (
              <img src={item.faviconUrl} alt="" width={14} height={14} className="rounded-sm" />
            )}
            <span>{item.sourceName}</span>
          </div>
        )}
        {item.publishedAt && <span>{formatDate(item.publishedAt)}</span>}
        {item.readTimeMin && <span>~{item.readTimeMin} мин чтения</span>}
      </div>

      {item.summary && (
        <p className="text-base text-muted leading-relaxed mb-6 font-medium">
          {item.summary}
        </p>
      )}

      <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed mb-8"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content || item.summary || '') }} />

      {item.url && (
        <div className="border border-line rounded-2xl p-5 bg-paper-50">
          <p className="text-sm text-muted mb-3">Источник материала:</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-volt-600 hover:underline no-underline">
            {item.sourceName || 'Читать оригинал'} →
          </a>
        </div>
      )}
    </div>
  );
}

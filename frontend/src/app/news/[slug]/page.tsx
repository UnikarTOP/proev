import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface NewsItem {
  id: string; slug?: string; title: string; excerpt?: string;
  body?: string; sourceUrl: string; sourceName: string;
  imageUrl?: string; publishedAt?: string; isOriginal: boolean;
}

async function getNews(slug: string): Promise<NewsItem | null> {
  const api = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
  try {
    // Пробуем сначала по slug, потом по id
    const res = await fetch(`${api}/news/slug/${slug}`, { next: { revalidate: 3600 } });
    if (res.ok) return res.json();
    const res2 = await fetch(`${api}/news/${slug}`, { next: { revalidate: 3600 } });
    if (res2.ok) return res2.json();
    return null;
  } catch { return null; }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await getNews(params.slug);
  if (!item) return { title: 'Новость не найдена — proev.ru' };
  return {
    title: `${item.title} — proev.ru`,
    description: item.excerpt || item.title,
    openGraph: {
      title: item.title,
      description: item.excerpt || item.title,
      images: item.imageUrl ? [item.imageUrl] : [],
    },
  };
}

function timeAgo(d?: string) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)} мин назад`;
  if (diff < 1440) return `${Math.round(diff / 60)} ч назад`;
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function NewsItemPage({ params }: { params: { slug: string } }) {
  const item = await getNews(params.slug);
  if (!item) notFound();

  const domain = (() => { try { return new URL(item.sourceUrl).hostname.replace('www.', ''); } catch { return ''; } })();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 60px' }}>

      {/* Хлебные крошки */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7686', marginBottom: 24 }}>
        <a href="/news" style={{ color: '#6B7686', textDecoration: 'none' }}>Новости</a>
        <span>›</span>
        <span style={{ color: '#B4B2A9' }} className="truncate">{item.sourceName}</span>
      </div>

      {/* Заголовок */}
      <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 700, color: '#10192B', lineHeight: 1.3, marginBottom: 16 }}>
        {item.title}
      </h1>

      {/* Мета */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {domain && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" width={14} height={14}
              style={{ borderRadius: 2 }} />
            <span style={{ fontSize: 13, color: '#6B7686' }}>{item.sourceName}</span>
          </div>
        )}
        {item.publishedAt && (
          <span style={{ fontSize: 13, color: '#B4B2A9' }}>{timeAgo(item.publishedAt)}</span>
        )}
      </div>

      {/* Картинка */}
      {item.imageUrl && (
        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 28, maxHeight: 360 }}>
          <img src={item.imageUrl} alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Анонс */}
      {item.excerpt && (
        <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.7, marginBottom: 24,
          padding: '16px 20px', background: '#F9F8F5', borderRadius: 12,
          borderLeft: '3px solid #0BA5CC' }}>
          {item.excerpt}
        </p>
      )}

      {/* Полный текст если есть (оригинальные статьи) */}
      {item.isOriginal && item.body ? (
        <div style={{ fontSize: 16, color: '#374151', lineHeight: 1.8 }}
          dangerouslySetInnerHTML={{ __html: item.body }} />
      ) : (
        /* Для агрегированных - кнопка на источник */
        <div style={{ background: '#F9F8F5', borderRadius: 16, padding: 28, textAlign: 'center', marginTop: 8 }}>
          <p style={{ fontSize: 15, color: '#6B7686', marginBottom: 20, lineHeight: 1.6 }}>
            Это агрегированная новость. Полный текст доступен на сайте источника.
          </p>
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#0B1220', color: '#fff', textDecoration: 'none',
              padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600 }}>
            Читать на {domain || item.sourceName}
            <span style={{ fontSize: 12 }}>↗</span>
          </a>
        </div>
      )}

      {/* Похожие новости */}
      <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #DCE1E8' }}>
        <a href="/news" style={{ color: '#0BA5CC', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
          ← Все новости об электромобилях
        </a>
      </div>
    </div>
  );
}

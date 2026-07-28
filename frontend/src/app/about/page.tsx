import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const SLUG = 'about';

interface PageData {
  slug: string; title: string; description?: string;
  content: string; updatedAt: string;
}

async function getPage(): Promise<PageData | null> {
  const api = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/pages/${SLUG}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPage();
  if (!data) return { title: 'proev.ru' };
  return { title: data.title, description: data.description };
}

export default async function Page() {
  const data = await getPage();
  if (!data) notFound();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <style>{`
        .page-content h1 { font-size: 28px; font-weight: 700; color: #10192B; margin: 0 0 16px; }
        .page-content h2 { font-size: 20px; font-weight: 600; color: #10192B; margin: 28px 0 12px; }
        .page-content h3 { font-size: 16px; font-weight: 600; color: #10192B; margin: 20px 0 8px; }
        .page-content p { font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 12px; }
        .page-content ul, .page-content ol { padding-left: 24px; margin: 0 0 12px; }
        .page-content li { font-size: 15px; color: #374151; line-height: 1.7; margin-bottom: 6px; }
        .page-content a { color: #0BA5CC; text-decoration: underline; }
        .page-content strong { font-weight: 600; color: #10192B; }
        .page-content blockquote { border-left: 3px solid #0BA5CC; padding-left: 16px; margin: 16px 0; color: #6B7686; font-style: italic; }
        .page-content em { font-style: italic; color: #6B7686; }
      `}</style>
      <div
        className="page-content"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
      <p style={{ fontSize: 12, color: '#B4B2A9', marginTop: 40, paddingTop: 16, borderTop: '1px solid #DCE1E8' }}>
        Последнее обновление:{' '}
        {new Date(data.updatedAt).toLocaleDateString('ru-RU', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
    </div>
  );
}

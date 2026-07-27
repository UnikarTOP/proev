import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Страницы которые обслуживаются динамически из БД
const DYNAMIC_PAGES = ['about', 'pricing', 'privacy', 'terms'];

interface PageData {
  slug: string;
  title: string;
  description?: string;
  content: string;
  updatedAt: string;
}

async function getPage(slug: string): Promise<PageData | null> {
  const api = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/pages/${slug}`, {
      next: { revalidate: 60 }, // кешируем на 60 секунд
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: { page: string } }
): Promise<Metadata> {
  const data = await getPage(params.page);
  if (!data) return { title: 'Страница не найдена' };
  return {
    title: data.title,
    description: data.description,
    openGraph: { title: data.title, description: data.description },
  };
}

export default async function DynamicPage({ params }: { params: { page: string } }) {
  // Пропускаем страницы которые имеют собственные роуты
  if (!DYNAMIC_PAGES.includes(params.page)) notFound();

  const data = await getPage(params.page);
  if (!data) notFound();

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: data.content }}
      />
      {data.updatedAt && (
        <p className="text-xs text-muted mt-10 pt-6 border-t border-line">
          Последнее обновление:{' '}
          {new Date(data.updatedAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      )}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Блог об электромобилях в России — proev.ru',
  description: 'Статьи о зарядных станциях, маршрутах на EV, сравнении электромобилей и стоимости владения в России.',
  keywords: ['электромобили блог', 'зарядки EV Россия', 'статьи про электрокары'],
};

export const revalidate = 60; // ISR — обновляем каждую минуту

async function getArticles() {
  try {
    const api = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${api}/articles`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Зарядки': 'text-blue-600 bg-blue-50',
  'Обзоры EV': 'text-green-600 bg-green-50',
  'Финансы': 'text-amber-600 bg-amber-50',
  'Маршруты': 'text-violet-600 bg-violet-50',
};

export default async function BlogPage() {
  const articles = await getArticles();

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[36px] font-bold text-ink-900 mb-3">Блог proev.ru</h1>
        <p className="text-muted text-base">Всё об электромобилях: зарядки, маршруты, стоимость владения, советы</p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-muted">Статьи загружаются...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {articles.map((a: any) => (
            <Link key={a.slug} href={`/blog/${a.slug}`}
              className="group bg-white border border-line rounded-2xl p-5 hover:shadow-md hover:border-volt-600/30 transition-all no-underline block">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[a.category] || 'text-muted bg-paper-50'}`}>
                  {a.category || 'Статья'}
                </span>
                {a.readTime && <span className="text-xs text-muted">{a.readTime} мин</span>}
              </div>
              <h2 className="text-base font-bold text-ink-900 mb-2 group-hover:text-volt-600 transition-colors leading-snug">{a.title}</h2>
              {a.description && <p className="text-sm text-muted leading-relaxed line-clamp-3">{a.description}</p>}
              {a.publishedAt && (
                <div className="mt-4 text-xs text-muted">
                  {new Date(a.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

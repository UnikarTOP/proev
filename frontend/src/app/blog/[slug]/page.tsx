import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 60;

async function getArticle(slug: string) {
  try {
    const api = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${api}/articles/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getAllSlugs() {
  try {
    const api = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${api}/articles`);
    if (!res.ok) return [];
    const articles = await res.json();
    return articles.map((a: any) => ({ slug: a.slug }));
  } catch { return []; }
}

export async function generateStaticParams() {
  return getAllSlugs();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getArticle(params.slug);
  if (!a) return { title: 'Статья не найдена' };
  return {
    title: `${a.seoTitle || a.title} — proev.ru`,
    description: a.description || '',
    keywords: a.keywords || [],
    openGraph: {
      title: a.title,
      description: a.description || '',
      url: `https://proev.ru/blog/${a.slug}`,
      type: 'article',
      publishedTime: a.publishedAt,
    },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await getArticle(params.slug);
  if (!a) notFound();

  return (
    <div className="max-w-[740px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <a href="/blog" className="text-xs text-muted hover:text-ink-900 block mb-6">← Все статьи</a>

      <div className="flex items-center gap-2 mb-4">
        {a.category && (
          <span className="text-xs font-semibold text-volt-600 bg-volt-600/10 px-2.5 py-1 rounded-full">{a.category}</span>
        )}
        <span className="text-xs text-muted">
          {a.publishedAt && new Date(a.publishedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          {a.readTime && ` · ${a.readTime} мин чтения`}
        </span>
      </div>

      <h1 className="text-[24px] md:text-[32px] font-bold text-ink-900 leading-tight mb-4">{a.title}</h1>
      {a.description && <p className="text-base text-muted leading-relaxed mb-8 font-medium">{a.description}</p>}

      <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: a.content }} />

      {/* Партнёрский блок */}
      <a href="https://go.sravni.ru/aff_c?aff_id=101339&offer_id=1064&source=10640&out=https%3A%2F%2Fwww.sravni.ru%2Fosago%2F%3F"
        target="_blank" rel="noopener noreferrer sponsored"
        className="flex items-center gap-4 bg-gradient-to-r from-[#0B4DB8] to-[#1565D8] rounded-2xl p-5 no-underline hover:opacity-95 transition-opacity mt-10">
        <span className="text-3xl">🛡️</span>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">ОСАГО для электромобиля — от 25 страховых компаний</div>
          <div className="text-white/70 text-xs mt-0.5">Онлайн расчёт за 2 минуты · Скидка до 40%</div>
        </div>
        <span className="flex-shrink-0 bg-white text-[#0B4DB8] text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap">Рассчитать →</span>
      </a>
      <p className="text-right text-[10px] text-muted mt-1">Реклама · Сравни.ру</p>

      <div className="mt-10 pt-8 border-t border-line">
        <p className="text-sm font-semibold text-ink-900 mb-4">Полезные инструменты proev.ru</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {href:'/charge-map',label:'🗺️ Карта зарядок'},
            {href:'/route-planner',label:'🧭 Калькулятор маршрута'},
            {href:'/ev-catalog',label:'⚡ База EV'},
            {href:'/services',label:'🔧 EV-сервисы'},
          ].map(l => (
            <a key={l.href} href={l.href}
              className="text-sm font-medium text-volt-600 border border-line rounded-xl px-4 py-3 hover:border-volt-600/30 transition-colors no-underline block">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

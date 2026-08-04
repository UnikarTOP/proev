import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ARTICLES } from '../articles';

export async function generateStaticParams() {
  return ARTICLES.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = ARTICLES.find(a => a.slug === params.slug);
  if (!a) return { title: 'Статья не найдена' };
  return { title: `${a.title} — proev.ru`, description: a.description, keywords: a.keywords };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = ARTICLES.find(a => a.slug === params.slug);
  if (!a) notFound();
  return (
    <div className="max-w-[740px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <a href="/blog" className="text-xs text-muted hover:text-ink-900 block mb-6">← Все статьи</a>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-volt-600 bg-volt-600/10 px-2.5 py-1 rounded-full">{a.category}</span>
        <span className="text-xs text-muted">{a.date} · {a.readTime} мин чтения</span>
      </div>
      <h1 className="text-[24px] md:text-[32px] font-bold text-ink-900 leading-tight mb-4">{a.title}</h1>
      <p className="text-base text-muted leading-relaxed mb-8 font-medium">{a.description}</p>
      <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: a.content }} />
      <div className="mt-10 pt-8 border-t border-line">
        <p className="text-sm font-semibold text-ink-900 mb-4">Полезные инструменты proev.ru</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {href:'/charge-map',label:'🗺️ Карта зарядок'},
            {href:'/route-planner',label:'🧭 Калькулятор маршрута'},
            {href:'/ev-catalog',label:'⚡ База EV'},
            {href:'/services',label:'🔧 EV-сервисы'},
          ].map(l => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-volt-600 border border-line rounded-xl px-4 py-3 hover:border-volt-600/30 transition-colors no-underline block">{l.label}</a>
          ))}
        </div>
      </div>
    </div>
  );
}

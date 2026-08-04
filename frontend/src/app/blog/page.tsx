import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES } from './articles';

export const metadata: Metadata = {
  title: 'Блог об электромобилях в России — proev.ru',
  description: 'Статьи о зарядных станциях, маршрутах на EV, сравнении электромобилей и стоимости владения в России.',
};

export default function BlogPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className="mb-10">
        <h1 className="text-[28px] md:text-[36px] font-bold text-ink-900 mb-3">Блог proev.ru</h1>
        <p className="text-muted text-base">Всё об электромобилях: зарядки, маршруты, стоимость владения, советы</p>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        {ARTICLES.map(a => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className="group bg-white border border-line rounded-2xl p-5 hover:shadow-md hover:border-volt-600/30 transition-all no-underline block">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-volt-600 bg-volt-600/10 px-2.5 py-1 rounded-full">{a.category}</span>
              <span className="text-xs text-muted">{a.readTime} мин</span>
            </div>
            <h2 className="text-base font-bold text-ink-900 mb-2 group-hover:text-volt-600 transition-colors leading-snug">{a.title}</h2>
            <p className="text-sm text-muted leading-relaxed">{a.description}</p>
            <div className="mt-4 text-xs text-muted">{a.date}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

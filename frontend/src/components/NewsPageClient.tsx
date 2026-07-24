'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  id: string;
  title: string;
  excerpt?: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  publishedAt?: string;
}

const CATEGORIES = [
  { label: 'Все', keywords: [] as string[] },
  { label: 'Зарядки', keywords: ['зарядк', 'зарядн', 'станц'] },
  { label: 'Рынок', keywords: ['продаж', 'рынок', 'цен', 'импорт'] },
  { label: 'Технологии', keywords: ['аккумулятор', 'батарея', 'технолог', 'дальност'] },
  { label: 'Законодательство', keywords: ['льгот', 'налог', 'закон', 'правительств'] },
];

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч. назад`;
  if (diff < 172800) return 'вчера';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function matchesCategory(item: NewsItem, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const text = `${item.title} ${item.excerpt ?? ''}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function getPlaceholder(title: string): { bg: string; color: string; icon: string } {
  const t = title.toLowerCase();
  if (t.includes('зарядк') || t.includes('станц') || t.includes('розетк'))
    return { bg: '#E6F1FB', color: '#185FA5', icon: 'ti-plug' };
  if (t.includes('продаж') || t.includes('рынок') || t.includes('цен'))
    return { bg: '#FAEEDA', color: '#854F0B', icon: 'ti-report-money' };
  if (t.includes('закон') || t.includes('налог') || t.includes('правительств'))
    return { bg: '#EAF3DE', color: '#3B6D11', icon: 'ti-file-description' };
  if (t.includes('батарея') || t.includes('аккумул') || t.includes('технолог'))
    return { bg: '#E1F5EE', color: '#0F6E56', icon: 'ti-battery-charging' };
  if (t.includes('трасс') || t.includes('дорог') || t.includes('маршрут'))
    return { bg: '#EEEDFE', color: '#534AB7', icon: 'ti-map-pin' };
  return { bg: '#F1EFE8', color: '#5F5E5A', icon: 'ti-bolt' };
}

function NewsCardImage({ imageUrl, title }: { imageUrl?: string; title: string }) {
  const ph = getPlaceholder(title);
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <div className="h-40 overflow-hidden bg-paper-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="h-40 flex items-center justify-center"
      style={{ background: ph.bg }}
    >
      <i className={`ti ${ph.icon} text-5xl`} style={{ color: ph.color, opacity: 0.4 }} aria-hidden="true" />
    </div>
  );
}

export default function NewsPageClient() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(0);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${api}/news?limit=50`)
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = news.filter((item) =>
    matchesCategory(item, CATEGORIES[category].keywords),
  );

  const featured = filtered.slice(0, 2);
  const rest = filtered.slice(2);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => <div key={i} className="bg-paper-50 rounded-xl h-64 border border-line" />)}
      </div>
    </div>
  );

  if (!filtered.length) return (
    <div className="py-16 text-center text-muted text-sm">
      Новостей по этой теме пока нет — загляните позже.
    </div>
  );

  return (
    <div>
      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setCategory(i)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              category === i
                ? 'border-volt-600 bg-volt-600/10 text-volt-600'
                : 'border-line text-muted hover:border-graphite-900/30 hover:text-graphite-900'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2 главные карточки */}
      {featured.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">Свежее</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {featured.map((item) => (
              <a
                key={item.id}
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors"
              >
                <NewsCardImage imageUrl={item.imageUrl} title={item.title} />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-2 py-0.5 rounded-full">
                      {item.sourceName}
                    </span>
                    <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-ink-900 leading-snug mb-2 line-clamp-3 group-hover:text-volt-600 transition-colors">
                    {item.title}
                  </p>
                  {item.excerpt && (
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">{item.excerpt}</p>
                  )}
                </div>
                <div className="px-4 py-2.5 border-t border-line flex justify-between items-center">
                  <span className="text-xs text-volt-600 flex items-center gap-1">
                    Читать <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
                  </span>
                  <span className="text-[11px] text-muted">{item.sourceName}</span>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {/* Список остальных */}
      {rest.length > 0 && (
        <>
          <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">Ещё новости</p>
          <div className="border border-line rounded-xl overflow-hidden bg-white">
            {rest.map((item, idx) => {
              const ph = getPlaceholder(item.title);
              return (
                <a
                  key={item.id}
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex gap-3 p-3.5 hover:bg-paper-50 transition-colors ${idx < rest.length - 1 ? 'border-b border-line' : ''}`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: ph.bg }}
                  >
                    <i className={`ti ${ph.icon} text-xl`} style={{ color: ph.color, opacity: 0.6 }} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-1.5 py-0.5 rounded-full">
                        {item.sourceName}
                      </span>
                      <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                    </div>
                    <p className="text-sm font-medium text-ink-900 leading-snug line-clamp-2">{item.title}</p>
                    {item.excerpt && (
                      <p className="text-xs text-muted line-clamp-1 mt-0.5">{item.excerpt}</p>
                    )}
                  </div>
                  <i className="ti ti-chevron-right text-muted text-base shrink-0 my-auto" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface NewsItem {
  id: string;
  title: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  publishedAt?: string;
  excerpt?: string;
}

function timeAgo(d?: string): string {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} мин`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч`;
  if (diff < 172800) return 'вчера';
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function getPlaceholderColor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('зарядк') || t.includes('станц')) return '#E6F1FB';
  if (t.includes('продаж') || t.includes('рынок')) return '#FAEEDA';
  if (t.includes('закон') || t.includes('льгот')) return '#EAF3DE';
  if (t.includes('батарея') || t.includes('технолог')) return '#E1F5EE';
  return '#F1EFE8';
}

export default function HomeNews() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/news?limit=6`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setNews(data.slice(0, 6)))
      .catch(() => {});
  }, []);

  if (news.length === 0) return null;

  const [featured, ...rest] = news;

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 mt-12 md:mt-16">
      {/* Заголовок */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="text-xs font-mono font-semibold text-volt-600 uppercase tracking-widest block mb-1">04 · Новости</span>
          <h2 className="text-[22px] md:text-[26px] font-bold text-ink-900 tracking-tight">Свежее про электромобили</h2>
        </div>
        <a href="/news" className="text-sm text-muted hover:text-volt-600 transition-colors hidden sm:flex items-center gap-1">
          Все новости <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Главная карточка — занимает 2 колонки */}
        {featured && (
          <a href={featured.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="md:col-span-2 group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/20 transition-colors">
            <div className="h-48 overflow-hidden"
              style={{ background: getPlaceholderColor(featured.title) }}>
              {featured.imageUrl
                ? <img src={featured.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center">
                    <i className="ti ti-bolt text-5xl opacity-20" aria-hidden="true" />
                  </div>
              }
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-2 py-0.5 rounded-full">{featured.sourceName}</span>
                <span className="text-[11px] text-muted">{timeAgo(featured.publishedAt)}</span>
              </div>
              <h3 className="text-base font-semibold text-ink-900 leading-snug group-hover:text-volt-600 transition-colors line-clamp-2">
                {featured.title}
              </h3>
              {featured.excerpt && (
                <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">{featured.excerpt}</p>
              )}
            </div>
          </a>
        )}

        {/* Список остальных */}
        <div className="flex flex-col gap-3">
          {rest.slice(0, 4).map(item => (
            <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
              className="group flex gap-3 bg-white border border-line rounded-xl p-3 hover:border-graphite-900/20 transition-colors">
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: getPlaceholderColor(item.title) }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <i className="ti ti-bolt text-xl opacity-25" aria-hidden="true" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-volt-600 bg-volt-600/10 px-1.5 py-0.5 rounded-full">{item.sourceName}</span>
                  <span className="text-[10px] text-muted">{timeAgo(item.publishedAt)}</span>
                </div>
                <p className="text-xs font-medium text-ink-900 line-clamp-2 leading-snug group-hover:text-volt-600 transition-colors">
                  {item.title}
                </p>
              </div>
            </a>
          ))}

          <a href="/news" className="flex items-center justify-center gap-2 text-sm text-muted hover:text-volt-600 transition-colors border border-line rounded-xl py-3 hover:border-volt-600/30">
            Все новости <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

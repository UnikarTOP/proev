'use client';
import { useEffect, useState } from 'react';

interface NewsItem { id: string; title: string; sourceName: string; sourceUrl: string; publishedAt?: string; imageUrl?: string; }

function timeAgo(d?: string) {
  if (!d) return '';
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  if (h < 24) return `${Math.round(h)} ч назад`;
  return `${Math.round(h/24)} дн назад`;
}

export default function HomeNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/news?limit=4`).then(r => r.json()).then(setNews).catch(() => {});
  }, []);
  if (!news.length) return null;

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 mt-12 md:mt-16">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 tracking-tight">Новости EV</h2>
        <a href="/news" className="text-sm text-volt-600 flex items-center gap-1 hover:underline underline-offset-2">
          Все новости →
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {news.map(item => (
          <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors">
            <div className="h-28 bg-paper-50 overflow-hidden">
              {item.imageUrl
                ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                : <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">⚡</div>
              }
            </div>
            <div className="p-3">
              <p className="text-xs text-muted mb-1">{item.sourceName} · {timeAgo(item.publishedAt)}</p>
              <p className="text-sm font-medium text-ink-900 line-clamp-3 leading-snug group-hover:text-volt-600 transition-colors">
                {item.title}
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

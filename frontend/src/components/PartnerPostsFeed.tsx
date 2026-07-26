'use client';

import { useEffect, useState } from 'react';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverUrl?: string;
  publishedAt?: string;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    city?: string;
    category: { name: string };
  };
}

function timeAgo(d?: string) {
  if (!d) return '';
  const diff = (Date.now() - new Date(d).getTime()) / 86400000;
  if (diff < 1) return 'сегодня';
  if (diff < 2) return 'вчера';
  if (diff < 7) return `${Math.round(diff)} дн назад`;
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function PartnerPostsFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/provider-blog/feed?limit=6`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setPosts(data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || posts.length === 0) return null;

  const [featured, ...rest] = posts;

  return (
    <div className="max-w-[1120px] mx-auto px-4 md:px-6 mt-12 md:mt-16">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[20px] md:text-[24px] font-bold text-ink-900 tracking-tight">
            Блог партнёров
          </h2>
          <p className="text-sm text-muted mt-1">Советы и опыт от проверенных EV-сервисов</p>
        </div>
        <a href="/services" className="text-sm text-volt-600 hover:underline underline-offset-2 flex items-center gap-1">
          Все сервисы →
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-4">

        {/* Главная статья */}
        {featured && (
          <a href={`/services/${featured.provider.slug}#blog-${featured.slug}`}
            className="group block bg-white border border-line rounded-2xl overflow-hidden hover:border-graphite-900/30 transition-colors">
            {featured.coverUrl ? (
              <div className="h-48 md:h-56 overflow-hidden bg-paper-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featured.coverUrl} alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            ) : (
              <div className="h-48 md:h-56 bg-gradient-to-br from-ink-900 to-[#1a2d4a] flex items-center justify-center">
                <span className="text-5xl opacity-20">⚡</span>
              </div>
            )}
            <div className="p-5">
              {/* Автор */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-volt-600/10 flex items-center justify-center overflow-hidden shrink-0">
                  {featured.provider.logoUrl
                    ? <img src={featured.provider.logoUrl} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                    : <span className="text-[10px] font-bold text-volt-600">{featured.provider.name[0]}</span>
                  }
                </div>
                <span className="text-xs font-medium text-muted">{featured.provider.name}</span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted">{featured.provider.city}</span>
                <span className="ml-auto text-xs text-muted">{timeAgo(featured.publishedAt || featured.createdAt)}</span>
              </div>
              <h3 className="font-semibold text-ink-900 text-base leading-snug mb-2 group-hover:text-volt-600 transition-colors">
                {featured.title}
              </h3>
              {featured.excerpt && (
                <p className="text-sm text-muted line-clamp-2 leading-relaxed">{featured.excerpt}</p>
              )}
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-volt-600 bg-volt-600/10 px-2 py-0.5 rounded-full">
                  {featured.provider.category.name}
                </span>
              </div>
            </div>
          </a>
        )}

        {/* Список остальных */}
        {rest.length > 0 && (
          <div className="flex flex-col gap-3">
            {rest.slice(0, 5).map(post => (
              <a key={post.id}
                href={`/services/${post.provider.slug}#blog-${post.slug}`}
                className="group flex gap-3 bg-white border border-line rounded-xl p-3.5 hover:border-graphite-900/30 transition-colors">
                {post.coverUrl && (
                  <div className="w-16 h-14 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.coverUrl} alt="" className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-medium text-muted truncate">{post.provider.name}</span>
                    <span className="text-[11px] text-muted shrink-0">· {timeAgo(post.publishedAt || post.createdAt)}</span>
                  </div>
                  <h3 className="text-sm font-medium text-ink-900 line-clamp-2 leading-snug group-hover:text-volt-600 transition-colors">
                    {post.title}
                  </h3>
                </div>
                <i className="ti ti-chevron-right text-muted text-sm shrink-0 my-auto" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

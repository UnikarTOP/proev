'use client';

import { useEffect, useState } from 'react';

interface LatestPost {
  id: string; title: string; slug: string;
  excerpt?: string; coverUrl?: string;
  publishedAt?: string; createdAt: string;
  provider: { name: string; slug: string; city?: string };
}

export default function LatestPosts() {
  const [posts, setPosts] = useState<LatestPost[]>([]);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/provider-blog/latest`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPosts(data))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <section className="max-w-[1120px] mx-auto px-4 md:px-6 mt-12 md:mt-16">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-ink-900 tracking-tight">
            Советы от сервисов
          </h2>
          <p className="text-sm text-muted mt-1">Статьи от партнёров proev.ru</p>
        </div>
        <a href="/services" className="text-sm text-volt-600 hover:underline underline-offset-2">
          Все сервисы →
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.slice(0, 3).map(post => (
          <a key={post.id}
            href={`/services/${post.provider.slug}/blog/${post.slug}`}
            className="group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors">
            {/* Обложка */}
            <div className="aspect-video bg-paper-50 overflow-hidden">
              {post.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.coverUrl} alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ti ti-news text-3xl text-muted/30" aria-hidden="true" />
                </div>
              )}
            </div>

            <div className="p-4">
              {/* Источник */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-2 py-0.5 rounded-full">
                  {post.provider.name}
                </span>
                {post.provider.city && (
                  <span className="text-[11px] text-muted">{post.provider.city}</span>
                )}
              </div>

              {/* Заголовок */}
              <h3 className="text-sm font-semibold text-ink-900 leading-snug line-clamp-2 group-hover:text-volt-600 transition-colors mb-1">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">{post.excerpt}</p>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-line flex justify-between items-center">
              <span className="text-xs text-muted">
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'short',
                })}
              </span>
              <span className="text-xs text-volt-600 font-medium">Читать →</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverUrl?: string;
  publishedAt?: string;
  createdAt: string;
}

export default function ProviderBlogSection({ providerId }: { providerId: string }) {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/provider-blog/public/${providerId}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPosts(data))
      .catch(() => {});
  }, [providerId]);

  if (posts.length === 0) return null;

  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2">
        <i className="ti ti-news text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
        Статьи и советы
      </h2>

      {/* Карточки-превью */}
      <div className="space-y-3 mb-6">
        {posts.map(post => (
          <a key={post.id} href={`#blog-${post.slug}`}
            className="flex gap-3 p-2 rounded-xl hover:bg-paper-50 transition-colors group block">
            {post.coverUrl && (
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-ink-900 group-hover:text-volt-600 transition-colors line-clamp-2 leading-snug">
                {post.title}
              </h3>
              {post.excerpt && <p className="text-xs text-muted mt-0.5 line-clamp-1">{post.excerpt}</p>}
            </div>
          </a>
        ))}
      </div>

      {/* Полные тексты */}
      <div className="space-y-8 border-t border-line pt-6">
        {posts.map(post => (
          <div key={post.id} id={`blog-${post.slug}`}>
            {post.coverUrl && (
              <div className="rounded-xl overflow-hidden mb-4 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <h3 className="text-base font-bold text-ink-900 mb-3">{post.title}</h3>
            <div className="prose" dangerouslySetInnerHTML={{ __html: post.content ?? '' }} />
            <p className="text-xs text-muted mt-3 pt-3 border-t border-line">
              {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

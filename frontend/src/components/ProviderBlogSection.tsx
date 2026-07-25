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
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/provider-blog/public/${providerId}`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPosts(data))
      .catch(() => {});
  }, [providerId]);

  if (posts.length === 0) return null;

  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      {/* Шапка */}
      <div className="px-5 py-4 border-b border-line flex items-center gap-2">
        <i className="ti ti-news text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink-900">Статьи и советы</h2>
        <span className="text-xs text-muted ml-1">({posts.length})</span>
      </div>

      {/* Список статей */}
      <div className="divide-y divide-line">
        {posts.map(post => (
          <div key={post.id}>
            {/* Карточка-превью */}
            <button
              onClick={() => setExpanded(expanded === post.id ? null : post.id)}
              className="w-full flex gap-4 p-5 text-left hover:bg-paper-50 transition-colors"
            >
              {/* Обложка */}
              {post.coverUrl && (
                <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Текст */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink-900 leading-snug mb-1">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="text-xs text-muted line-clamp-2 leading-relaxed">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted">
                    {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-volt-600 flex items-center gap-1">
                    {expanded === post.id
                      ? <><i className="ti ti-chevron-up text-xs" aria-hidden="true" />Свернуть</>
                      : <><i className="ti ti-chevron-down text-xs" aria-hidden="true" />Читать</>
                    }
                  </span>
                </div>
              </div>
            </button>

            {/* Полный текст — раскрывается по клику */}
            {expanded === post.id && post.content && (
              <div className="px-5 pb-6 border-t border-line">
                {post.coverUrl && (
                  <div className="rounded-xl overflow-hidden my-4 aspect-video max-h-64">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div
                  className="prose mt-4"
                  dangerouslySetInnerHTML={{ __html: post.content ?? '' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

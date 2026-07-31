'use client';
import { sanitizeHtml } from '@/lib/sanitize';

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/provider-blog/public/${providerId}`)
      .then(r => { if (!r.ok) throw new Error('not ok'); return r.json(); })
      .then(data => { if (Array.isArray(data)) setPosts(data); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [providerId]);

  // Не рендерим ничего пока не загрузили (избегаем Layout Shift)
  if (!loaded || posts.length === 0) return null;

  return (
    <div className="bg-white border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-line flex items-center gap-2">
        <i className="ti ti-news text-base" style={{ color: '#0BA5CC' }} aria-hidden="true" />
        <h2 className="text-sm font-semibold text-ink-900">Статьи и советы</h2>
        <span className="text-xs text-muted ml-1">({posts.length})</span>
      </div>

      <div className="divide-y divide-line">
        {posts.map(post => (
          <div key={post.id}>
            <button
              onClick={() => setExpanded(prev => prev === post.id ? null : post.id)}
              className="w-full flex gap-4 p-4 text-left hover:bg-paper-50 transition-colors"
            >
              {post.coverUrl && (
                <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-ink-900 leading-snug mb-1 line-clamp-2">
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
                  <span className="text-xs text-volt-600">
                    {expanded === post.id ? '↑ Свернуть' : '↓ Читать'}
                  </span>
                </div>
              </div>
            </button>

            {expanded === post.id && (
              <div className="px-5 pb-6 border-t border-line pt-4">
                {post.coverUrl && (
                  <div className="rounded-xl overflow-hidden mb-4" style={{ maxHeight: 280 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.coverUrl}
                      alt=""
                      className="w-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <div
                  className="prose"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content || '') }}
                />
                <p className="text-xs text-muted mt-4 pt-3 border-t border-line">
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

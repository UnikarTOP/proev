'use client';

import { useState, useEffect } from 'react';

interface BlogPost {
  id: string; title: string; slug: string;
  excerpt?: string; content?: string; coverUrl?: string;
  publishedAt?: string; createdAt: string;
}

export default function ProviderBlogSection({
  providerId, providerSlug,
}: { providerId: string; providerSlug: string }) {
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

      <div className="space-y-3">
        {posts.map(post => (
          <a key={post.id}
            href={`/services/${providerSlug}/blog/${post.slug}`}
            className="flex gap-3 p-2 rounded-xl hover:bg-paper-50 transition-colors group block border border-transparent hover:border-line">
            {post.coverUrl && (
              <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-ink-900 group-hover:text-volt-600 transition-colors line-clamp-2 leading-snug">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="text-xs text-muted mt-0.5 line-clamp-1">{post.excerpt}</p>
              )}
              <p className="text-xs text-muted mt-1">
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                {' '}· Читать →
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

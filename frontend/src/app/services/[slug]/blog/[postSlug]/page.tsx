import { notFound } from 'next/navigation';

async function getPost(providerId: string, postSlug: string) {
  const api = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/provider-blog/public/${providerId}/${postSlug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getProvider(slug: string) {
  const api = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/service-providers/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function PostPage({
  params,
}: {
  params: { slug: string; postSlug: string };
}) {
  const provider = await getProvider(params.slug);
  if (!provider) notFound();

  const post = await getPost(provider.id, params.postSlug);
  if (!post) notFound();

  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 py-8">
      {/* Хлебные крошки */}
      <nav className="text-sm mb-6 flex items-center gap-2 flex-wrap">
        <a href="/services" className="text-muted hover:text-ink-900 transition-colors">Сервисы</a>
        <span className="text-muted">›</span>
        <a href={`/services/${params.slug}`} className="text-muted hover:text-ink-900 transition-colors">{provider.name}</a>
        <span className="text-muted">›</span>
        <span className="text-ink-900 truncate max-w-[200px]">{post.title}</span>
      </nav>

      {/* Обложка */}
      {post.coverUrl && (
        <div className="rounded-2xl overflow-hidden aspect-video mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Заголовок */}
      <h1 className="text-2xl md:text-3xl font-bold text-ink-900 leading-tight mb-3">{post.title}</h1>

      {/* Мета */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-line">
        <a href={`/services/${params.slug}`}
          className="flex items-center gap-2 text-sm text-muted hover:text-ink-900 transition-colors">
          {provider.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={provider.logoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          )}
          {provider.name}
        </a>
        <span className="text-muted">·</span>
        <span className="text-sm text-muted">
          {new Date(post.publishedAt || post.createdAt).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </span>
      </div>

      {/* Контент */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: post.content ?? '' }} />

      {/* Ссылка назад */}
      <div className="mt-10 pt-6 border-t border-line">
        <a href={`/services/${params.slug}`}
          className="inline-flex items-center gap-2 text-sm text-volt-600 hover:underline underline-offset-2">
          ← Вернуться к странице {provider.name}
        </a>
      </div>
    </div>
  );
}

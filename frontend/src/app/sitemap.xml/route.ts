export const revalidate = 3600; // кешируем на 1 час

export async function GET() {
  const SITE = 'https://proev.ru';
  const api = process.env.INTERNAL_API_URL || 'http://backend:3001/api';

  // Статические страницы
  const staticPages: { url: string; changefreq: string; priority: string; lastmod?: string }[] = [
    { url: '',           changefreq: 'weekly',  priority: '1.0' },
    { url: '/charge-map',changefreq: 'daily',   priority: '0.9' },
    { url: '/services',  changefreq: 'daily',   priority: '0.9' },
    { url: '/news',      changefreq: 'daily',   priority: '0.8' },
    { url: '/partner',   changefreq: 'monthly', priority: '0.7' },
    { url: '/operators',  changefreq: 'monthly', priority: '0.8' },
    { url: '/about',     changefreq: 'monthly', priority: '0.5' },
    { url: '/pricing',   changefreq: 'monthly', priority: '0.6' },
  ];

  // Лендинги партнёров
  let providerUrls: { url: string; changefreq: string; priority: string; lastmod?: string }[] = [];
  try {
    const res = await fetch(`${api}/service-providers?limit=1000`, { cache: 'no-store' });
    if (res.ok) {
      const providers = await res.json();
      if (Array.isArray(providers)) {
        providerUrls = providers
          .filter((p: any) => p.isPublished && p.slug)
          .map((p: any) => ({
            url: `/services/${p.slug}`,
            changefreq: 'weekly',
            priority: p.isPaidPlacement ? '0.8' : '0.6',
            lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : undefined,
          }));
      }
    }
  } catch {}

  // Новости (последние 200)
  let newsUrls: { url: string; changefreq: string; priority: string; lastmod?: string }[] = [];
  try {
    const res = await fetch(`${api}/news?limit=200&status=approved`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || [];
      newsUrls = items
        .filter((n: any) => n.slug || n.id)
        .map((n: any) => ({
          url: `/news/${n.slug || n.id}`,
          changefreq: 'monthly',
          priority: '0.5',
          lastmod: n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : undefined,
        }));
    }
  } catch {}


  // SEO страницы по городам
  const cityUrls: { url: string; changefreq: string; priority: string; lastmod?: string }[] = [
    'moskva','spb','novosibirsk','ekaterinburg','kazan','krasnodar',
    'nizhniy-novgorod','voronezh','tyumen','vladivostok','sochi',
    'samara','ufa','chelyabinsk','krasnoyarsk','perm','omsk',
  ].map(city => ({
    url: `/services/city/${city}`,
    changefreq: 'weekly',
    priority: '0.7',
  }));

  const allUrls = [...staticPages, ...cityUrls, ...providerUrls, ...newsUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(p => `  <url>
    <loc>${SITE}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    ${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

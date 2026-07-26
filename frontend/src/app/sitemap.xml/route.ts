export async function GET() {
  const pages = ['', '/news', '/services', '/charge-map', '/partner'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>https://proev.ru${p}</loc><changefreq>${p === '/news' ? 'daily' : 'weekly'}</changefreq></url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

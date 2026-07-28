export async function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /partner/cabinet\nDisallow: /api/\nSitemap: https://proev.ru/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
}

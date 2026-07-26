export async function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /partner/cabinet\nSitemap: https://proev.ru/sitemap.xml`,
    { headers: { 'Content-Type': 'text/plain' } }
  );
}

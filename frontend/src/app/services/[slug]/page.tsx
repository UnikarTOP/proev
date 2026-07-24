import { notFound } from 'next/navigation';
import ServiceLanding from '@/components/ServiceLanding';

export const dynamic = 'force-dynamic';

async function getProvider(slug: string) {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api';
  try {
    const res = await fetch(`${api}/service-providers/slug/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getProvider(params.slug);
  if (!p) return { title: 'Сервис не найден' };
  return {
    title: `${p.name} — ${p.category?.name} | proev.ru`,
    description: p.tagline || p.description,
  };
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const provider = await getProvider(params.slug);
  if (!provider) notFound();
  return <ServiceLanding provider={provider} />;
}

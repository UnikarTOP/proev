import dynamic from 'next/dynamic';

const ServicesClient = dynamic(
  () => import('@/components/ServicesPage'),
  { ssr: false }
);

export default function ServicesPage() {
  return <ServicesClient />;
}

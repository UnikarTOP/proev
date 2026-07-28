'use client';
import dynamic from 'next/dynamic';

const ServicesPage = dynamic(
  () => import('@/components/ServicesPage'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка...</p>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return <ServicesPage />;
}

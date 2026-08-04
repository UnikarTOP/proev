import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

const OsagoClient = dynamic(() => import('./OsagoClient'), { ssr: false });

export const metadata: Metadata = {
  title: 'ОСАГО для электромобиля онлайн — proev.ru',
  description: 'Оформите ОСАГО для электромобиля онлайн. Сравните цены от 25+ страховых компаний и сэкономьте до 40%.',
};

export default function OsagoPage() {
  return <OsagoClient />;
}

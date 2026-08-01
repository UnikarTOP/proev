import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Умный планировщик маршрута с ЭЗС — proev.ru (бета)',
  description: 'Расчёт маршрута с учётом реальных зарядных станций по пути',
  robots: 'noindex',
};

const Client = dynamic(() => import('./RouteV2Client'), { ssr: false });
export default function RouteV2Page() { return <Client />; }

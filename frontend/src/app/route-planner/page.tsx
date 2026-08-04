import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Калькулятор маршрута электромобиля — proev.ru',
  description: 'Рассчитайте маршрут на электромобиле с учётом зарядных станций, сезона и скорости. Сравнение стоимости с бензином. Открыть в Яндекс Картах и 2ГИС.',
  keywords: ['калькулятор маршрута электромобиль', 'расчёт запаса хода EV', 'планировщик маршрута электрокар', 'зарядки по маршруту'],
  openGraph: {
    title: 'Калькулятор маршрута электромобиля',
    description: 'Рассчитайте маршрут с учётом реального расхода, зарядных станций и стоимости поездки.',
    url: 'https://proev.ru/route-planner',
  },
};

import dynamic from 'next/dynamic';
const RoutePlanner = dynamic(() => import('./RoutePlannerClient'), { ssr: false });
export default function RoutePlannerPage() { return <RoutePlanner />; }

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Операторам ЭЗС — бесплатное подключение к карте proev.ru',
  description: 'Разместите зарядные станции на карте proev.ru бесплатно. OCPI 2.2.1, API, Excel. Золотой партнёр навсегда.',
  keywords: ['операторы зарядных станций', 'OCPI', 'подключить ЭЗС', 'карта зарядок', 'EV charging'],
  openGraph: {
    title: 'Операторам ЭЗС — бесплатное подключение к proev.ru',
    description: 'Разместите зарядные станции на карте. Бесплатно и навсегда. OCPI 2.2.1 / API / Excel.',
    url: 'https://proev.ru/operators',
  },
};

export default function OperatorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

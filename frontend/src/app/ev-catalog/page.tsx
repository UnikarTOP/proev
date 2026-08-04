import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'База электромобилей в России — характеристики и запас хода — proev.ru',
  description: 'Полная база электромобилей: Evolute, Zeekr, Tesla, BYD, Москвич 3е. Характеристики, запас хода по сезонам, тип разъёма, скорость зарядки.',
  keywords: ['электромобили Россия характеристики', 'каталог EV', 'запас хода электромобиль', 'Evolute Zeekr Tesla характеристики'],
  openGraph: {
    title: 'База электромобилей — характеристики и запас хода',
    description: 'Полная база EV: запас хода летом и зимой, тип разъёма, скорость зарядки.',
    url: 'https://proev.ru/ev-catalog',
  },
};

import dynamic from 'next/dynamic';

const EVCatalog = dynamic(() => import('./EVCatalogClient'), { ssr: false });

export default function EVCatalogPage() {
  return <EVCatalog />;
}

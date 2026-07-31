import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const ServicesPage = dynamic(
  () => import('@/components/ServicesPage'),
  { ssr: false }
);

// Топ городов для статической генерации
const TOP_CITIES: Record<string, string> = {
  'moskva': 'Москва',
  'spb': 'Санкт-Петербург',
  'novosibirsk': 'Новосибирск',
  'ekaterinburg': 'Екатеринбург',
  'kazan': 'Казань',
  'krasnodar': 'Краснодар',
  'nizhniy-novgorod': 'Нижний Новгород',
  'voronezh': 'Воронеж',
  'tyumen': 'Тюмень',
  'vladivostok': 'Владивосток',
  'sochi': 'Сочи',
  'samara': 'Самара',
  'ufa': 'Уфа',
  'chelyabinsk': 'Челябинск',
  'krasnoyarsk': 'Красноярск',
  'perm': 'Пермь',
  'omsk': 'Омск',
  'irkutsk': 'Иркутск',
  'habarovsk': 'Хабаровск',
  'rostov': 'Ростов-на-Дону',
};

export async function generateStaticParams() {
  return Object.keys(TOP_CITIES).map(city => ({ city }));
}

export async function generateMetadata(
  { params }: { params: { city: string } }
): Promise<Metadata> {
  const cityName = TOP_CITIES[params.city];
  if (!cityName) return { title: 'proev.ru' };

  return {
    title: `Сервисы для электромобилей в ${cityName} — proev.ru`,
    description: `Найдите проверенные СТО, установщиков зарядных станций и другие EV-сервисы в ${cityName}. Каталог с отзывами на proev.ru.`,
    keywords: [`электромобиль ${cityName}`, `СТО электромобиль ${cityName}`, `зарядка EV ${cityName}`, `сервис электрокар ${cityName}`],
    openGraph: {
      title: `EV-сервисы в ${cityName} — proev.ru`,
      description: `Каталог сервисов для электромобилей в ${cityName}: СТО, зарядки, страховка.`,
      url: `https://proev.ru/services/city/${params.city}`,
    },
    alternates: {
      canonical: `https://proev.ru/services/city/${params.city}`,
    },
  };
}

export default function CityServicesPage({ params }: { params: { city: string } }) {
  const cityName = TOP_CITIES[params.city];
  if (!cityName) notFound();

  return (
    <div>
      {/* SEO заголовок — виден поисковикам */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-0">
        <nav className="text-xs text-muted mb-3 flex items-center gap-1.5">
          <a href="/" className="hover:text-ink-900">proev.ru</a>
          <span>›</span>
          <a href="/services" className="hover:text-ink-900">Сервисы</a>
          <span>›</span>
          <span className="text-ink-900">{cityName}</span>
        </nav>
      </div>

      {/* Каталог с предустановленным городом */}
      <ServicesPage initialCity={cityName} />
    </div>
  );
}

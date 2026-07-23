import { apiGet, type ChargingStation } from '@/lib/api';
import Map from '@/components/Map';

export const metadata = {
  title: 'Карта зарядных станций — proev.ru',
  description: 'Карта зарядных станций для электромобилей по всей России. Статусы от водителей, фильтры по разъёму и скорости зарядки.',
};

// Данные карты всегда свежие — не кэшируем на уровне Next.js
export const revalidate = 0;

export default async function ChargeMapPage() {
  let stations: ChargingStation[] = [];
  try {
    // Берём все станции без пагинации — MapLibre отрисует через GeoJSON,
    // кластеризация на стороне карты, браузер не вешается.
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://backend:3001/api'}/stations`,
      { cache: 'no-store' },
    );
    if (res.ok) stations = await res.json();
  } catch {
    stations = [];
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-1">
          Карта зарядных станций
        </h1>
        <p className="text-muted text-sm">
          Статусы обновляют сами водители. Нашли неработающую зарядку — отметьте на карточке станции.
        </p>
      </div>

      <Map stations={stations} />

      {stations.length === 0 && (
        <div className="mt-6 p-4 rounded-xl bg-paper-50 border border-line text-sm text-muted text-center">
          Данные карты временно недоступны. Попробуйте обновить страницу.
        </div>
      )}
    </div>
  );
}

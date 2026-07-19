import { apiGet, type ChargingStation } from '@/lib/api';
import Map from '@/components/Map';

export const metadata = {
  title: 'Карта зарядных станций для электромобилей — proev.ru',
};

export default async function ChargeMapPage() {
  let stations: ChargingStation[] = [];
  try {
    stations = await apiGet<ChargingStation[]>('/stations');
  } catch {
    stations = [];
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-2">Карта зарядных станций</h1>
      <p className="text-muted mb-6">
        Статусы станций обновляют сами водители. Нашли неработающую зарядку — отметьте на карточке станции.
      </p>
      <Map stations={stations} />
      {stations.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Пока нет данных — подключите бэкенд и наполните базу станций (см. README).
        </p>
      )}
    </div>
  );
}

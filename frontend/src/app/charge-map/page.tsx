import MapWrapper from '@/components/MapWrapper';

export const metadata = {
  title: 'Карта зарядных станций — proev.ru',
  description: 'Карта зарядных станций для электромобилей по всей России. Статусы от водителей, фильтры по разъёму и скорости зарядки.',
};

// Страница карты не генерируется статически — данные грузятся на клиенте
export const dynamic = 'force-dynamic';

export default function ChargeMapPage() {
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
      <MapWrapper />
    </div>
  );
}

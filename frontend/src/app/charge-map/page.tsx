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
      <div style={{ position: 'relative' }}>
        <MapWrapper />
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(11,18,32,0.85)', backdropFilter: 'blur(8px)',
          color: '#3DDBFF', fontSize: 13, fontWeight: 500,
          padding: '8px 20px', borderRadius: 20,
          border: '1px solid rgba(11,165,204,0.3)',
          zIndex: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>
          ⚡ Карта в демо-режиме — данные обновляются
        </div>
      </div>
    </div>
  );
}

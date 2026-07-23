'use client';

import { useEffect, useState } from 'react';
import type { ChargingStation } from '@/lib/api';
import Map from './Map';

export default function MapWrapper() {
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${apiUrl}/stations`)
      .then((r) => {
        if (!r.ok) throw new Error('API error');
        return r.json();
      })
      .then((data) => { setStations(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[560px] rounded-xl border border-line bg-paper-50">
        <div className="text-center text-muted">
          <div className="text-2xl mb-2">🗺️</div>
          <div className="text-sm">Загружаем станции...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[560px] rounded-xl border border-line bg-paper-50">
        <div className="text-center text-muted text-sm">
          Данные карты временно недоступны. Попробуйте обновить страницу.
        </div>
      </div>
    );
  }

  return <Map stations={stations} />;
}

'use client';

import { useState } from 'react';

interface Review {
  id: string;
  statusReport: string;
  comment?: string;
  rating?: number;
  waitMinutes?: number;
  powerActual?: number;
  connectorOk?: string;
  createdAt: string;
}

interface Station {
  id: string;
  name: string;
  address?: string;
  city?: string;
  status: 'available' | 'occupied' | 'broken' | 'unknown';
  connectors: string[];
  powerKw?: number;
  network?: string;
  networkOperator?: string;
  verified?: boolean;
  reportCount?: number;
  lastStatusUpdate?: string;
  reviews?: Review[];
  _count?: { reviews: number };
}

const STATUS = {
  available: { label: 'Свободна',    color: '#1D9E75', bg: '#E1F5EE', dot: '#1D9E75', icon: '✓' },
  occupied:  { label: 'Занята',      color: '#D97706', bg: '#FAEEDA', dot: '#EF9F27', icon: '⏳' },
  broken:    { label: 'Неисправна',  color: '#DC2626', bg: '#FEE2E2', dot: '#E24B4A', icon: '✕' },
  unknown:   { label: 'Нет данных',  color: '#6B7686', bg: '#F1EFE8', dot: '#B4B2A9', icon: '?' },
};

const CONNECTORS_ICONS: Record<string, string> = {
  'CCS2': 'CCS2', 'CHAdeMO': 'CHd', 'Type2': 'T2',
  'Type1': 'T1', 'Tesla': 'TSL', 'GB/T DC': 'GBT', 'GB/T AC': 'GBT',
};

function timeAgo(d?: string) {
  if (!d) return null;
  const diff = (Date.now() - new Date(d).getTime()) / 60000;
  if (diff < 1) return 'только что';
  if (diff < 60) return `${Math.round(diff)} мин назад`;
  if (diff < 1440) return `${Math.round(diff / 60)} ч назад`;
  return `${Math.round(diff / 1440)} дн назад`;
}

// ── Форма репорта статуса ──────────────────────────────────────────────────

function ReportForm({ stationId, onDone }: { stationId: string; onDone: (status: string) => void }) {
  const [step, setStep] = useState<'status' | 'details' | 'sent'>('status');
  const [selected, setSelected] = useState('');
  const [comment, setComment] = useState('');
  const [wait, setWait] = useState('');
  const [power, setPower] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || '/api';

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/stations/${stationId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selected,
          comment: comment || undefined,
          waitMinutes: wait ? parseInt(wait) : undefined,
          powerActual: power ? parseFloat(power) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('sent');
        onDone(data.newStatus || selected);
      }
    } catch {}
    setLoading(false);
  };

  if (step === 'sent') return (
    <div className="text-center py-4">
      <div className="text-2xl mb-2">✓</div>
      <p className="text-sm font-semibold text-ink-900">Спасибо за репорт!</p>
      <p className="text-xs text-muted mt-1">Статус станции обновлён</p>
    </div>
  );

  const statuses = [
    { key: 'available', label: 'Свободна', emoji: '✅', desc: 'Есть свободные разъёмы' },
    { key: 'occupied',  label: 'Занята',   emoji: '⏳', desc: 'Все разъёмы заняты' },
    { key: 'broken',    label: 'Не работает', emoji: '❌', desc: 'Неисправна или недоступна' },
  ];

  if (step === 'status') return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        Какой статус сейчас?
      </p>
      <div className="space-y-2">
        {statuses.map(s => (
          <button key={s.key} onClick={() => { setSelected(s.key); setStep('details'); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:border-graphite-900/30 hover:bg-paper-50 transition-all text-left">
            <span className="text-lg">{s.emoji}</span>
            <div>
              <div className="text-sm font-semibold text-ink-900">{s.label}</div>
              <div className="text-xs text-muted">{s.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStep('status')} className="text-muted hover:text-ink-900">←</button>
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Детали (необязательно)</p>
      </div>

      <div className="space-y-3">
        {selected === 'occupied' && (
          <div>
            <label className="text-xs text-muted block mb-1">Время ожидания (мин)</label>
            <input type="number" value={wait} onChange={e => setWait(e.target.value)}
              placeholder="Например: 15" min="0" max="300"
              className="w-full text-sm border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-volt-600" />
          </div>
        )}

        {selected === 'available' && (
          <div>
            <label className="text-xs text-muted block mb-1">Реальная мощность (кВт)</label>
            <input type="number" value={power} onChange={e => setPower(e.target.value)}
              placeholder="Например: 50" min="1" max="500"
              className="w-full text-sm border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-volt-600" />
          </div>
        )}

        <div>
          <label className="text-xs text-muted block mb-1">Комментарий</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder={selected === 'broken'
              ? 'Что не работает? Экран не реагирует, кабель оборван...'
              : 'Всё работает отлично, быстро зарядился!'}
            rows={2} className="w-full text-sm border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-volt-600 resize-none" />
        </div>

        <button onClick={submit} disabled={loading}
          className="w-full py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <span className="animate-spin text-base">⟳</span>}
          Отправить репорт
        </button>
      </div>
    </div>
  );
}

// ── Основная карточка ──────────────────────────────────────────────────────

export default function StationCard({
  station: initial,
  onClose,
}: {
  station: Station;
  onClose?: () => void;
}) {
  const [station, setStation] = useState(initial);
  const [tab, setTab] = useState<'info' | 'reviews' | 'report'>('info');
  const [reviews, setReviews] = useState<Review[]>(initial.reviews || []);
  const [reviewsLoaded, setReviewsLoaded] = useState(!!initial.reviews);

  const st = STATUS[station.status] || STATUS.unknown;
  const API = process.env.NEXT_PUBLIC_API_URL || '/api';

  const loadReviews = async () => {
    if (reviewsLoaded) return;
    const data = await fetch(`${API}/stations/${station.id}/reviews`).then(r => r.json());
    setReviews(data);
    setReviewsLoaded(true);
  };

  const handleTabChange = (t: typeof tab) => {
    setTab(t);
    if (t === 'reviews') loadReviews();
  };

  const handleReportDone = (newStatus: string) => {
    setStation(s => ({ ...s, status: newStatus as any, lastStatusUpdate: new Date().toISOString() }));
    setTab('info');
  };

  const routeUrl = station.address
    ? `https://yandex.ru/maps/?text=${encodeURIComponent(`${station.city || ''} ${station.address}`)}&mode=routes`
    : `https://yandex.ru/maps/?ll=${station.longitude},${station.latitude}&z=16`;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-line w-full max-w-sm flex flex-col">

      {/* Заголовок со статусом */}
      <div className="relative" style={{ background: st.bg }}>
        {/* Кнопка закрыть */}
        {onClose && (
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center text-muted hover:text-ink-900 text-sm z-10">
            ✕
          </button>
        )}

        <div className="px-4 pt-4 pb-3">
          {/* Статус */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: st.dot }} />
            <span className="text-sm font-bold" style={{ color: st.color }}>{st.label}</span>
            {station.lastStatusUpdate && (
              <span className="text-[10px] text-muted ml-auto">{timeAgo(station.lastStatusUpdate)}</span>
            )}
          </div>

          {/* Название */}
          <h3 className="font-bold text-ink-900 text-base leading-snug mb-0.5">{station.name}</h3>
          {(station.address || station.city) && (
            <p className="text-xs text-muted">
              {[station.city, station.address].filter(Boolean).join(', ')}
            </p>
          )}
        </div>

        {/* Разъёмы и мощность */}
        <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
          {station.connectors.map(c => (
            <span key={c} className="text-[11px] font-bold bg-white/80 px-2 py-0.5 rounded-full text-ink-900">
              {CONNECTORS_ICONS[c] || c}
            </span>
          ))}
          {station.powerKw && (
            <span className="text-[11px] font-semibold text-muted">
              ⚡ {station.powerKw} кВт
            </span>
          )}
          {station.network && (
            <span className="text-[11px] text-muted ml-auto">{station.network}</span>
          )}
        </div>
      </div>

      {/* Табы */}
      <div className="flex border-b border-line">
        {[
          { key: 'info' as const, label: 'Инфо' },
          { key: 'reviews' as const, label: `Репорты${station._count?.reviews ? ` (${station._count.reviews})` : ''}` },
          { key: 'report' as const, label: '+ Статус' },
        ].map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'text-volt-600 border-b-2 border-volt-600 -mb-px'
                : 'text-muted hover:text-ink-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Содержимое */}
      <div className="p-4 flex-1 overflow-y-auto max-h-72">

        {tab === 'info' && (
          <div className="space-y-3">
            {/* Статистика */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-paper-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-ink-900 font-mono">
                  {station.reportCount || 0}
                </div>
                <div className="text-[10px] text-muted mt-0.5">репортов</div>
              </div>
              <div className="bg-paper-50 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-ink-900 font-mono">
                  {station._count?.reviews || 0}
                </div>
                <div className="text-[10px] text-muted mt-0.5">отзывов</div>
              </div>
            </div>

            {/* Верификация */}
            {station.verified && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-2">
                <span>✅</span>
                <span>Данные верифицированы командой proev.ru</span>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex gap-2">
              <a href={routeUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2.5 text-xs font-semibold text-center rounded-xl transition-colors"
                style={{ background: '#0B1220', color: '#fff' }}>
                🗺 Маршрут
              </a>
              <button onClick={() => setTab('report')}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl border border-line hover:border-graphite-900/30 hover:bg-paper-50 transition-colors text-ink-900">
                📍 Обновить
              </button>
            </div>

            <p className="text-[10px] text-muted text-center">
              Статусы обновляют сами водители в реальном времени
            </p>
          </div>
        )}

        {tab === 'reviews' && (
          <div>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted">Репортов пока нет</p>
                <button onClick={() => setTab('report')}
                  className="text-xs text-volt-600 underline underline-offset-2 mt-2">
                  Быть первым →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => {
                  const rst = STATUS[r.statusReport as keyof typeof STATUS] || STATUS.unknown;
                  return (
                    <div key={r.id} className="border border-line rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: rst.bg, color: rst.color }}>
                          {rst.icon} {rst.label}
                        </span>
                        <span className="text-[10px] text-muted ml-auto">{timeAgo(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="text-xs text-muted leading-relaxed">{r.comment}</p>}
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {r.waitMinutes != null && (
                          <span className="text-[10px] text-muted">⏳ {r.waitMinutes} мин ожидания</span>
                        )}
                        {r.powerActual != null && (
                          <span className="text-[10px] text-muted">⚡ {r.powerActual} кВт</span>
                        )}
                        {r.rating != null && (
                          <span className="text-[10px] text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'report' && (
          <ReportForm stationId={station.id} onDone={handleReportDone} />
        )}
      </div>
    </div>
  );
}

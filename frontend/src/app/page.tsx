import { RouteStrip } from '@/components/RouteStrip';

export default function HomePage() {
  return (
    <div>
      {/* ===== HERO ===== */}
      <div className="max-w-[1120px] mx-auto px-6">
        <div className="bg-ink-900 text-white rounded-2xl px-8 md:px-12 pt-16 pb-12 relative overflow-hidden">
          <RouteStrip variant="hero" />
          <h1 className="text-3xl md:text-[44px] font-bold leading-[1.12] tracking-tight max-w-xl mb-5">
            Электромобиль.
            <br />
            Без тревоги о <span className="text-volt-400">запасе хода</span>.
          </h1>
          <p className="text-[17px] text-[#B7C0D1] max-w-lg mb-8">
            Карта зарядных станций с живыми статусами от водителей, проверенные сервисы
            и сообщество тех, кто уже за рулём электромобиля — по всей России.
          </p>
          <div className="flex gap-3.5">
            <a href="/charge-map" className="bg-volt-400 text-ink-900 font-semibold text-[15px] px-6 py-3.5 rounded-xl">
              Найти зарядку
            </a>
            <a href="/services" className="border border-[#33415E] text-white font-semibold text-[15px] px-6 py-3.5 rounded-xl">
              Каталог сервисов
            </a>
          </div>
        </div>
      </div>

      {/* ===== ДЕЛИТЕЛЬ (фирменный мотив) ===== */}
      <div className="max-w-[1120px] mx-auto px-6 my-14">
        <RouteStrip variant="divider" />
      </div>

      {/* ===== FEATURES ===== */}
      <div className="max-w-[1120px] mx-auto px-6 grid md:grid-cols-3 gap-5">
        <FeatureCard eyebrow="01 · Карта" title="Карта зарядок" text="Статус станций обновляют сами водители — работает, сломана, есть очередь." href="/charge-map" />
        <FeatureCard eyebrow="02 · Сервисы" title="Сервисы для EV" text="СТО, установка домашних зарядных станций, страхование, шиномонтаж — с проверенными партнёрами." href="/services" />
        <FeatureCard eyebrow="03 · Сообщество" title="Опыт из первых рук" text="Истории покупки, зимней эксплуатации и обслуживания от тех, кто уже проехал этот путь." href="/blog" />
      </div>

      {/* ===== STATION PREVIEW ===== */}
      <div className="max-w-[1120px] mx-auto px-6 mt-14 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
        <div>
          <h2 className="text-[26px] font-bold text-ink-900 tracking-tight mb-3">
            Статус станции — от тех, кто там был
          </h2>
          <p className="text-[15px] text-muted max-w-md mb-6">
            Никаких устаревших данных оператора. Каждый статус подтверждён водителем,
            который заряжался здесь недавно.
          </p>
          <div className="flex gap-5">
            <LegendItem color="bg-[#1D9E75]" label="Работает" />
            <LegendItem color="bg-[#E24B4A]" label="Сломана" />
            <LegendItem color="bg-[#B4B2A9]" label="Нет данных" />
          </div>
        </div>

        <div className="bg-ink-900 rounded-2xl p-5 text-white">
          <StationRow name="ТЦ Метрополис, Москва" meta="CCS2 · 150 кВт · Яндекс.Заправки" status="working" />
          <StationRow name="М-11, 412 км" meta="CCS2 · 60 кВт · Россети" status="broken" />
          <StationRow name="Парковка Сити, СПб" meta="Type2 · 22 кВт" status="unknown" last />
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="max-w-[1120px] mx-auto px-6 mt-16 pt-8 border-t border-line flex flex-wrap justify-between gap-6">
        <Stat value="2 400+" label="станций на карте" />
        <Stat value="89" label="городов" />
        <Stat value="12 000+" label="водителей в сообществе" />
        <Stat value="24/7" label="актуальные статусы" />
      </div>
    </div>
  );
}

function FeatureCard({ eyebrow, title, text, href }: { eyebrow: string; title: string; text: string; href: string }) {
  return (
    <a href={href} className="block bg-white border border-line rounded-xl p-7 hover:border-volt-600 transition">
      <span className="block font-mono text-[11px] tracking-wider uppercase text-volt-600 mb-3.5">{eyebrow}</span>
      <h3 className="text-lg font-semibold text-ink-900 mb-2.5">{title}</h3>
      <p className="text-sm text-muted">{text}</p>
    </a>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
      <span className={`w-2.5 h-2.5 rounded-full inline-block ${color}`} />
      {label}
    </div>
  );
}

function StationRow({ name, meta, status, last }: { name: string; meta: string; status: 'working' | 'broken' | 'unknown'; last?: boolean }) {
  const statusStyles = {
    working: 'bg-[#1D9E75]/20 text-[#5DCAA5]',
    broken: 'bg-[#E24B4A]/20 text-[#F09595]',
    unknown: 'bg-[#B4B2A9]/20 text-[#B4B2A9]',
  };
  const statusLabels = { working: 'работает', broken: 'сломана', unknown: 'нет данных' };

  return (
    <div className={`flex items-center justify-between py-3.5 ${last ? '' : 'border-b border-[#22304A]'}`}>
      <div>
        <div className="text-sm font-semibold">{name}</div>
        <div className="text-xs text-[#8A96AC] mt-0.5">{meta}</div>
      </div>
      <span className={`font-mono text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-mono text-[28px] font-semibold text-ink-900">{value}</div>
      <div className="text-[13px] text-muted mt-1">{label}</div>
    </div>
  );
}

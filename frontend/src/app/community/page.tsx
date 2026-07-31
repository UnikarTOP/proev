import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Сообщество владельцев электромобилей — proev.ru',
  description: 'Владельцы Tesla, BYD, Zeekr и других EV в России. Советы, обмен опытом, реальные данные о зарядках.',
};

const BRANDS = [
  { name: 'Tesla', emoji: '🔋', color: '#CC0000', models: ['Model 3', 'Model Y', 'Model S', 'Model X'] },
  { name: 'BYD', emoji: '⚡', color: '#1DB954', models: ['Han', 'Seal', 'Atto 3', 'Dolphin', 'Tang'] },
  { name: 'Zeekr', emoji: '🚗', color: '#0066FF', models: ['001', '007', '009', 'X'] },
  { name: 'Li Auto', emoji: '🌟', color: '#FF6B00', models: ['L9', 'L8', 'L7', 'L6', 'MEGA'] },
  { name: 'Aito', emoji: '💫', color: '#8B5CF6', models: ['M9', 'M7', 'M5'] },
  { name: 'Voyah', emoji: '🌊', color: '#0EA5E9', models: ['Free', 'Dream'] },
  { name: 'Nio', emoji: '🔵', color: '#00BFFF', models: ['ET5', 'ET7', 'EL6', 'ES8'] },
  { name: 'Xpeng', emoji: '🦅', color: '#10B981', models: ['P7', 'P5', 'G9', 'G6'] },
  { name: 'Volkswagen', emoji: '🇩🇪', color: '#003087', models: ['ID.3', 'ID.4', 'ID.6'] },
  { name: 'BMW', emoji: '⚡', color: '#0066B2', models: ['iX', 'i4', 'i7', 'iX1', 'iX3'] },
  { name: 'Hyundai', emoji: '🔷', color: '#002C5F', models: ['IONIQ 5', 'IONIQ 6', 'Kona Electric'] },
  { name: 'Nissan', emoji: '🍃', color: '#C3002F', models: ['Leaf', 'Ariya'] },
];

export default function CommunityPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-10 md:py-14">

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-volt-600 bg-volt-600/10 px-3 py-1.5 rounded-full mb-4">
          👥 Сообщество
        </div>
        <h1 className="text-[26px] md:text-[36px] font-bold text-ink-900 tracking-tight mb-3">
          Владельцы электромобилей в России
        </h1>
        <p className="text-muted text-base max-w-[600px]">
          Найдите людей с таким же электромобилем, обменивайтесь опытом и реальными данными о зарядках.
        </p>
      </div>

      {/* Регистрация CTA */}
      <div className="bg-ink-900 rounded-2xl p-6 mb-10 flex flex-wrap items-center gap-6">
        <div className="flex-1 min-w-[200px]">
          <h3 className="text-white font-bold text-base mb-1">Укажите ваш электромобиль</h3>
          <p className="text-sm" style={{ color: '#B7C0D1' }}>Войдите и добавьте данные — находите владельцев таких же авто</p>
        </div>
        <a href="/profile" className="flex-shrink-0 px-6 py-3 rounded-xl text-sm font-semibold no-underline"
          style={{ background: '#3DDBFF', color: '#0B1220' }}>
          Добавить авто →
        </a>
      </div>

      {/* Марки */}
      <h2 className="text-[18px] font-bold text-ink-900 mb-5">Выберите марку</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
        {BRANDS.map(brand => (
          <a key={brand.name} href={`/community/${brand.name.toLowerCase().replace(/\s/g, '-')}`}
            className="group bg-white border border-line rounded-2xl p-5 hover:shadow-md hover:border-graphite-900/20 transition-all no-underline">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{brand.emoji}</span>
              <span className="font-bold text-ink-900 text-base group-hover:text-volt-600 transition-colors">
                {brand.name}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {brand.models.slice(0, 3).map(m => (
                <span key={m} className="text-[10px] text-muted bg-paper-50 px-2 py-0.5 rounded-full border border-line">
                  {m}
                </span>
              ))}
              {brand.models.length > 3 && (
                <span className="text-[10px] text-muted">+{brand.models.length - 3}</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Что дает сообщество */}
      <h2 className="text-[18px] font-bold text-ink-900 mb-5">Зачем вступать</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { icon: '🔌', title: 'Реальные данные о зарядках', desc: 'Узнайте от других владельцев такого же авто где реально быстро заряжаться' },
          { icon: '🛠️', title: 'Советы по обслуживанию', desc: 'Какие СТО умеют работать с вашей маркой, где дешевле и качественнее' },
          { icon: '🗺️', title: 'Маршруты на дальние расстояния', desc: 'Проверенные маршруты с зарядками от владельцев которые уже проехали этот путь' },
        ].map(f => (
          <div key={f.title} className="bg-white border border-line rounded-2xl p-5">
            <div className="text-2xl mb-3">{f.icon}</div>
            <h3 className="font-semibold text-ink-900 mb-2 text-sm">{f.title}</h3>
            <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

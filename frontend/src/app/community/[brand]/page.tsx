import { notFound } from 'next/navigation';

const BRANDS: Record<string, string> = {
  'tesla': 'Tesla', 'byd': 'BYD', 'zeekr': 'Zeekr',
  'li-auto': 'Li Auto', 'aito': 'Aito', 'voyah': 'Voyah',
  'nio': 'Nio', 'xpeng': 'Xpeng', 'volkswagen': 'Volkswagen',
  'bmw': 'BMW', 'hyundai': 'Hyundai', 'nissan': 'Nissan',
  'evolute': 'Evolute', 'moskvich': 'Москвич',
};

export default function CommunityBrandPage({ params }: { params: { brand: string } }) {
  const brandName = BRANDS[params.brand];
  if (!brandName) notFound();

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-10">
      <div className="mb-6">
        <a href="/community" className="text-xs text-muted hover:text-ink-900">← Все марки</a>
      </div>
      <h1 className="text-2xl font-bold text-ink-900 mb-2">Сообщество {brandName}</h1>
      <p className="text-muted text-sm mb-8">Владельцы {brandName} в России — советы, опыт, зарядки.</p>
      
      <div className="bg-white border border-line rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <h2 className="text-lg font-semibold text-ink-900 mb-2">Раздел в разработке</h2>
        <p className="text-sm text-muted mb-6">Зарегистрируйтесь и укажите марку в профиле — мы уведомим когда раздел откроется.</p>
        <a href="/register" className="inline-block px-6 py-3 bg-ink-900 text-white rounded-xl text-sm font-semibold no-underline hover:bg-ink-700 transition-colors">
          Зарегистрироваться
        </a>
      </div>
    </div>
  );
}

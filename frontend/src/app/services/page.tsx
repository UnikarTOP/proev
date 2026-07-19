import { apiGet, type ServiceProvider } from '@/lib/api';

export const metadata = {
  title: 'Сервисы для электромобилей — СТО, зарядки, страхование | proev.ru',
};

export default async function ServicesPage() {
  let providers: ServiceProvider[] = [];
  try {
    providers = await apiGet<ServiceProvider[]>('/service-providers');
  } catch {
    providers = [];
  }

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-10">
      <h1 className="text-[26px] font-bold text-ink-900 tracking-tight mb-2">Каталог сервисов для электромобилей</h1>
      <p className="text-muted mb-6">
        СТО, установка домашних зарядных станций, страхование и другие проверенные сервисы.
      </p>

      {providers.length === 0 ? (
        <p className="text-sm text-muted">
          Пока нет партнёров в каталоге — подключите бэкенд и добавьте первых партнёров вручную.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({ provider }: { provider: ServiceProvider }) {
  return (
    <div className="bg-white border border-line rounded-xl p-6">
      <span className="font-mono text-[11px] uppercase tracking-wider text-volt-600">{provider.category?.name}</span>
      <h3 className="text-lg font-semibold text-ink-900 mt-2 mb-2.5">{provider.name}</h3>
      <p className="text-sm text-muted mb-5">{provider.description}</p>
      <button className="w-full bg-ink-900 text-white py-2.5 rounded-[10px] text-sm font-semibold">
        Оставить заявку
      </button>
    </div>
  );
}

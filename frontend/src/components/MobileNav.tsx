'use client';

import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', icon: 'ti-home', label: 'Главная', exact: true },
  { href: '/news', icon: 'ti-news', label: 'Новости' },
  { href: '/charge-map', icon: 'ti-bolt', label: 'Зарядки', center: true },
  { href: '/services', icon: 'ti-tools', label: 'Сервисы' },
  { href: '/partner', icon: 'ti-briefcase', label: 'Партнёрам' },
];

export default function MobileNav() {
  const pathname = usePathname();

  // Скрываем на страницах кабинета и сброса пароля
  if (
    pathname.startsWith('/partner/cabinet') ||
    pathname.startsWith('/partner/reset-password')
  ) return null;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Отступ снизу чтобы контент не прятался за навигацией */}
      <div className="h-20 md:hidden" aria-hidden="true" />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--surface-2)',
          borderTop: '0.5px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Мобильная навигация"
      >
        <div className="grid grid-cols-5 items-end">
          {TABS.map(tab => {
            const active = isActive(tab.href, tab.exact);

            if (tab.center) {
              return (
                <a
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  className="flex flex-col items-center pb-2 pt-1"
                >
                  <div
                    className="flex items-center justify-center rounded-full -translate-y-4"
                    style={{
                      width: 52, height: 52,
                      background: active ? '#0BA5CC' : '#0B1220',
                      boxShadow: '0 4px 16px rgba(11,165,204,0.35)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <i className="ti ti-bolt text-white" style={{ fontSize: 24 }} aria-hidden="true" />
                  </div>
                  <span
                    className="text-[10px] font-semibold -mt-3"
                    style={{ color: active ? '#0BA5CC' : 'var(--text-muted)' }}
                  >
                    {tab.label}
                  </span>
                </a>
              );
            }

            return (
              <a
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center gap-0.5 py-2 px-1"
                style={{ color: active ? '#0BA5CC' : 'var(--text-muted)', transition: 'color 0.15s' }}
                aria-current={active ? 'page' : undefined}
              >
                <i className={`ti ${tab.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
                {active && (
                  <div
                    className="absolute bottom-0 rounded-full"
                    style={{ width: 4, height: 4, background: '#0BA5CC', marginBottom: 1 }}
                  />
                )}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}

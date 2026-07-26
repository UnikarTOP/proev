'use client';

import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/',           label: 'Главная',   icon: '🏠', ti: 'ti-home' },
  { href: '/news',       label: 'Новости',   icon: '📰', ti: 'ti-news' },
  { href: '/charge-map', label: 'Зарядки',   icon: '⚡', ti: 'ti-bolt',       center: true },
  { href: '/services',   label: 'Сервисы',   icon: '🔧', ti: 'ti-tools' },
  { href: '/partner',    label: 'Партнёрам', icon: '💼', ti: 'ti-briefcase' },
];

export default function MobileNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith('/partner/cabinet') ||
    pathname.startsWith('/partner/reset-password')
  ) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      {/* Отступ чтобы контент не прятался за панелью */}
      <div style={{ height: 72 }} className="md:hidden" aria-hidden="true" />

      <nav
        className="md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#fff',
          borderTop: '0.5px solid #DCE1E8',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
        aria-label="Навигация"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'end', height: 56 }}>
          {TABS.map(tab => {
            const active = isActive(tab.href);

            if (tab.center) {
              return (
                <a
                  key={tab.href}
                  href={tab.href}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 4 }}
                  aria-label={tab.label}
                >
                  {/* FAB кнопка приподнята */}
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: active ? '#0BA5CC' : '#0B1220',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: -20,
                    border: '3px solid #fff',
                    fontSize: 22,
                    lineHeight: 1,
                  }}>
                    ⚡
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, marginTop: 2,
                    color: active ? '#0BA5CC' : '#6B7686',
                  }}>
                    {tab.label}
                  </span>
                </a>
              );
            }

            return (
              <a
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: 2, height: '100%',
                  color: active ? '#0BA5CC' : '#6B7686',
                  textDecoration: 'none',
                  position: 'relative',
                }}
                aria-current={active ? 'page' : undefined}
              >
                {/* Активный индикатор сверху */}
                {active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2, borderRadius: 1, background: '#0BA5CC',
                  }} />
                )}
                <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{tab.label}</span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}

// Фирменный визуальный мотив: линия-маршрут с узлами станций.
// В хиро — с подписями городов (variant="hero"), между секциями — как тонкий разделитель (variant="divider").

export function RouteStrip({ variant = 'divider' }: { variant?: 'hero' | 'divider' }) {
  if (variant === 'hero') {
    return (
      <svg viewBox="0 0 1000 64" preserveAspectRatio="none" className="w-full h-16 mb-10">
        <line x1="10" y1="32" x2="990" y2="32" stroke="#243352" strokeWidth="2" />
        <circle cx="10" cy="32" r="5" fill="#3DDBFF" />
        <circle cx="230" cy="32" r="4" fill="#8A96AC" />
        <circle cx="430" cy="32" r="4" fill="#8A96AC" />
        <circle cx="620" cy="32" r="4" fill="#FFB020" />
        <circle cx="790" cy="32" r="4" fill="#8A96AC" />
        <circle cx="990" cy="32" r="5" fill="#3DDBFF" />
        <text x="10" y="54" fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="0.08em" fill="#8A96AC" textAnchor="start">МОСКВА</text>
        <text x="620" y="54" fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="0.08em" fill="#8A96AC" textAnchor="middle">6100 КМ</text>
        <text x="990" y="54" fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="0.08em" fill="#8A96AC" textAnchor="end">ВЛАДИВОСТОК</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 1120 20" preserveAspectRatio="none" className="w-full h-5">
      <line x1="0" y1="10" x2="1120" y2="10" stroke="#DCE1E8" strokeWidth="1" />
      <circle cx="0" cy="10" r="3" fill="#B4B2A9" />
      <circle cx="373" cy="10" r="3" fill="#B4B2A9" />
      <circle cx="746" cy="10" r="3" fill="#B4B2A9" />
      <circle cx="1120" cy="10" r="3" fill="#B4B2A9" />
    </svg>
  );
}

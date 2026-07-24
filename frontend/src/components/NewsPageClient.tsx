'use client';

import { useEffect, useState, useCallback } from 'react';

interface NewsItem {
  id: string;
  title: string;
  excerpt?: string;
  sourceUrl: string;
  sourceName: string;
  imageUrl?: string;
  publishedAt?: string;
}

const CATEGORIES = [
  { label: 'Все', keywords: [] as string[] },
  {
    label: 'Зарядки',
    keywords: ['зарядк', 'зарядн', 'станц', 'зарядить', 'charging', 'charge', 'розетк', 'кабель', 'коннектор', 'ccs', 'chademo', 'type2'],
  },
  {
    label: 'Рынок',
    keywords: ['продаж', 'рынок', 'цен', 'импорт', 'бестселлер', 'продал', 'реализац', 'спрос', 'покупк', 'стоимост', 'купить', 'продукц'],
  },
  {
    label: 'Технологии',
    keywords: ['аккумулятор', 'батарея', 'технолог', 'дальност', 'запас хода', 'ёмкост', 'зарядка быстр', 'твердотельн', 'инновац', 'разработк'],
  },
  {
    label: 'Законодательство',
    keywords: ['льгот', 'налог', 'закон', 'правительств', 'субсид', 'регулир', 'минтранс', 'госдума', 'постановлен', 'требован', 'правил'],
  },
];

const PAGE_SIZE = 10;

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч. назад`;
  if (diff < 172800) return 'вчера';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function matchesCategory(item: NewsItem, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const text = `${item.title} ${item.excerpt ?? ''}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function getPlaceholder(title: string): { bg: string; color: string; icon: string } {
  const t = title.toLowerCase();
  if (t.includes('зарядк') || t.includes('станц') || t.includes('розетк') || t.includes('charging'))
    return { bg: '#E6F1FB', color: '#185FA5', icon: 'ti-plug' };
  if (t.includes('продаж') || t.includes('рынок') || t.includes('цен') || t.includes('импорт'))
    return { bg: '#FAEEDA', color: '#854F0B', icon: 'ti-report-money' };
  if (t.includes('закон') || t.includes('налог') || t.includes('правительств') || t.includes('льгот'))
    return { bg: '#EAF3DE', color: '#3B6D11', icon: 'ti-file-description' };
  if (t.includes('батарея') || t.includes('аккумул') || t.includes('технолог'))
    return { bg: '#E1F5EE', color: '#0F6E56', icon: 'ti-battery-charging' };
  if (t.includes('трасс') || t.includes('дорог') || t.includes('маршрут'))
    return { bg: '#EEEDFE', color: '#534AB7', icon: 'ti-map-pin' };
  if (t.includes('tesla') || t.includes('byd') || t.includes('zeekr') || t.includes('electr'))
    return { bg: '#FBEAF0', color: '#993556', icon: 'ti-car' };
  return { bg: '#F1EFE8', color: '#5F5E5A', icon: 'ti-bolt' };
}

function NewsCardImage({ imageUrl, title }: { imageUrl?: string; title: string }) {
  const ph = getPlaceholder(title);
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <div className="h-40 overflow-hidden bg-paper-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="h-40 flex items-center justify-center" style={{ background: ph.bg }}>
      <i className={`ti ${ph.icon} text-5xl`} style={{ color: ph.color, opacity: 0.35 }} aria-hidden="true" />
    </div>
  );
}

export default function NewsPageClient() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${api}/news?limit=100`)
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCategory = useCallback((idx: number) => {
    setCategoryIdx(idx);
    setPage(1); // сбрасываем страницу при смене категории
  }, []);

  const filtered = news.filter((item) =>
    matchesCategory(item, CATEGORIES[categoryIdx].keywords),
  );

  const totalPages = Math.ceil(Math.max(0, filtered.length - 2) / PAGE_SIZE);
  const featured = filtered.slice(0, 2);
  // Пагинация применяется только к списку (не к featured карточкам)
  const restAll = filtered.slice(2);
  const rest = restAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((i) => <div key={i} className="bg-paper-50 rounded-xl h-64 border border-line" />)}
      </div>
      <div className="space-y-2 mt-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="bg-paper-50 rounded-xl h-16 border border-line" />)}
      </div>
    </div>
  );

  return (
    <div>
      {/* Фильтры-таблетки */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat, i) => {
          const count = i === 0
            ? news.length
            : news.filter((item) => matchesCategory(item, cat.keywords)).length;
          return (
            <button
              key={cat.label}
              onClick={() => handleCategory(i)}
              className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-150 flex items-center gap-1.5 ${
                categoryIdx === i
                  ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                  : 'border-line text-muted hover:border-graphite-900/30 hover:text-graphite-900'
              }`}
            >
              {cat.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                categoryIdx === i ? 'bg-volt-600/20 text-volt-600' : 'bg-line text-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3 opacity-30">
            <i className="ti ti-news-off" aria-hidden="true" />
          </div>
          <p className="text-muted text-sm">Новостей по этой теме пока нет — загляните позже.</p>
          <button
            onClick={() => handleCategory(0)}
            className="mt-4 text-sm text-volt-600 underline underline-offset-2"
          >
            Показать все новости
          </button>
        </div>
      ) : (
        <>
          {/* 2 главные карточки */}
          {featured.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">Свежее</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {featured.map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors"
                  >
                    <NewsCardImage imageUrl={item.imageUrl} title={item.title} />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-2 py-0.5 rounded-full">
                          {item.sourceName}
                        </span>
                        <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink-900 leading-snug mb-2 line-clamp-3 group-hover:text-volt-600 transition-colors">
                        {item.title}
                      </p>
                      {item.excerpt && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{item.excerpt}</p>
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-line flex justify-between items-center">
                      <span className="text-xs text-volt-600 flex items-center gap-1">
                        Читать <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] text-muted">{item.sourceName}</span>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Список с пагинацией */}
          {rest.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-widest">Ещё новости</p>
                {totalPages > 1 && (
                  <span className="text-[11px] text-muted">
                    стр. {page} / {totalPages}
                  </span>
                )}
              </div>
              <div className="border border-line rounded-xl overflow-hidden bg-white">
                {rest.map((item, idx) => {
                  const ph = getPlaceholder(item.title);
                  return (
                    <a
                      key={item.id}
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex gap-3 p-3.5 hover:bg-paper-50 transition-colors ${
                        idx < rest.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ph.bg }}
                      >
                        <i className={`ti ${ph.icon} text-xl`} style={{ color: ph.color, opacity: 0.6 }} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-1.5 py-0.5 rounded-full">
                            {item.sourceName}
                          </span>
                          <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                        </div>
                        <p className="text-sm font-medium text-ink-900 leading-snug line-clamp-2">{item.title}</p>
                        {item.excerpt && (
                          <p className="text-xs text-muted line-clamp-1 mt-0.5">{item.excerpt}</p>
                        )}
                      </div>
                      <i className="ti ti-chevron-right text-muted text-base shrink-0 my-auto" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-graphite-900/30 hover:text-graphite-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ti ti-chevron-left text-sm" aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-8 h-8 rounded-lg border text-sm transition-colors ${
                        p === page
                          ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                          : 'border-line text-muted hover:border-graphite-900/30 hover:text-graphite-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-graphite-900/30 hover:text-graphite-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ti ti-chevron-right text-sm" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

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
  { label: 'Зарядки', keywords: ['зарядк', 'зарядн', 'станц', 'зарядить', 'charging', 'розетк', 'кабель', 'коннектор', 'ccs', 'chademo'] },
  { label: 'Рынок', keywords: ['продаж', 'рынок', 'цен', 'импорт', 'бестселлер', 'продал', 'реализац', 'спрос', 'купить', 'стоимост'] },
  { label: 'Технологии', keywords: ['аккумулятор', 'батарея', 'технолог', 'дальност', 'запас хода', 'ёмкост', 'твердотельн', 'инновац'] },
  { label: 'Законодательство', keywords: ['льгот', 'налог', 'закон', 'правительств', 'субсид', 'регулир', 'минтранс', 'госдума', 'постановлен'] },
];

const PAGE_SIZE = 10;

// ── Утилиты ────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч. назад`;
  if (diff < 172800) return 'вчера';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function isHot(dateStr?: string): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 3 * 3600 * 1000; // < 3 часов
}

function isNew(dateStr?: string): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 24 * 3600 * 1000; // < 24 часов
}

function readTime(text?: string): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `~${mins} мин`;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getFaviconUrl(sourceUrl: string): string {
  const domain = getDomain(sourceUrl);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

function matchesCategory(item: NewsItem, keywords: string[]): boolean {
  if (!keywords.length) return true;
  const text = `${item.title} ${item.excerpt ?? ''}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function matchesSearch(item: NewsItem, q: string): boolean {
  if (!q.trim()) return true;
  const text = `${item.title} ${item.excerpt ?? ''} ${item.sourceName}`.toLowerCase();
  return q.toLowerCase().split(' ').every((word) => text.includes(word));
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
  if (t.includes('tesla') || t.includes('byd') || t.includes('zeekr'))
    return { bg: '#FBEAF0', color: '#993556', icon: 'ti-car' };
  return { bg: '#F1EFE8', color: '#5F5E5A', icon: 'ti-bolt' };
}

// ── Подкомпоненты ───────────────────────────────────────────────────────────

function NewsCardImage({ imageUrl, title }: { imageUrl?: string; title: string }) {
  const ph = getPlaceholder(title);
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <div className="h-40 overflow-hidden bg-paper-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" aria-hidden="true"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="h-40 flex items-center justify-center" style={{ background: ph.bg }}>
      <i className={`ti ${ph.icon} text-5xl`} style={{ color: ph.color, opacity: 0.35 }} aria-hidden="true" />
    </div>
  );
}

function SourceBadge({ item }: { item: NewsItem }) {
  const [faviconOk, setFaviconOk] = useState(true);
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-volt-600 bg-volt-600/10 px-1.5 py-0.5 rounded-full">
      {faviconOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={getFaviconUrl(item.sourceUrl)} alt="" width={12} height={12}
          className="rounded-sm" onError={() => setFaviconOk(false)} />
      )}
      {item.sourceName}
    </span>
  );
}

function HotBadge({ date }: { date?: string }) {
  if (isHot(date)) return (
    <span className="text-[10px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full animate-pulse">
      НОВОЕ
    </span>
  );
  if (isNew(date)) return (
    <span className="text-[10px] font-semibold" style={{ color: '#1D9E75' }}>● сегодня</span>
  );
  return null;
}

function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const share = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  }, [url, title]);

  return (
    <button
      onClick={share}
      title="Поделиться"
      className="flex items-center gap-1 text-[11px] text-muted hover:text-volt-600 transition-colors px-2 py-1 rounded-lg hover:bg-volt-600/5"
    >
      <i className={`ti ${copied ? 'ti-check' : 'ti-share'} text-sm`} aria-hidden="true" />
      {copied ? 'Скопировано' : 'Поделиться'}
    </button>
  );
}

// ── Главный компонент ───────────────────────────────────────────────────────

export default function NewsPageClient() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    fetch(`${api}/news?limit=100`)
      .then((r) => r.json())
      .then((data) => { setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCategory = useCallback((idx: number) => {
    setCategoryIdx(idx);
    setPage(1);
    setSearch('');
  }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
    if (q) setCategoryIdx(0); // при поиске сбрасываем категорию
  }, []);

  const filtered = news
    .filter((item) => matchesCategory(item, CATEGORIES[categoryIdx].keywords))
    .filter((item) => matchesSearch(item, search));

  const totalPages = Math.ceil(Math.max(0, filtered.length - 2) / PAGE_SIZE);
  const featured = filtered.slice(0, 2);
  const restAll = filtered.slice(2);
  const rest = restAll.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-paper-50 rounded-xl border border-line mb-4" />
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
      {/* Поиск */}
      <div className="relative mb-4">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-muted text-base" aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Поиск по новостям..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-line rounded-xl bg-white focus:outline-none focus:border-volt-600 transition-colors"
        />
        {search && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink-900"
          >
            <i className="ti ti-x text-sm" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Фильтры */}
      {!search && (
        <div className="flex gap-2 flex-wrap mb-6">
          {CATEGORIES.map((cat, i) => {
            const count = i === 0
              ? news.length
              : news.filter((item) => matchesCategory(item, cat.keywords)).length;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategory(i)}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-all duration-150 flex items-center gap-1.5 ${
                  categoryIdx === i
                    ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold'
                    : 'border-line text-muted hover:border-graphite-900/30 hover:text-graphite-900'
                }`}
              >
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  categoryIdx === i ? 'bg-volt-600/20 text-volt-600' : 'bg-paper-50 text-muted'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Результат поиска */}
      {search && (
        <p className="text-sm text-muted mb-4">
          {filtered.length > 0
            ? <>Найдено <span className="font-semibold text-ink-900">{filtered.length}</span> новостей по запросу «{search}»</>
            : <>Ничего не найдено по запросу «{search}»</>
          }
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-3 opacity-20">
            <i className="ti ti-news-off" aria-hidden="true" />
          </div>
          <p className="text-muted text-sm mb-4">
            {search ? `Ничего не найдено по запросу «${search}»` : 'Новостей по этой теме пока нет'}
          </p>
          <button
            onClick={() => { handleCategory(0); setSearch(''); }}
            className="text-sm text-volt-600 underline underline-offset-2"
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
                  <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="group block bg-white border border-line rounded-xl overflow-hidden hover:border-graphite-900/30 transition-colors"
                  >
                    <NewsCardImage imageUrl={item.imageUrl} title={item.title} />
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <SourceBadge item={item} />
                        <HotBadge date={item.publishedAt} />
                        <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                        {item.excerpt && (
                          <span className="text-[11px] text-muted ml-auto flex items-center gap-0.5">
                            <i className="ti ti-clock text-xs" aria-hidden="true" />
                            {readTime(item.excerpt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-ink-900 leading-snug mb-2 line-clamp-3 group-hover:text-volt-600 transition-colors">
                        {item.title}
                      </p>
                      {item.excerpt && (
                        <p className="text-xs text-muted leading-relaxed line-clamp-2">{item.excerpt}</p>
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-line flex justify-between items-center">
                      <span className="text-xs text-volt-600 flex items-center gap-1">
                        Читать <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
                      </span>
                      <ShareButton url={item.sourceUrl} title={item.title} />
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
                  <span className="text-[11px] text-muted">стр. {page} / {totalPages}</span>
                )}
              </div>
              <div className="border border-line rounded-xl overflow-hidden bg-white">
                {rest.map((item, idx) => {
                  const ph = getPlaceholder(item.title);
                  return (
                    <a key={item.id} href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className={`flex gap-3 p-3.5 hover:bg-paper-50 transition-colors group ${idx < rest.length - 1 ? 'border-b border-line' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ph.bg }}>
                        <i className={`ti ${ph.icon} text-xl`} style={{ color: ph.color, opacity: 0.6 }} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <SourceBadge item={item} />
                          <HotBadge date={item.publishedAt} />
                          <span className="text-[11px] text-muted">{timeAgo(item.publishedAt)}</span>
                          {item.excerpt && (
                            <span className="text-[11px] text-muted ml-auto flex items-center gap-0.5">
                              <i className="ti ti-clock text-xs" aria-hidden="true" />
                              {readTime(item.excerpt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-ink-900 leading-snug line-clamp-2 group-hover:text-volt-600 transition-colors">
                          {item.title}
                        </p>
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
                    className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-graphite-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ti ti-chevron-left text-sm" aria-hidden="true" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className={`w-8 h-8 rounded-lg border text-sm transition-colors ${
                        p === page ? 'border-volt-600 bg-volt-600/10 text-volt-600 font-semibold' : 'border-line text-muted hover:border-graphite-900/30'
                      }`}
                    >{p}</button>
                  ))}
                  <button
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === totalPages}
                    className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-muted hover:border-graphite-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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

'use client';

import { useState, useEffect, useCallback } from 'react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'converted' | 'rejected';

interface LeadHistory {
  id: string;
  fromStatus?: LeadStatus;
  toStatus: LeadStatus;
  note?: string;
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  message?: string;
  status: LeadStatus;
  partnerNote?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
  history: LeadHistory[];
}

interface FunnelStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  conversion: number;
  avgDays: number;
  newThisWeek: number;
}

// ── Конфигурация воронки ─────────────────────────────────────────────────────

const STAGES: { key: LeadStatus; label: string; color: string; bg: string; icon: string }[] = [
  { key: 'new',       label: 'Новая',        color: '#185FA5', bg: '#E6F1FB', icon: 'ti-mail' },
  { key: 'contacted', label: 'Связались',    color: '#633806', bg: '#FAEEDA', icon: 'ti-phone' },
  { key: 'qualified', label: 'Квалификация', color: '#3C3489', bg: '#EEEDFE', icon: 'ti-user-check' },
  { key: 'proposal',  label: 'Предложение',  color: '#085041', bg: '#E1F5EE', icon: 'ti-file-text' },
  { key: 'converted', label: 'Клиент',       color: '#0F6E56', bg: '#E1F5EE', icon: 'ti-circle-check' },
  { key: 'rejected',  label: 'Отказ',        color: '#5F5E5A', bg: '#F1EFE8', icon: 'ti-x' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return `${Math.round(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч назад`;
  if (diff < 172800) return 'вчера';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ── Компонент метрик воронки ──────────────────────────────────────────────────

function FunnelMetrics({ stats, leads }: { stats: FunnelStats; leads: Lead[] }) {
  const total = stats.total || 0;

  return (
    <div className="space-y-4 mb-5">
      {/* Ключевые метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { val: total, label: 'Всего заявок', icon: 'ti-mail', color: '#185FA5', bg: '#E6F1FB' },
          { val: `${stats.conversion}%`, label: 'Конверсия', icon: 'ti-chart-line', color: '#0F6E56', bg: '#E1F5EE' },
          { val: stats.byStatus.converted || 0, label: 'Стали клиентами', icon: 'ti-circle-check', color: '#0F6E56', bg: '#E1F5EE' },
          { val: stats.avgDays > 0 ? `${stats.avgDays}д` : '—', label: 'Среднее время', icon: 'ti-clock', color: '#633806', bg: '#FAEEDA' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: m.bg }}>
                <i className={`ti ${m.icon} text-sm`} style={{ color: m.color }} aria-hidden="true" />
              </div>
              <span className="text-xs text-muted">{m.label}</span>
            </div>
            <div className="text-2xl font-semibold text-ink-900 font-mono">{m.val}</div>
          </div>
        ))}
      </div>

      {/* Воронка-бары */}
      <div className="bg-white border border-line rounded-xl p-4">
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Воронка продаж</h3>
        <div className="space-y-2">
          {STAGES.filter(s => s.key !== 'rejected').map((stage, i) => {
            const count = stats.byStatus[stage.key] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={stage.key} className="flex items-center gap-3">
                <div className="w-24 text-xs text-muted shrink-0">{stage.label}</div>
                <div className="flex-1 h-5 bg-paper-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full flex items-center pl-2 transition-all duration-500"
                    style={{ width: `${Math.max(pct, pct > 0 ? 8 : 0)}%`, background: stage.color }}
                  />
                </div>
                <div className="w-14 text-right shrink-0">
                  <span className="text-sm font-semibold text-ink-900">{count}</span>
                  <span className="text-xs text-muted ml-1">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
        {stats.byStatus.rejected > 0 && (
          <p className="text-xs text-muted mt-3 flex items-center gap-1">
            <i className="ti ti-info-circle text-xs" aria-hidden="true" />
            Отказов: {stats.byStatus.rejected} ({total > 0 ? Math.round(stats.byStatus.rejected / total * 100) : 0}%)
          </p>
        )}
      </div>
    </div>
  );
}

// ── Карточка лида ──────────────────────────────────────────────────────────────

function LeadDetail({ lead, onStatusChange, onNoteChange, onClose }: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus, note?: string) => void;
  onNoteChange: (id: string, note: string, followUp?: string) => void;
  onClose?: () => void;
}) {
  const [note, setNote] = useState(lead.partnerNote || '');
  const [followUp, setFollowUp] = useState(
    lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().slice(0, 10) : ''
  );
  const [statusNote, setStatusNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const stage = STAGE_MAP[lead.status];

  const handleStatusChange = (newStatus: LeadStatus) => {
    if (newStatus === lead.status) return;
    onStatusChange(lead.id, newStatus, statusNote || undefined);
    setStatusNote('');
  };

  const saveNote = async () => {
    setSavingNote(true);
    await onNoteChange(lead.id, note, followUp || undefined);
    setSavingNote(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Шапка */}
      <div className="flex items-start justify-between p-4 border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: stage.bg, color: stage.color }}>
            {initials(lead.name)}
          </div>
          <div>
            <div className="font-semibold text-ink-900 text-sm">{lead.name}</div>
            <a href={`tel:${lead.phone}`} className="text-xs text-volt-600 hover:underline">{lead.phone}</a>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-ink-900 transition-colors">
            <i className="ti ti-x text-base" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Запрос клиента */}
        {lead.message && (
          <div className="bg-paper-50 rounded-xl p-3">
            <p className="text-xs font-medium text-muted mb-1">Запрос клиента</p>
            <p className="text-sm text-ink-900 leading-relaxed">{lead.message}</p>
          </div>
        )}

        {/* Переключение стадии */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Стадия воронки</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => handleStatusChange(s.key)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all border ${
                  lead.status === s.key
                    ? 'border-transparent'
                    : 'border-line hover:border-graphite-900/20 text-muted'
                }`}
                style={lead.status === s.key ? { background: s.bg, color: s.color, borderColor: s.color + '40' } : {}}
              >
                <i className={`ti ${s.icon} text-xs mr-1`} aria-hidden="true" />
                {s.label}
              </button>
            ))}
          </div>
          <input
            value={statusNote}
            onChange={e => setStatusNote(e.target.value)}
            placeholder="Комментарий к изменению (необязательно)"
            className="w-full text-xs border border-line rounded-lg px-3 py-2 focus:outline-none focus:border-volt-600"
          />
        </div>

        {/* Заметка партнёра */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Заметка</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder="Договорились на среду в 11:00, приедет на Zeekr 001..."
            className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 resize-none"
          />
        </div>

        {/* Следующий контакт */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            <i className="ti ti-calendar text-xs mr-1" aria-hidden="true" />
            Следующий контакт
          </p>
          <input
            type="date"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            className="w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600"
          />
        </div>

        <button
          onClick={saveNote}
          disabled={savingNote}
          className="w-full py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {savingNote && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />}
          Сохранить
        </button>

        {/* История изменений */}
        {lead.history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">История</p>
            <div className="space-y-2">
              {[...lead.history].reverse().map(h => {
                const toStage = STAGE_MAP[h.toStatus];
                const fromStage = h.fromStatus ? STAGE_MAP[h.fromStatus] : null;
                return (
                  <div key={h.id} className="flex gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: toStage?.color }} />
                    <div className="flex-1">
                      <span className="text-ink-900 font-medium">
                        {fromStage ? `${fromStage.label} → ` : ''}{toStage?.label}
                      </span>
                      {h.note && <span className="text-muted"> · {h.note}</span>}
                      <div className="text-muted mt-0.5">{timeAgo(h.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-2.5 text-xs">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-gray-300" />
                <div><span className="text-muted">Заявка создана · {timeAgo(lead.createdAt)}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Главный компонент CRM ─────────────────────────────────────────────────────

export default function CrmLeads({ providerId, token }: { providerId: string; token: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL || '/api';

  const load = useCallback(async () => {
    const [leadsRes, statsRes] = await Promise.all([
      fetch(`${API}/leads/provider/${providerId}`).then(r => r.json()),
      fetch(`${API}/leads/provider/${providerId}/funnel`).then(r => r.json()),
    ]);
    setLeads(leadsRes);
    setStats(statsRes);
    setLoading(false);
  }, [providerId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: LeadStatus, note?: string) => {
    const res = await fetch(`${API}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Partner-Token': token },
      body: JSON.stringify({ status, note }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads(ls => ls.map(l => l.id === id ? updated : l));
      if (selectedLead?.id === id) setSelectedLead(updated);
      // Обновляем статистику
      const s = await fetch(`${API}/leads/provider/${providerId}/funnel`).then(r => r.json());
      setStats(s);
    }
  };

  const handleNoteChange = async (id: string, note: string, followUp?: string) => {
    const res = await fetch(`${API}/leads/${id}/note`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Partner-Token': token },
      body: JSON.stringify({ partnerNote: note, nextFollowUp: followUp }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLeads(ls => ls.map(l => l.id === id ? updated : l));
      if (selectedLead?.id === id) setSelectedLead(updated);
    }
  };

  const filtered = leads.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase()) &&
        !l.phone.includes(search) && !(l.message || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Сортировка: сначала с nextFollowUp сегодня, потом новые
  const sorted = [...filtered].sort((a, b) => {
    const today = new Date().toDateString();
    const aToday = a.nextFollowUp && new Date(a.nextFollowUp).toDateString() === today;
    const bToday = b.nextFollowUp && new Date(b.nextFollowUp).toDateString() === today;
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-muted text-sm gap-2">
      <i className="ti ti-loader-2 animate-spin" aria-hidden="true" /> Загружаем CRM...
    </div>
  );

  return (
    <div>
      {/* Метрики воронки */}
      {stats && <FunnelMetrics stats={stats} leads={leads} />}

      {/* Фильтры */}
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm" aria-hidden="true" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-volt-600"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors whitespace-nowrap ${
              filterStatus === 'all' ? 'border-ink-900 bg-ink-900 text-white' : 'border-line text-muted hover:border-ink-900/30'
            }`}
          >
            Все ({leads.length})
          </button>
          {STAGES.map(s => {
            const count = leads.filter(l => l.status === s.key).length;
            if (count === 0 && s.key !== 'new') return null;
            return (
              <button
                key={s.key}
                onClick={() => setFilterStatus(s.key)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all whitespace-nowrap ${
                  filterStatus === s.key ? 'border-transparent' : 'border-line text-muted hover:border-ink-900/30'
                }`}
                style={filterStatus === s.key ? { background: s.bg, color: s.color, borderColor: s.color + '30' } : {}}
              >
                {s.label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Основной контент: список + детальная карточка */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Список лидов */}
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {sorted.length === 0 ? (
            <div className="py-12 text-center">
              <i className="ti ti-inbox text-3xl text-muted/30 block mb-2" aria-hidden="true" />
              <p className="text-sm text-muted">
                {search || filterStatus !== 'all' ? 'Нет заявок по фильтру' : 'Заявок пока нет'}
              </p>
            </div>
          ) : sorted.map((lead, idx) => {
            const stage = STAGE_MAP[lead.status];
            const isSelected = selectedLead?.id === lead.id;
            const isFollowUpToday = lead.nextFollowUp &&
              new Date(lead.nextFollowUp).toDateString() === new Date().toDateString();

            return (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(isSelected ? null : lead)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  idx < sorted.length - 1 ? 'border-b border-line' : ''
                } ${isSelected ? 'bg-volt-600/5' : 'hover:bg-paper-50'}`}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ background: stage.bg, color: stage.color }}>
                  {initials(lead.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-ink-900 truncate">{lead.name}</span>
                    {isFollowUpToday && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full shrink-0">
                        Контакт сегодня
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {lead.message || lead.phone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: stage.bg, color: stage.color }}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-muted">{timeAgo(lead.createdAt)}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Детальная карточка */}
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {selectedLead ? (
            <LeadDetail
              lead={selectedLead}
              onStatusChange={handleStatusChange}
              onNoteChange={handleNoteChange}
              onClose={() => setSelectedLead(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
              <i className="ti ti-hand-click text-3xl text-muted/30 block mb-3" aria-hidden="true" />
              <p className="text-sm text-muted">Выберите заявку слева</p>
              <p className="text-xs text-muted mt-1">чтобы изменить статус и добавить заметку</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

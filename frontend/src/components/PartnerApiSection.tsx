'use client';
import { useState, useEffect, useCallback } from 'react';

interface Webhook { id: string; url: string; events: string[]; isActive: boolean; lastError?: string; lastTriggeredAt?: string; }
interface ApiKey { id: string; name: string; key: string; scopes: string[]; isActive: boolean; lastUsedAt?: string; }

const EVENTS = ['lead.created','lead.status_changed','review.created','provider.published'];
const SCOPES = ['leads:read','leads:write','provider:read','reviews:read'];

export default function PartnerApiSection({ token }: { token: string }) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [tab, setTab] = useState<'webhooks'|'keys'|'docs'>('keys');

  // Форма вебхука
  const [whUrl, setWhUrl] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['lead.created']);
  const [createdSecret, setCreatedSecret] = useState('');

  // Форма API-ключа
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>(['leads:read']);
  const [createdKey, setCreatedKey] = useState('');

  const [loading, setLoading] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || '/api';
  const H = { 'X-Partner-Token': token, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    const [wh, k] = await Promise.all([
      fetch(`${API}/public-api/webhooks`, { headers: H }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/public-api/keys`, { headers: H }).then(r => r.ok ? r.json() : []),
    ]);
    setWebhooks(wh);
    setKeys(k);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const createWebhook = async () => {
    if (!whUrl) return;
    setLoading(true);
    const res = await fetch(`${API}/public-api/webhooks`, { method:'POST', headers: H, body: JSON.stringify({ url: whUrl, events: whEvents }) });
    const data = await res.json();
    if (res.ok) { setCreatedSecret(data.secret); setWhUrl(''); await load(); }
    else alert(data.message);
    setLoading(false);
  };

  const deleteWebhook = async (id: string) => {
    await fetch(`${API}/public-api/webhooks/${id}`, { method:'DELETE', headers: H });
    await load();
  };

  const createKey = async () => {
    if (!keyName) return;
    setLoading(true);
    const res = await fetch(`${API}/public-api/keys`, { method:'POST', headers: H, body: JSON.stringify({ name: keyName, scopes: keyScopes }) });
    const data = await res.json();
    if (res.ok) { setCreatedKey(data.key); setKeyName(''); await load(); }
    else alert(data.message);
    setLoading(false);
  };

  const deleteKey = async (id: string) => {
    await fetch(`${API}/public-api/keys/${id}`, { method:'DELETE', headers: H });
    await load();
  };

  const inp = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 bg-white';
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '/api').replace('/api','');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink-900">API и интеграции</h1>
        <p className="text-sm text-muted mt-1">Подключите внешние сервисы — amoCRM, Bitrix24, Telegram-бот и другие</p>
      </div>

      {/* Табы */}
      <div className="flex gap-1 mb-6 border-b border-line">
        {(['keys','webhooks','docs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-volt-600 text-volt-600' : 'border-transparent text-muted hover:text-ink-900'}`}>
            {t === 'keys' ? '🔑 API-ключи' : t === 'webhooks' ? '🔗 Вебхуки' : '📄 Документация'}
          </button>
        ))}
      </div>

      {/* API-ключи */}
      {tab === 'keys' && (
        <div className="space-y-4">
          {createdKey && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">✓ Ключ создан — сохраните его, он показывается один раз</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-line rounded-lg px-3 py-2 font-mono break-all">{createdKey}</code>
                <button onClick={() => navigator.clipboard.writeText(createdKey)}
                  className="shrink-0 px-3 py-2 text-xs border border-line rounded-lg hover:bg-paper-50 transition-colors">
                  Копировать
                </button>
              </div>
              <button onClick={() => setCreatedKey('')} className="text-xs text-muted mt-2 hover:text-ink-900">Скрыть</button>
            </div>
          )}

          {/* Список ключей */}
          {keys.length > 0 && (
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {keys.map((k, i) => (
                <div key={k.id} className={`flex items-start gap-3 p-4 ${i < keys.length-1 ? 'border-b border-line' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-ink-900">{k.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${k.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {k.isActive ? 'Активен' : 'Отключён'}
                      </span>
                    </div>
                    <code className="text-xs text-muted font-mono">{k.key.slice(0,18)}…</code>
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {k.scopes.map(s => <span key={s} className="text-[10px] bg-paper-50 border border-line px-1.5 py-0.5 rounded text-muted">{s}</span>)}
                    </div>
                    {k.lastUsedAt && <p className="text-[11px] text-muted mt-1">Использован: {new Date(k.lastUsedAt).toLocaleDateString('ru-RU')}</p>}
                  </div>
                  <button onClick={() => deleteKey(k.id)} className="text-muted hover:text-red-500 transition-colors text-sm shrink-0">
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Создать ключ */}
          <div className="bg-white border border-line rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-4">Создать API-ключ</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">Название</label>
                <input value={keyName} onChange={e => setKeyName(e.target.value)}
                  placeholder="Мой amoCRM" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">Права доступа</label>
                <div className="space-y-2">
                  {SCOPES.map(s => (
                    <label key={s} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={keyScopes.includes(s)}
                        onChange={e => setKeyScopes(e.target.checked ? [...keyScopes, s] : keyScopes.filter(x => x !== s))}
                        className="rounded" />
                      <code className="text-xs text-ink-900">{s}</code>
                      <span className="text-xs text-muted">
                        {s === 'leads:read' ? '— читать заявки' : s === 'leads:write' ? '— создавать заявки' : s === 'provider:read' ? '— читать профиль' : '— читать отзывы'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={createKey} disabled={loading || !keyName || keyScopes.length === 0}
                className="w-full py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
                {loading ? 'Создаём...' : 'Создать ключ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Вебхуки */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          {createdSecret && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">✓ Вебхук создан — сохраните секрет для верификации подписи</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-white border border-line rounded-lg px-3 py-2 font-mono break-all">{createdSecret}</code>
                <button onClick={() => navigator.clipboard.writeText(createdSecret)}
                  className="shrink-0 px-3 py-2 text-xs border border-line rounded-lg hover:bg-paper-50">Копировать</button>
              </div>
              <button onClick={() => setCreatedSecret('')} className="text-xs text-muted mt-2 hover:text-ink-900">Скрыть</button>
            </div>
          )}

          {webhooks.length > 0 && (
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              {webhooks.map((wh, i) => (
                <div key={wh.id} className={`flex items-start gap-3 p-4 ${i < webhooks.length-1 ? 'border-b border-line' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-ink-900 truncate">{wh.url}</span>
                      {wh.lastError && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">Ошибка</span>}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {wh.events.map(e => <span key={e} className="text-[10px] bg-paper-50 border border-line px-1.5 py-0.5 rounded text-muted">{e}</span>)}
                    </div>
                    {wh.lastError && <p className="text-[11px] text-red-500 mt-1">{wh.lastError}</p>}
                    {wh.lastTriggeredAt && <p className="text-[11px] text-muted mt-1">Последний вызов: {new Date(wh.lastTriggeredAt).toLocaleString('ru-RU')}</p>}
                  </div>
                  <button onClick={() => deleteWebhook(wh.id)} className="text-muted hover:text-red-500 transition-colors shrink-0">🗑</button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-line rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ink-900 mb-4">Добавить вебхук</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-1.5">URL для получения событий</label>
                <input value={whUrl} onChange={e => setWhUrl(e.target.value)}
                  placeholder="https://yourapp.ru/webhook/proev" className={inp} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted uppercase tracking-wide block mb-2">События</label>
                <div className="space-y-2">
                  {EVENTS.map(e => (
                    <label key={e} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={whEvents.includes(e)}
                        onChange={ev => setWhEvents(ev.target.checked ? [...whEvents, e] : whEvents.filter(x => x !== e))} className="rounded" />
                      <code className="text-xs text-ink-900">{e}</code>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={createWebhook} disabled={loading || !whUrl || whEvents.length === 0}
                className="w-full py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50">
                {loading ? 'Создаём...' : 'Добавить вебхук'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Документация */}
      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-ink-900 rounded-xl p-5 text-white">
            <h3 className="font-semibold mb-1">Base URL</h3>
            <code className="text-sm font-mono" style={{ color: '#3DDBFF' }}>
              {baseUrl.includes('localhost') ? 'http://localhost:3001/api' : 'https://api.proev.ru/api'}/v1
            </code>
            <p className="text-xs mt-2" style={{ color: '#6B7686' }}>
              Заголовок авторизации: <code style={{ color: '#B7C0D1' }}>Authorization: Bearer pk_live_xxx</code>
            </p>
          </div>

          {[
            { method: 'GET', path: '/leads', scope: 'leads:read', desc: 'Получить список заявок', response: '{ data: Lead[], total: number }' },
            { method: 'POST', path: '/leads', scope: 'leads:write', desc: 'Создать заявку из внешнего сервиса', body: '{ name, phone, message?, service? }', response: '{ ok, leadId, status }' },
            { method: 'GET', path: '/provider', scope: 'provider:read', desc: 'Данные профиля партнёра', response: '{ data: Provider }' },
            { method: 'GET', path: '/reviews', scope: 'reviews:read', desc: 'Список отзывов', response: '{ data: Review[] }' },
          ].map(ep => (
            <div key={ep.path} className="bg-white border border-line rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${ep.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-ink-900">/api/v1{ep.path}</code>
                <span className="text-[10px] bg-paper-50 border border-line px-1.5 py-0.5 rounded text-muted ml-auto">{ep.scope}</span>
              </div>
              <p className="text-sm text-muted mb-2">{ep.desc}</p>
              {ep.body && <div className="mb-1"><span className="text-xs text-muted">Body: </span><code className="text-xs text-ink-900">{ep.body}</code></div>}
              <div><span className="text-xs text-muted">Response: </span><code className="text-xs text-ink-900">{ep.response}</code></div>
            </div>
          ))}

          <div className="bg-white border border-line rounded-xl p-4">
            <h3 className="text-sm font-semibold text-ink-900 mb-3">Верификация вебхука</h3>
            <p className="text-xs text-muted mb-3">Каждый запрос содержит заголовок <code className="text-ink-900">X-ProEV-Signature: sha256=&lt;hmac&gt;</code></p>
            <pre className="text-xs bg-paper-50 border border-line rounded-lg p-3 overflow-x-auto"><code>{`// Node.js пример верификации
const crypto = require('crypto');

function verify(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}

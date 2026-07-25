'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const TiptapEditor = dynamic(() => import('./TiptapEditor'), { ssr: false, loading: () => (
  <div className="h-64 border border-line rounded-xl bg-paper-50 flex items-center justify-center text-muted text-sm">
    Загружаем редактор...
  </div>
) });

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverUrl?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
}

function timeAgo(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 86400) return `${Math.round(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.round(diff / 86400)} дн назад`;
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function PartnerBlog({ token }: { token: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', excerpt: '', content: '', coverUrl: '', isPublished: false });
  const [uploadingCover, setUploadingCover] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || '/api';
  const authH = { 'X-Partner-Token': token, 'Content-Type': 'application/json' };

  const load = useCallback(async () => {
    const res = await fetch(`${API}/provider-blog/my`, { headers: { 'X-Partner-Token': token } });
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const startNew = () => {
    setEditing(null);
    setIsNew(true);
    setForm({ title: '', excerpt: '', content: '', coverUrl: '', isPublished: false });
  };

  const startEdit = (post: Post) => {
    setIsNew(false);
    setEditing(post);
    setForm({ title: post.title, excerpt: post.excerpt || '', content: post.content, coverUrl: post.coverUrl || '', isPublished: post.isPublished });
  };

  const cancel = () => { setEditing(null); setIsNew(false); };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const url = isNew ? `${API}/provider-blog/my` : `${API}/provider-blog/my/${editing!.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: authH, body: JSON.stringify(form) });
      if (res.ok) { await load(); cancel(); }
    } catch {}
    setSaving(false);
  };

  const togglePublish = async (post: Post) => {
    await fetch(`${API}/provider-blog/my/${post.id}`, {
      method: 'PATCH', headers: authH,
      body: JSON.stringify({ isPublished: !post.isPublished }),
    });
    await load();
  };

  const deletePost = async (id: string) => {
    if (!confirm('Удалить статью? Это действие нельзя отменить.')) return;
    setDeleting(id);
    await fetch(`${API}/provider-blog/my/${id}`, { method: 'DELETE', headers: { 'X-Partner-Token': token } });
    setPosts(ps => ps.filter(p => p.id !== id));
    if (editing?.id === id) cancel();
    setDeleting(null);
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/upload/photo`, { method: 'POST', headers: { 'X-Partner-Token': token }, body: fd });
      const data = await res.json();
      if (data.url) setForm(f => ({ ...f, coverUrl: data.url }));
    } catch {}
    setUploadingCover(false);
  };

  const inp = 'w-full text-sm border border-line rounded-lg px-3 py-2.5 focus:outline-none focus:border-volt-600 bg-white';

  // ── Редактор ───────────────────────────────────────────────────────────────
  if (isNew || editing) return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{isNew ? 'Новая статья' : 'Редактировать статью'}</h2>
          <p className="text-sm text-muted mt-0.5">Статья появится на странице вашего сервиса</p>
        </div>
        <button onClick={cancel} className="text-muted hover:text-ink-900 transition-colors text-sm flex items-center gap-1">
          <i className="ti ti-arrow-left text-sm" aria-hidden="true" />Назад
        </button>
      </div>

      <div className="space-y-4">
        {/* Обложка */}
        <div className="bg-white border border-line rounded-xl p-4">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-3">Обложка статьи</label>
          {form.coverUrl ? (
            <div className="relative rounded-xl overflow-hidden aspect-video w-full max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setForm(f => ({ ...f, coverUrl: '' }))}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full max-w-md aspect-video rounded-xl border-2 border-dashed border-line cursor-pointer hover:border-volt-600 transition-colors">
              {uploadingCover
                ? <i className="ti ti-loader-2 text-2xl text-muted animate-spin" aria-hidden="true" />
                : <>
                    <i className="ti ti-photo text-2xl text-muted mb-2" aria-hidden="true" />
                    <span className="text-sm text-muted">Загрузить обложку</span>
                    <span className="text-xs text-muted mt-1">JPG, PNG, WebP · до 5 МБ</span>
                  </>
              }
              <input type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ''; }} />
            </label>
          )}
        </div>

        {/* Заголовок и анонс */}
        <div className="bg-white border border-line rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Заголовок *</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
              placeholder="Как мы обслуживаем Tesla в Москве" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Краткое описание</label>
            <textarea value={form.excerpt} onChange={e => setForm(f => ({...f, excerpt: e.target.value}))}
              placeholder="Коротко о чём статья (показывается в карточке)"
              rows={2} className={`${inp} resize-none`} />
          </div>
        </div>

        {/* Редактор */}
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">Текст статьи</label>
          <TiptapEditor
              content={form.content}
              onChange={html => setForm(f => ({...f, content: html}))}
              token={token}
              placeholder="Расскажите о вашем опыте, поделитесь советами по обслуживанию электромобилей..."
            />
        </div>

        {/* Публикация и кнопки */}
        <div className="bg-white border border-line rounded-xl p-4 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({...f, isPublished: !f.isPublished}))}
              className={`w-10 h-6 rounded-full transition-colors relative ${form.isPublished ? 'bg-green-500' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublished ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm text-ink-900">{form.isPublished ? 'Опубликовать сразу' : 'Сохранить как черновик'}</span>
          </label>

          <div className="flex gap-2">
            <button onClick={cancel} className="px-4 py-2.5 text-sm border border-line rounded-xl text-muted hover:border-ink-900/30 hover:text-ink-900 transition-colors">
              Отмена
            </button>
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="px-6 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />}
              {saving ? 'Сохраняем...' : form.isPublished ? 'Опубликовать' : 'Сохранить черновик'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Список статей ──────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Блог</h2>
          <p className="text-sm text-muted mt-0.5">Статьи появляются на странице вашего сервиса</p>
        </div>
        <button onClick={startNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
          <i className="ti ti-plus text-sm" aria-hidden="true" />
          Новая статья
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted gap-2 text-sm">
          <i className="ti ti-loader-2 animate-spin" aria-hidden="true" />Загружаем блог...
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-line rounded-xl py-16 text-center px-4">
          <i className="ti ti-notebook text-4xl text-muted/30 block mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold text-ink-900 mb-2">Статей пока нет</h3>
          <p className="text-sm text-muted mb-5">Напишите первую статью — поделитесь экспертизой с клиентами</p>
          <button onClick={startNew}
            className="px-5 py-2.5 bg-ink-900 text-white rounded-xl text-sm font-semibold hover:bg-ink-700 transition-colors">
            Написать первую статью →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="flex gap-4 p-4">
                {/* Обложка */}
                {post.coverUrl && (
                  <div className="w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-paper-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.coverUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900 text-sm leading-snug">{post.title}</h3>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      post.isPublished ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {post.isPublished ? 'Опубликована' : 'Черновик'}
                    </span>
                  </div>
                  {post.excerpt && <p className="text-xs text-muted mt-1 line-clamp-1">{post.excerpt}</p>}
                  <p className="text-xs text-muted mt-1">{timeAgo(post.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 border-t border-line bg-paper-50">
                <button onClick={() => startEdit(post)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-line">
                  <i className="ti ti-edit text-sm" aria-hidden="true" />Редактировать
                </button>
                <button onClick={() => togglePublish(post)}
                  className="flex items-center gap-1.5 text-xs text-muted hover:text-ink-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-line">
                  <i className={`ti ${post.isPublished ? 'ti-eye-off' : 'ti-eye'} text-sm`} aria-hidden="true" />
                  {post.isPublished ? 'Скрыть' : 'Опубликовать'}
                </button>
                <div className="ml-auto">
                  <button
                    onClick={() => deletePost(post.id)}
                    disabled={deleting === post.id}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                    {deleting === post.id
                      ? <i className="ti ti-loader-2 animate-spin text-sm" aria-hidden="true" />
                      : <i className="ti ti-trash text-sm" aria-hidden="true" />
                    }
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

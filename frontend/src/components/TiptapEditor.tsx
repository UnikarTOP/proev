'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useCallback, useRef } from 'react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  token?: string;
  placeholder?: string;
}

function Btn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        background: active ? '#0B1220' : 'transparent',
        color: active ? '#fff' : '#6B7686',
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { if (!active) { (e.target as HTMLElement).style.background = '#F1EFE8'; (e.target as HTMLElement).style.color = '#10192B'; } }}
      onMouseLeave={e => { if (!active) { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = '#6B7686'; } }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: '#DCE1E8', margin: '0 4px', flexShrink: 0 }} />;
}

export default function TiptapEditor({ content, onChange, token, placeholder = 'Начните писать...' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none min-h-[280px] px-4 py-3 focus:outline-none' },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${api}/upload/photo`, {
        method: 'POST',
        headers: token ? { 'X-Partner-Token': token, 'Authorization': `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (data.url) editor.chain().focus().setImage({ src: data.url }).run();
    } catch {}
  }, [editor, token, api]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL ссылки:', prev);
    if (url === null) return;
    if (!url) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return (
    <div style={{ border: '0.5px solid #DCE1E8', borderRadius: 12, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B4B2A9', fontSize: 14 }}>
      Загружаем редактор...
    </div>
  );

  return (
    <div style={{ border: '0.5px solid #DCE1E8', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      {/* Тулбар */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2,
        padding: '6px 10px', borderBottom: '0.5px solid #DCE1E8',
        background: '#F9F8F5',
      }}>
        {/* Форматирование текста */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Жирный (Ctrl+B)">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Курсив (Ctrl+I)">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Подчёркнутый">
          <span style={{ textDecoration: 'underline' }}>U</span>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Зачёркнутый">
          <span style={{ textDecoration: 'line-through' }}>S</span>
        </Btn>

        <Sep />

        {/* Заголовки */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Заголовок H2">
          H2
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Заголовок H3">
          H3
        </Btn>

        <Sep />

        {/* Списки */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Список">
          ☰
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Нумерованный список">
          1.
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Цитата">
          ❝
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Код">
          {'</>'}
        </Btn>

        <Sep />

        {/* Выравнивание */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="По левому краю">
          ≡
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="По центру">
          ≡
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="По правому краю">
          ≡
        </Btn>

        <Sep />

        {/* Ссылка и разделитель */}
        <Btn onClick={setLink} active={editor.isActive('link')} title="Вставить ссылку">
          🔗
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Горизонтальный разделитель">
          —
        </Btn>

        {/* Отмена/повтор */}
        <Sep />
        <Btn onClick={() => editor.chain().focus().undo().run()} active={false} title="Отменить (Ctrl+Z)">
          ↩
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} active={false} title="Повторить (Ctrl+Y)">
          ↪
        </Btn>

        {/* Загрузка картинки — справа */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Btn onClick={() => fileRef.current?.click()} active={false} title="Вставить изображение">
            🖼
          </Btn>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
        </div>
      </div>

      {/* Редактор */}
      <EditorContent editor={editor} />

      {/* Подвал */}
      <div style={{
        padding: '6px 16px', borderTop: '0.5px solid #DCE1E8', background: '#F9F8F5',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#B4B2A9' }}>Ctrl+B жирный · Ctrl+I курсив · Ctrl+Z отмена</span>
        <span style={{ fontSize: 11, color: '#B4B2A9' }}>
          {editor.getText().length} символов
        </span>
      </div>
    </div>
  );
}

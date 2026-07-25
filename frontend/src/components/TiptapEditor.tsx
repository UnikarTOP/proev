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

function ToolBtn({ onClick, active, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-md text-sm transition-colors ${
        active
          ? 'bg-ink-900 text-white'
          : 'text-muted hover:bg-paper-50 hover:text-ink-900'
      }`}
    >
      {children}
    </button>
  );
}

export default function TiptapEditor({ content, onChange, token, placeholder = 'Начните писать статью...' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[320px] px-5 py-4 focus:outline-none',
      },
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
        headers: token ? { 'X-Partner-Token': token } : {},
        body: fd,
      });
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch (e) {
      console.error('Ошибка загрузки изображения', e);
    }
  }, [editor, token, api]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL ссылки:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const groups = [
    [
      { icon: 'ti-bold', title: 'Жирный (Ctrl+B)', action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold') },
      { icon: 'ti-italic', title: 'Курсив (Ctrl+I)', action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic') },
      { icon: 'ti-underline', title: 'Подчёркнутый', action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline') },
      { icon: 'ti-strikethrough', title: 'Зачёркнутый', action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike') },
    ],
    [
      { icon: 'ti-h-2', title: 'Заголовок H2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
      { icon: 'ti-h-3', title: 'Заголовок H3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    ],
    [
      { icon: 'ti-list', title: 'Список', action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
      { icon: 'ti-list-numbers', title: 'Нумерованный список', action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
      { icon: 'ti-blockquote', title: 'Цитата', action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote') },
      { icon: 'ti-code', title: 'Код', action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code') },
    ],
    [
      { icon: 'ti-align-left', title: 'По левому краю', action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }) },
      { icon: 'ti-align-center', title: 'По центру', action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }) },
      { icon: 'ti-align-right', title: 'По правому краю', action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }) },
    ],
    [
      { icon: 'ti-link', title: 'Ссылка', action: setLink, active: editor.isActive('link') },
      { icon: 'ti-separator', title: 'Разделитель', action: () => editor.chain().focus().setHorizontalRule().run(), active: false },
    ],
  ];

  return (
    <div className="border border-line rounded-xl overflow-hidden bg-white">
      {/* Тулбар */}
      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-line bg-paper-50 flex-wrap">
        {groups.map((group, gi) => (
          <div key={gi} className={`flex items-center gap-0.5 ${gi < groups.length - 1 ? 'pr-2 mr-1.5 border-r border-line' : ''}`}>
            {group.map(btn => (
              <ToolBtn key={btn.icon} onClick={btn.action} active={btn.active} title={btn.title}>
                <i className={`ti ${btn.icon} text-base`} aria-hidden="true" />
              </ToolBtn>
            ))}
          </div>
        ))}

        {/* Кнопка загрузки картинки */}
        <div className="ml-auto flex items-center gap-1">
          <ToolBtn onClick={() => fileRef.current?.click()} title="Вставить изображение" active={false}>
            <i className="ti ti-photo text-base" aria-hidden="true" />
          </ToolBtn>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) uploadImage(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* Область редактирования */}
      <EditorContent editor={editor} />

      {/* Статус */}
      <div className="px-5 py-2 border-t border-line bg-paper-50 flex items-center justify-between">
        <span className="text-xs text-muted">
          {editor.storage.characterCount?.characters?.() ?? 0} символов
        </span>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>Ctrl+B жирный</span>
          <span>·</span>
          <span>Ctrl+Z отмена</span>
        </div>
      </div>
    </div>
  );
}

'use client';

// Санитизация HTML перед рендером через dangerouslySetInnerHTML
// Защищает от XSS атак если контент приходит из внешних источников

export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html; // SSR - пропускаем
  try {
    const DOMPurify = require('dompurify');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','a',
        'blockquote','code','pre','br','img','table','tr','td','th','thead','tbody',
        'div','span','mark','del','sup','sub'],
      ALLOWED_ATTR: ['href','src','alt','class','target','rel'],
      ALLOW_DATA_ATTR: false,
      ADD_ATTR: ['target'], // разрешаем target="_blank"
    });
  } catch {
    // Если DOMPurify не загрузился - возвращаем как есть (SSR)
    return html;
  }
}

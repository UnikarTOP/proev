/**
 * Server-side HTML sanitization — защита от XSS
 * Используется при сохранении HTML от партнёров
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:\s*/gi, '')
    .replace(/vbscript:\s*/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '');
}

export function sanitizeText(text: string, maxLen = 10000): string {
  if (!text) return '';
  return text.replace(/[<>]/g, '').trim().substring(0, maxLen);
}

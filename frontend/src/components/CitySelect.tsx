'use client';

import { useState, useRef, useEffect } from 'react';
import { filterCities } from '@/lib/cities';

interface Props {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CitySelect({ value, onChange, placeholder = 'Выберите город', className, style }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = filterCities(query, 12);

  // Закрываем по клику снаружи
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', ...style }} className={className}>
      {/* Поле ввода */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          border: open ? '1px solid #0BA5CC' : '1px solid #DCE1E8',
          borderRadius: 12, background: '#fff', cursor: 'text',
          transition: 'border-color 0.15s',
        }}
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>📍</span>
        <input
          ref={inputRef}
          value={open ? query : value}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={value || placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 14,
            color: value && !open ? '#10192B' : '#6B7686',
            background: 'transparent', minWidth: 0,
          }}
        />
        {value && !open && (
          <button onClick={clear} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#B4B2A9', fontSize: 12, padding: 0, lineHeight: 1, flexShrink: 0,
          }}>✕</button>
        )}
        {!value && (
          <span style={{ color: '#B4B2A9', fontSize: 11, flexShrink: 0 }}>▾</span>
        )}
      </div>

      {/* Дропдаун */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #DCE1E8', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 280, overflowY: 'auto',
        }}>
          {suggestions.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 13, color: '#B4B2A9' }}>
              Город не найден
            </div>
          ) : (
            suggestions.map(city => (
              <button
                key={city}
                onMouseDown={e => { e.preventDefault(); select(city); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px',
                  fontSize: 14, color: city === value ? '#0BA5CC' : '#10192B',
                  fontWeight: city === value ? 600 : 400,
                  background: city === value ? '#F0F9FF' : 'none',
                  border: 'none', borderBottom: '1px solid #F1EFE8',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => {
                  if (city !== value) (e.currentTarget as HTMLElement).style.background = '#F9F8F5';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = city === value ? '#F0F9FF' : 'none';
                }}
              >
                {city === value && <span style={{ color: '#0BA5CC', fontSize: 12 }}>✓</span>}
                {city}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

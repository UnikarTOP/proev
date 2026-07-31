'use client';

import { useState, useEffect, useRef } from 'react';

export interface AddressPoint {
  value: string;       // полный адрес строкой
  lat: number;
  lon: number;
  city?: string;
  region?: string;
}

interface Suggestion {
  value: string;
  unrestricted_value: string;
  data: {
    geo_lat: string | null;
    geo_lon: string | null;
    city: string | null;
    region: string | null;
    settlement: string | null;
    street_with_type: string | null;
    house: string | null;
    fias_level: string;
  };
}

interface Props {
  value: string;
  onChange: (address: string, point?: AddressPoint) => void;
  placeholder?: string;
  label?: string;
}

export default function AddressSearchInput({ value, onChange, placeholder, label }: Props) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const api = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (input.length < 2) { setSuggestions([]); setOpen(false); return; }

    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${api}/geoip/dadata/suggest?q=${encodeURIComponent(input)}&count=8`);
        const data = await res.json();
        if (Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setOpen(data.suggestions.length > 0);
        }
      } catch {
        // Fallback — ничего не показываем
      }
      setLoading(false);
    }, 280);
  }, [input, api]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (s: Suggestion) => {
    const lat = s.data.geo_lat ? parseFloat(s.data.geo_lat) : null;
    const lon = s.data.geo_lon ? parseFloat(s.data.geo_lon) : null;
    const displayValue = s.value;

    setInput(displayValue);
    setOpen(false);
    setSuggestions([]);

    if (lat && lon) {
      onChange(displayValue, {
        value: displayValue,
        lat,
        lon,
        city: s.data.city || s.data.settlement || s.data.region || undefined,
        region: s.data.region || undefined,
      });
    } else {
      onChange(displayValue);
    }
  };

  // Иконка по типу адреса
  const getIcon = (s: Suggestion) => {
    const level = parseInt(s.data.fias_level || '0');
    if (level >= 8) return '🏠'; // дом
    if (level === 7) return '📍'; // улица
    if (level >= 4) return '🏙️'; // город
    return '📍';
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7686', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 14 }}>📍</span>
        <input
          value={input}
          onChange={e => { setInput(e.target.value); if (!e.target.value) onChange(''); }}
          onFocus={e => { suggestions.length > 0 && setOpen(true); (e.target as HTMLInputElement).style.borderColor = '#0BA5CC'; }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#DCE1E8'; }}
          placeholder={placeholder || 'Введите адрес или город'}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 34, paddingRight: loading ? 36 : 12,
            paddingTop: 10, paddingBottom: 10,
            fontSize: 14, border: '1px solid #DCE1E8',
            borderRadius: 12, outline: 'none', background: '#fff',
            transition: 'border-color 0.15s',
          }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: 14, height: 14, border: '2px solid #DCE1E8', borderTopColor: '#0BA5CC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #DCE1E8', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onClick={() => select(s)}
              style={{
                padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F4F4F2' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9F8F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{getIcon(s)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#10192B', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.value}
                </div>
                {s.unrestricted_value !== s.value && (
                  <div style={{ color: '#B4B2A9', fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.unrestricted_value}
                  </div>
                )}
              </div>
              {s.data.geo_lat && (
                <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
                  <span style={{ fontSize: 10, color: '#1D9E75', background: '#E6F5EE', padding: '1px 5px', borderRadius: 4 }}>📍</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ padding: '6px 12px', fontSize: 10, color: '#B4B2A9', borderTop: '1px solid #F4F4F2', textAlign: 'right' }}>
            данные: DaData
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}

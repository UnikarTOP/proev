'use client';

import { useState, useEffect, useRef } from 'react';
import { searchCity, type City } from '@/lib/cities-ru';

interface GeoPoint { lat: number; lon: number; name: string; }

interface Props {
  value: string;
  onChange: (city: string, point?: GeoPoint) => void;
  placeholder?: string;
  apiKey?: string; // оставляем для совместимости, не используем
}

export default function CitySearchInput({ value, onChange, placeholder }: Props) {
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInput(value); }, [value]);

  useEffect(() => {
    if (input.length < 2) { setSuggestions([]); setOpen(false); return; }
    const results = searchCity(input);
    setSuggestions(results);
    setOpen(results.length > 0);
  }, [input]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (city: City) => {
    setInput(city.name);
    setOpen(false);
    setSuggestions([]);
    onChange(city.name, { lat: city.lat, lon: city.lon, name: city.name });
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 14,
        }}>📍</span>
        <input
          value={input}
          onChange={e => {
            setInput(e.target.value);
            if (!e.target.value) onChange('');
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Введите город'}
          style={{
            width: '100%', boxSizing: 'border-box',
            paddingLeft: 34, paddingRight: 12,
            paddingTop: 10, paddingBottom: 10,
            fontSize: 14, border: '1px solid #DCE1E8',
            borderRadius: 12, outline: 'none', background: '#fff',
          }}
        />
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #DCE1E8', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map((city, i) => (
            <div
              key={city.name + city.region}
              onClick={() => select(city)}
              style={{
                padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F0F0F0' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9F8F5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
            >
              <span style={{ color: '#10192B', fontWeight: 500 }}>{city.name}</span>
              <span style={{ color: '#B4B2A9', fontSize: 11 }}>{city.region}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

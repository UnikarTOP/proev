const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface ChargingStation {
  id: string;
  name: string;
  networkOperator?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  connectorTypes: string[];
  chargingSpeed: 'slow' | 'fast' | 'ultra_fast';
  powerKw?: number;
  status: 'working' | 'broken' | 'unknown';
}

export interface StationStats {
  stationCount: number;
  cityCount: number;
}

export interface ServiceProvider {
  id: string;
  name: string;
  city?: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  category: { name: string; slug: string };
}

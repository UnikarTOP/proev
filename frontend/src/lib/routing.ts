/**
 * Геокодинг и маршрутизация для калькулятора поездок
 * Использует Яндекс Geocoder API + OSRM как fallback
 */

export interface GeoPoint { lat: number; lon: number; name: string; }
export interface RouteResult { distanceKm: number; durationMin: number; points: [number, number][]; }

// Яндекс Geocoder API
export async function geocodeCity(query: string, apiKey: string): Promise<GeoPoint | null> {
  try {
    const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(query + ', Россия')}&format=json&results=1&lang=ru_RU`;
    const res = await fetch(url);
    const data = await res.json();
    const features = data?.response?.GeoObjectCollection?.featureMember;
    if (!features?.length) return null;
    const obj = features[0].GeoObject;
    const [lon, lat] = obj.Point.pos.split(' ').map(Number);
    const name = obj.name;
    return { lat, lon, name };
  } catch { return null; }
}

// Поиск городов через Яндекс suggest (для автодополнения)
export async function suggestCities(query: string, apiKey: string): Promise<string[]> {
  if (query.length < 2) return [];
  try {
    const url = `https://suggest-maps.yandex.ru/suggest-geo?apikey=${apiKey}&text=${encodeURIComponent(query)}&lang=ru_RU&search_type=tp&v=9&results=10&highlight=0`;
    const res = await fetch(url);
    const data = await res.json();
    if (!Array.isArray(data?.results)) return [];
    return data.results
      .filter((r: any) => r.tags?.includes('locality') || r.tags?.includes('province'))
      .map((r: any) => r.title?.text || r.text)
      .filter(Boolean)
      .slice(0, 8);
  } catch { return []; }
}

// Маршрутизация через OSRM (открытый, бесплатный)
export async function getRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=simplified&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    const route = data.routes[0];
    const distanceKm = Math.round(route.distance / 1000);
    const durationMin = Math.round(route.duration / 60);
    const points: [number, number][] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
    return { distanceKm, durationMin, points };
  } catch { return null; }
}

// Fallback: прямое расстояние (формула Haversine)
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.22); // +22% поправка на дороги
}

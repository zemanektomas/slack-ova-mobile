// Reverse geocoding (lat/lon → země) přes OSM Nominatim.
// Free service, žádný API key. Limit: 1 req/sec, fair use.
// Stačí jednou při prvním spuštění apky pro nastavení default state filteru.
//
// Atribuce: © OpenStreetMap contributors (https://nominatim.org/release-docs/develop/api/Reverse/).

import { isoToCountryName } from './countryNames';

interface NominatimResponse {
  address?: {
    country_code?: string;
  };
  error?: string;
}

/**
 * Vrací lidsky čitelné jméno země pro dané GPS souřadnice (např. "Česká republika"
 * pro lat=49.7, lon=15.5). Vrací null při chybě nebo timeout — caller musí tolerovat.
 */
export async function reverseGeocodeCountry(lat: number, lon: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3&accept-language=cs`;
    const res = await fetch(url, {
      headers: {
        // Nominatim usage policy: identify yourself
        'User-Agent': 'slack-cz-mobile (https://github.com/zemanektomas/slack-cz-mobile)',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: NominatimResponse = await res.json();
    const iso = data.address?.country_code;
    if (!iso) return null;
    return isoToCountryName(iso);
  } catch {
    // Network error, timeout, or aborted — silent fail, caller leaves filter unset
    return null;
  }
}

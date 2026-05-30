import { PinData } from '../services/DatabaseService';

// --- Travel stats ----------------------------------------------------------
//
// We derive countries/cities from each pin's reverse-geocoded `address` string
// (e.g. "1541 California St, San Francisco, CA 94115, USA"). This is a heuristic
// — international address formats vary — so a pin with an unparseable address is
// simply counted under places without contributing to a country/city. No schema
// change and no network: it reads only data that already exists on the pin.

// Rough number of sovereign countries — used only for the "% of world" stat.
const TOTAL_COUNTRIES = 195;

export interface CountryStat {
  country: string;
  count: number;
}

export interface TravelStats {
  totalPlaces: number;
  visitedCount: number;
  wishlistCount: number;
  countryCount: number;
  cityCount: number;
  percentWorld: number; // 0–100, based on visited countries
  topCountry: CountryStat | null;
  topCity: { city: string; count: number } | null;
  fiveStarCount: number;
  countries: CountryStat[]; // visited countries, most pins first
}

const cleanPart = (s: string) => s.replace(/\s+/g, ' ').trim();

// Google's geocoder prefixes a "Plus Code" (e.g. "MGJJ+5P") when no precise
// street address exists. Strip it so the city reads as a real place name.
const stripPlusCode = (s: string) =>
  s.replace(/^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\s*/i, "").trim();

/** Last comma-separated segment is almost always the country. */
export const parseCountry = (address?: string): string | null => {
  if (!address) return null;
  const parts = address.split(',').map(cleanPart).filter(Boolean);
  if (parts.length === 0) return null;
  const country = parts[parts.length - 1];
  // Drop a trailing postal code if the country segment is just digits.
  if (/^\d+$/.test(country)) return null;
  return country;
};

/**
 * City heuristic: in most geocoded formats the city sits two segments before
 * the country (…, City, State/Postal, Country). Falls back to the first
 * non-country segment for short addresses.
 */
export const parseCity = (address?: string): string | null => {
  if (!address) return null;
  const parts = address.split(',').map(cleanPart).filter(Boolean);
  if (parts.length < 2) return null;
  const idx = parts.length - 3;
  const candidate = idx >= 0 ? parts[idx] : parts[0];
  const city = stripPlusCode(candidate);
  return city || null;
};

export const computeTravelStats = (pins: PinData[]): TravelStats => {
  const visited = pins.filter((p) => (p.status || 'visited') === 'visited');
  const wishlist = pins.filter((p) => p.status === 'wishlist');

  const countryCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  let fiveStarCount = 0;

  for (const pin of visited) {
    const country = parseCountry(pin.address);
    if (country) countryCounts.set(country, (countryCounts.get(country) || 0) + 1);

    const city = parseCity(pin.address);
    if (city) cityCounts.set(city, (cityCounts.get(city) || 0) + 1);

    if ((pin.rating || 0) >= 5) fiveStarCount += 1;
  }

  const countries: CountryStat[] = Array.from(countryCounts.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));

  const topCity = Array.from(cityCounts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))[0] || null;

  return {
    totalPlaces: pins.length,
    visitedCount: visited.length,
    wishlistCount: wishlist.length,
    countryCount: countryCounts.size,
    cityCount: cityCounts.size,
    percentWorld: Math.min(
      100,
      Math.round((countryCounts.size / TOTAL_COUNTRIES) * 100),
    ),
    topCountry: countries[0] || null,
    topCity,
    fiveStarCount,
    countries,
  };
};

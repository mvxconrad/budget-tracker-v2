// City autocomplete backed by the free, key-less Open-Meteo geocoding API
// (CORS-enabled, no auth). Results are cached in memory AND localStorage so
// repeated or prefix queries ("cu" → "cul" → "culv") don't hit the network twice.

const ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
const CACHE_KEY = "geo-cache:v1";
const TTL = 1000 * 60 * 60 * 24 * 30; // 30 days - cities don't move
const MAX_ENTRIES = 250; // cap localStorage growth

const STATE_ABBR = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", "District of Columbia": "DC",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL",
  Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
  Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
  Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
  "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK",
  Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

const mem = new Map();

let disk;
function getDisk() {
  if (disk) return disk;
  try {
    disk = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    disk = {};
  }
  return disk;
}
function saveDisk() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(disk));
  } catch {
    // storage full / blocked - caching is best-effort
  }
}

function getCached(q) {
  if (mem.has(q)) return mem.get(q);
  const e = getDisk()[q];
  if (e && Date.now() - e.t < TTL) {
    mem.set(q, e.results);
    return e.results;
  }
  return null;
}

function setCached(q, results) {
  mem.set(q, results);
  const d = getDisk();
  d[q] = { t: Date.now(), results };
  const keys = Object.keys(d);
  if (keys.length > MAX_ENTRIES) {
    // Evict the oldest entries.
    keys.sort((a, b) => d[a].t - d[b].t);
    for (let i = 0; i < keys.length - MAX_ENTRIES; i++) delete d[keys[i]];
  }
  saveDisk();
}

function format(r) {
  const state = STATE_ABBR[r.admin1] || r.admin1 || "";
  // Open-Meteo often returns a `postcodes` array; keep the first 5-digit ZIP so
  // the location benchmark can look up real HUD Fair Market Rents for the area.
  const zip = (r.postcodes || []).map(String).find((z) => /^\d{5}$/.test(z)) || "";
  return {
    id: r.id,
    name: r.name,
    state,
    zip,
    lat: r.latitude,
    lon: r.longitude,
    label: state ? `${r.name}, ${state}` : r.name,
  };
}

// Returns up to 8 US city matches for the query. Throws on network error
// (caller decides how to degrade); resolves to [] for short/empty queries.
export async function searchCities(query, signal) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const cached = getCached(q);
  if (cached) return cached;

  const url = `${ENDPOINT}?name=${encodeURIComponent(query.trim())}&count=20&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = await res.json();

  const seen = new Set();
  const results = (data.results || [])
    .filter((r) => r.country_code === "US")
    .map(format)
    .filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)))
    .slice(0, 8);

  setCached(q, results);
  return results;
}

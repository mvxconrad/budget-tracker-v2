// Location-aware budget benchmarks.
//
// These are guideline-based estimates, NOT live local data:
//   • Housing: the classic "30% rule" (housing <= 30% of income), then
//     scaled up for high cost-of-living metros to reflect what's realistic there.
//   • Savings: a flat 20% target (the "20" in 50/30/20).
//
// The cost-of-living index uses 100 = U.S. national average. The REGIONS table
// is intentionally small and self-contained; later it can be replaced by a real
// cost-of-living / fair-market-rent API without touching the UI.

const REGIONS = [
  { name: "San Francisco, CA", col: 192, keys: ["san francisco", "sf", "bay area", "oakland", "san jose", "palo alto"] },
  { name: "New York, NY", col: 187, keys: ["new york", "nyc", "manhattan", "brooklyn", "queens"] },
  { name: "Boston, MA", col: 162, keys: ["boston", "cambridge, ma"] },
  { name: "Los Angeles, CA", col: 152, keys: ["los angeles", "l.a", "culver city", "santa monica", "hollywood", "long beach", "pasadena", "burbank"] },
  { name: "Washington, DC", col: 152, keys: ["washington", "d.c", "arlington, va"] },
  { name: "Seattle, WA", col: 150, keys: ["seattle", "bellevue", "tacoma"] },
  { name: "San Diego, CA", col: 146, keys: ["san diego"] },
  { name: "Portland, OR", col: 130, keys: ["portland"] },
  { name: "Miami, FL", col: 123, keys: ["miami", "fort lauderdale"] },
  { name: "Denver, CO", col: 122, keys: ["denver", "boulder"] },
  { name: "Austin, TX", col: 119, keys: ["austin"] },
  { name: "Chicago, IL", col: 108, keys: ["chicago"] },
  { name: "Phoenix, AZ", col: 108, keys: ["phoenix", "scottsdale", "tempe", "mesa"] },
  { name: "Atlanta, GA", col: 107, keys: ["atlanta"] },
  { name: "Tampa, FL", col: 105, keys: ["tampa", "st. petersburg"] },
  { name: "Orlando, FL", col: 104, keys: ["orlando"] },
  { name: "Dallas, TX", col: 103, keys: ["dallas", "fort worth", "plano"] },
  { name: "Houston, TX", col: 96, keys: ["houston"] },
];

// Resolve a free-text location to a region + cost-of-living index.
// Falls back to the national average when nothing matches.
export function resolveRegion(input) {
  const q = (input || "").trim().toLowerCase();
  if (!q) return { name: "National average", col: 100, matched: false };
  for (const r of REGIONS) {
    if (r.keys.some((k) => q.includes(k))) {
      return { name: r.name, col: r.col, matched: true };
    }
  }
  return { name: "National average", col: 100, matched: false };
}

// Target percentages for the given region.
export function targetsFor(region) {
  const healthyHousing = 30; // the 30% rule (national)
  // Scale the housing target up in pricier metros, capped at 50%.
  const areaHousing = Math.max(30, Math.min(50, Math.round(30 * (region.col / 100))));
  return { healthyHousing, areaHousing, healthySavings: 20 };
}

// Best-effort detection of the housing spend from category names.
export function detectHousing(categories) {
  const re = /hous|rent|mortgage|lodg/i;
  const matched = categories.filter((c) => re.test(c.name));
  return {
    total: matched.reduce((s, c) => s + (c.total || 0), 0),
    names: matched.map((c) => c.name),
    found: matched.length > 0,
  };
}

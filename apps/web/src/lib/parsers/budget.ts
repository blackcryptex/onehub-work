/**
 * Budget parser utility
 * Parses free-text budget input into structured data
 */

export type ParsedBudget = {
  min?: number; // in cents (smallest currency unit)
  max?: number; // in cents
  currency?: string; // ISO 4217 (e.g., "USD", "EUR", "GBP")
};

const K = 1000;
const M = 1000000;

/**
 * Convert string to number, handling "k" and "m" suffixes
 */
function parseNumber(s: string): number {
  const cleaned = s.replace(/[, ]/g, '').trim();
  const num = parseFloat(cleaned.replace(/[km]/i, ''));
  
  if (/k\b/i.test(cleaned)) return num * K;
  if (/m\b/i.test(cleaned)) return num * M;
  return num;
}

/**
 * Detect currency from text
 */
function detectCurrency(s: string): string | undefined {
  const up = s.toUpperCase();
  if (/\bUSD|\$|US\$/.test(up)) return 'USD';
  if (/\bEUR|€/.test(up)) return 'EUR';
  if (/\bGBP|£/.test(up)) return 'GBP';
  if (/\bCAD|C\$/.test(up)) return 'CAD';
  if (/\bAUD|A\$/.test(up)) return 'AUD';
  return undefined;
}

/**
 * Parse free-text budget input
 * Handles formats like: "$12,500", "12500", "12.5k", "10k-15k", "under 5k", "about 30k EUR", "€7,000"
 */
export function parseBudget(input: string, defaultCurrency: string = 'USD'): ParsedBudget {
  const raw = input.trim();
  if (!raw) {
    return { currency: defaultCurrency };
  }

  const currency = detectCurrency(raw) || defaultCurrency;

  // Ranges like "10k-15k", "10k to 15k", "10k–15k"
  const rangeMatch = raw.match(/([\d,.]+k?)[\s\-–to]+([\d,.]+k?)/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const min = Math.round(parseNumber(rangeMatch[1]) * 100); // Convert to cents
    const max = Math.round(parseNumber(rangeMatch[2]) * 100);
    return { min, max, currency };
  }

  // "under 5k", "below 5000", "≤ 5000", "max 5k"
  if (/^(under|below|max|upto|up to|<=?|less than)\s*/i.test(raw)) {
    const match = raw.match(/([\d,.]+k?)/i);
    if (match && match[1]) {
      const max = Math.round(parseNumber(match[1]) * 100);
      return { min: 0, max, currency };
    }
  }

  // "over 5k", "above 5000", "≥ 5000", "min 5k", "at least 5k"
  if (/^(over|above|min|at least|>=?|more than|greater than)\s*/i.test(raw)) {
    const match = raw.match(/([\d,.]+k?)/i);
    if (match && match[1]) {
      const min = Math.round(parseNumber(match[1]) * 100);
      return { min, currency };
    }
  }

  // "about 30k", "~30k", "approximately 30k"
  if (/^(about|approximately|~|approx\.?)\s*/i.test(raw)) {
    const match = raw.match(/([\d,.]+k?)/i);
    if (match && match[1]) {
      const value = Math.round(parseNumber(match[1]) * 100);
      // Use ±20% as a range for "about"
      const min = Math.round(value * 0.8);
      const max = Math.round(value * 1.2);
      return { min, max, currency };
    }
  }

  // Single value: "$12,500", "12500", "12.5k"
  const singleMatch = raw.match(/([\d,.]+k?)/i);
  if (singleMatch && singleMatch[1]) {
    const value = Math.round(parseNumber(singleMatch[1]) * 100);
    return { min: value, max: value, currency };
  }

  // Fallback: return raw with currency
  return { currency };
}


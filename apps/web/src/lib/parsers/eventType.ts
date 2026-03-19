/**
 * Event type canonicalizer utility
 * Maps free-text event type descriptions to canonical labels
 */

type CanonicalEventType = 
  | 'wedding'
  | 'conference'
  | 'corporate'
  | 'birthday'
  | 'fundraiser'
  | 'festival'
  | 'sports'
  | 'other';

/**
 * Canonicalize event type from free text
 * Maps common synonyms and variations to canonical labels
 */
export function canonicalizeEventType(raw: string): CanonicalEventType | null {
  const normalized = raw.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const words = normalized.split(/\s+/);

  // Wedding variations
  if (
    /wedding|marriage|ceremony|nuptial|matrimony|bridal/i.test(normalized) ||
    words.some(w => ['wedding', 'marriage', 'ceremony', 'nuptial'].includes(w))
  ) {
    return 'wedding';
  }

  // Conference variations
  if (
    /conference|convention|summit|symposium|seminar|workshop|meeting/i.test(normalized) ||
    words.some(w => ['conference', 'convention', 'summit', 'symposium'].includes(w))
  ) {
    return 'conference';
  }

  // Corporate variations
  if (
    /corporate|company|business|corp|offsite|retreat|team building|gala/i.test(normalized) ||
    words.some(w => ['corporate', 'company', 'business', 'gala', 'retreat'].includes(w))
  ) {
    return 'corporate';
  }

  // Birthday variations
  if (
    /birthday|bday|b-day|anniversary|celebration/i.test(normalized) ||
    words.some(w => ['birthday', 'bday', 'anniversary'].includes(w))
  ) {
    return 'birthday';
  }

  // Fundraiser variations
  if (
    /fundraiser|fundraising|charity|benefit|gala|donation/i.test(normalized) ||
    words.some(w => ['fundraiser', 'charity', 'benefit'].includes(w))
  ) {
    return 'fundraiser';
  }

  // Festival variations
  if (
    /festival|fair|expo|exhibition|showcase/i.test(normalized) ||
    words.some(w => ['festival', 'fair', 'expo', 'exhibition'].includes(w))
  ) {
    return 'festival';
  }

  // Sports variations
  if (
    /sport|athletic|tournament|competition|game|match/i.test(normalized) ||
    words.some(w => ['sport', 'tournament', 'competition'].includes(w))
  ) {
    return 'sports';
  }

  // If no match found, return null (let AI infer)
  return null;
}


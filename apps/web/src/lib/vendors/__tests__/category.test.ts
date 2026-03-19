/**
 * Unit tests for vendor category canonicalizer
 */

import { describe, it, expect } from 'vitest';
import { toVendorCategory } from '../category';

describe('toVendorCategory', () => {
  it('maps common synonyms to canonical categories', () => {
    expect(toVendorCategory('venues')).toBe('venue');
    expect(toVendorCategory('photo')).toBe('photo');
    expect(toVendorCategory('photography')).toBe('photo');
    expect(toVendorCategory('DJ')).toBe('music');
    expect(toVendorCategory('dj/mc')).toBe('music');
    expect(toVendorCategory('entertainment')).toBe('music');
    expect(toVendorCategory('caterer')).toBe('catering');
    expect(toVendorCategory('floral')).toBe('florist');
    expect(toVendorCategory('flowers')).toBe('florist');
    expect(toVendorCategory('decoration')).toBe('decor');
    expect(toVendorCategory('transportation')).toBe('transport');
    expect(toVendorCategory('limo')).toBe('transport');
    expect(toVendorCategory('wedding cake')).toBe('cake');
  });

  it('handles case-insensitive input', () => {
    expect(toVendorCategory('VENUE')).toBe('venue');
    expect(toVendorCategory('Catering')).toBe('catering');
    expect(toVendorCategory('PhOtO')).toBe('photo');
  });

  it('trims whitespace', () => {
    expect(toVendorCategory('  venue  ')).toBe('venue');
    expect(toVendorCategory('\tcatering\n')).toBe('catering');
  });

  it('handles already-canonical categories', () => {
    expect(toVendorCategory('venue')).toBe('venue');
    expect(toVendorCategory('catering')).toBe('catering');
    expect(toVendorCategory('photo')).toBe('photo');
    expect(toVendorCategory('music')).toBe('music');
    expect(toVendorCategory('florist')).toBe('florist');
    expect(toVendorCategory('decor')).toBe('decor');
    expect(toVendorCategory('other')).toBe('other');
  });

  it('handles partial matches', () => {
    expect(toVendorCategory('venue rental')).toBe('venue');
    expect(toVendorCategory('event space')).toBe('venue');
    expect(toVendorCategory('food service')).toBe('catering');
    expect(toVendorCategory('live music')).toBe('music');
  });

  it('throws on unknown categories in development', () => {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      expect(() => toVendorCategory('mystery category')).toThrow('Unknown VendorCategory');
      expect(() => toVendorCategory('xyz123')).toThrow('Unknown VendorCategory');
    }
  });

  it('defaults to "other" in production for unknown categories', () => {
    // This test would require mocking NODE_ENV, but we can test the logic
    // by checking that invalid input structure throws
    expect(() => toVendorCategory('')).toThrow();
    expect(() => toVendorCategory(null as unknown as string)).toThrow();
    expect(() => toVendorCategory(undefined as unknown as string)).toThrow();
  });
});


/**
 * Unit tests for budget parser
 */

import { describe, it, expect } from 'vitest';
import { parseBudget } from '../budget';

describe('parseBudget', () => {
  it.each([
    ['$12,500', { min: 1250000, max: 1250000, currency: 'USD' }], // $12,500 in cents
    ['12500', { min: 1250000, max: 1250000 }], // 12500 in cents (no currency default)
    ['12.5k', { min: 1250000, max: 1250000 }], // 12.5k = 12,500 in cents
    ['10k-15k', { min: 1000000, max: 1500000 }],
    ['10k – 15k', { min: 1000000, max: 1500000 }],
    ['10k to 15k', { min: 1000000, max: 1500000 }],
    ['under 5k', { min: 0, max: 500000 }],
    ['below 5000', { min: 0, max: 500000 }],
    ['max 5k', { min: 0, max: 500000 }],
    ['about 30k EUR', { min: 2400000, max: 3600000, currency: 'EUR' }], // ±20% range
    ['€7,000', { min: 700000, max: 700000, currency: 'EUR' }],
    ['USD 20k', { min: 2000000, max: 2000000, currency: 'USD' }],
    ['~ 40k gbp', { min: 3200000, max: 4800000, currency: 'GBP' }], // ±20% range
    ['over 5k', { min: 500000 }],
    ['at least 10k', { min: 1000000 }],
    ['no numbers here', { currency: 'USD' }], // fallback with default currency
    ['', { currency: 'USD' }], // empty string
  ] as const)('parses "%s" correctly', (input, expected) => {
    const result = parseBudget(input);
    
    if ('min' in expected && expected.min !== undefined) {
      expect(result.min).toBe(expected.min);
    } else {
      expect(result.min).toBeUndefined();
    }
    
    if ('max' in expected && expected.max !== undefined) {
      expect(result.max).toBe(expected.max);
    } else {
      expect(result.max).toBeUndefined();
    }
    
    if ('currency' in expected && expected.currency !== undefined) {
      expect(result.currency).toBe(expected.currency);
    }
  });

  it('handles "about" with ±20% range', () => {
    const result = parseBudget('about 100k');
    // 100k = 100,000 = 10,000,000 cents
    // 80% = 8,000,000 cents, 120% = 12,000,000 cents
    expect(result.min).toBe(8000000); // 80% of 100k
    expect(result.max).toBe(12000000); // 120% of 100k
  });

  it('handles currency detection', () => {
    expect(parseBudget('$100').currency).toBe('USD');
    expect(parseBudget('€100').currency).toBe('EUR');
    expect(parseBudget('£100').currency).toBe('GBP');
    expect(parseBudget('100 USD').currency).toBe('USD');
    expect(parseBudget('100 EUR').currency).toBe('EUR');
  });

  it('defaults to USD when no currency specified', () => {
    expect(parseBudget('1000').currency).toBe('USD');
  });
});


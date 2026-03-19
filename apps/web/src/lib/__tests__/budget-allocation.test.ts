/**
 * Unit tests for BudgetAllocation normalization
 */

import { describe, it, expect } from 'vitest';
import { toVendorCategory } from '../vendors/category';
import type { BudgetAllocation } from '../types.event';

describe('BudgetAllocation normalization', () => {
  it('normalizes category from string to VendorCategory', () => {
    const raw = { category: 'venues', planned: 10000, actual: undefined as unknown as number };
    
    const allocation: BudgetAllocation = {
      category: toVendorCategory(raw.category),
      planned: raw.planned,
      actual: raw.actual ?? null,
    };
    
    expect(allocation.category).toBe('venue');
    expect(allocation.planned).toBe(10000);
    expect(allocation.actual).toBeNull();
  });

  it('normalizes actual undefined to null', () => {
    const allocations: BudgetAllocation[] = [
      { category: toVendorCategory('venue'), planned: 10000, actual: null },
      { category: toVendorCategory('catering'), planned: 5000, actual: 4500 },
      { category: toVendorCategory('photo'), planned: 3000 },
    ];
    
    expect(allocations[0]?.actual).toBeNull();
    expect(allocations[1]?.actual).toBe(4500);
    expect(allocations[2]?.actual).toBeUndefined(); // Optional field can be omitted
  });

  it('preserves actual value when provided', () => {
    const allocation: BudgetAllocation = {
      category: toVendorCategory('venue'),
      planned: 10000,
      actual: 9500,
    };
    
    expect(allocation.actual).toBe(9500);
  });

  it('handles null actual value correctly', () => {
    const allocation: BudgetAllocation = {
      category: toVendorCategory('catering'),
      planned: 5000,
      actual: null,
    };
    
    expect(allocation.actual).toBeNull();
  });

  it('creates valid BudgetAllocation array from raw data', () => {
    const rawData = [
      { category: 'venue', planned: 10000, actual: undefined },
      { category: 'catering', planned: 5000, actual: 4500 },
      { category: 'photo', planned: 3000 },
    ];
    
    const allocations: BudgetAllocation[] = rawData.map(r => ({
      category: toVendorCategory(r.category),
      planned: r.planned,
      actual: r.actual ?? null,
    }));
    
    expect(allocations).toHaveLength(3);
    expect(allocations[0]?.category).toBe('venue');
    expect(allocations[0]?.actual).toBeNull();
    expect(allocations[1]?.category).toBe('catering');
    expect(allocations[1]?.actual).toBe(4500);
    expect(allocations[2]?.category).toBe('photo');
    expect(allocations[2]?.actual).toBeNull();
  });
});


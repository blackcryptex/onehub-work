/**
 * Regression coverage for protected route runtime fallbacks.
 */

import { describe, expect, it, vi } from 'vitest';
import { safeArray, safeDateLabel, safeNumber, safePrismaResult } from '../runtime-route-safety';

describe('runtime route safety helpers', () => {
  it('returns successful Prisma reads without changing real values', async () => {
    await expect(safePrismaResult('messages.thread.findMany', Promise.resolve([{ id: 'thread-1' }]), [])).resolves.toEqual([
      { id: 'thread-1' },
    ]);
  });

  it('renders fallback data when a Preview relation or optional admin table read fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      safePrismaResult('admin.paymentHoldback.count', Promise.reject(new Error('relation does not exist')), 0),
    ).resolves.toBe(0);

    expect(errorSpy).toHaveBeenCalledWith(
      '[runtime-route-safety] admin.paymentHoldback.count failed; rendering fallback',
      'relation does not exist',
    );

    errorSpy.mockRestore();
  });

  it('normalizes optional included route relations before render', () => {
    expect(safeArray(undefined)).toEqual([]);
    expect(safeArray(null)).toEqual([]);
    expect(safeArray({ id: 'guest-list-1' })).toEqual([{ id: 'guest-list-1' }]);
    expect(safeArray([{ id: 'event-1' }])).toEqual([{ id: 'event-1' }]);
  });

  it('keeps numeric and date labels stable for sparse route data', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(Number.NaN)).toBe(0);
    expect(safeDateLabel('not-a-date', 'No message date')).toBe('No message date');
  });
});

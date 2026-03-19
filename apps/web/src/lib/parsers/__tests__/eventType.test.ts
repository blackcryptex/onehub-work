/**
 * Unit tests for event type canonicalizer
 */

import { describe, it, expect } from 'vitest';
import { canonicalizeEventType } from '../eventType';

describe('canonicalizeEventType', () => {
  it.each([
    ['wedding', 'wedding'],
    ['Wedding', 'wedding'],
    ['WEDDING', 'wedding'],
    ['marriage ceremony', 'wedding'],
    ['marriage', 'wedding'],
    ['nuptial', 'wedding'],
    ['bridal', 'wedding'],
    ['conference', 'conference'],
    ['convention', 'conference'],
    ['summit', 'conference'],
    ['symposium', 'conference'],
    ['corporate', 'corporate'],
    ['company', 'corporate'],
    ['business', 'corporate'],
    ['offsite', 'corporate'],
    ['retreat', 'corporate'],
    ['gala', 'corporate'],
    ['birthday', 'birthday'],
    ['bday', 'birthday'],
    ['anniversary', 'birthday'],
    ['fundraiser', 'fundraiser'],
    ['charity', 'fundraiser'],
    ['benefit', 'fundraiser'],
    ['festival', 'festival'],
    ['fair', 'festival'],
    ['expo', 'festival'],
    ['sports', 'sports'],
    ['tournament', 'sports'],
    ['competition', 'sports'],
    ['unknown thing', null],
    ['random event', null],
    ['', null],
  ])('maps "%s" -> %s', (raw, expected) => {
    expect(canonicalizeEventType(raw)).toBe(expected);
  });

  it('handles multi-word inputs', () => {
    expect(canonicalizeEventType('black-tie gala')).toBe('corporate');
    expect(canonicalizeEventType('church wedding')).toBe('wedding');
    expect(canonicalizeEventType('company retreat')).toBe('corporate');
  });

  it('handles special characters and punctuation', () => {
    expect(canonicalizeEventType('wedding!')).toBe('wedding');
    expect(canonicalizeEventType('conference...')).toBe('conference');
  });
});


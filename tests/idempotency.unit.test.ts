import { describe, it, expect } from 'vitest';
import { fingerprint, isValidIdempotencyKey } from '../src/idempotency';

describe('fingerprint — канонічний відбиток тіла запиту', () => {
  it('не залежить від порядку ключів, зокрема вкладених', () => {
    expect(fingerprint({ a: 1, b: { c: 2, d: [1, 2] } }))
      .toBe(fingerprint({ b: { d: [1, 2], c: 2 }, a: 1 }));
  });

  it('залежить від порядку елементів масиву й від значень', () => {
    expect(fingerprint({ items: [1, 2] })).not.toBe(fingerprint({ items: [2, 1] }));
    expect(fingerprint({ qty: 1 })).not.toBe(fingerprint({ qty: '1' }));
  });

  it('обробляє null у значеннях', () => {
    expect(fingerprint({ b: null, a: 1 })).toBe('{"a":1,"b":null}');
  });
});

describe('isValidIdempotencyKey — межі довжини', () => {
  it.each([
    [7, false], [8, true], [64, true], [65, false],
  ])('довжина %i → %s', (length, expected) => {
    expect(isValidIdempotencyKey('a'.repeat(length))).toBe(expected);
  });
});

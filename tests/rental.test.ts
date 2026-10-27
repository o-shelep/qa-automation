import { describe, it, expect } from 'vitest';
import { calcRentalCost } from '../src/rental';

describe('calcRentalCost — некоректні дані', () => {
  it.each([0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'відхиляє кількість діб %s',
    (days) => {
      expect(() => calcRentalCost(days)).toThrow('INVALID_DAYS');
    },
  );
});

describe('calcRentalCost — базова ціна', () => {
  it.each([
    { days: 1, expected: 800 },
    { days: 2, expected: 1600 },
    { days: 6, expected: 4800 },
  ])('$days діб → $expected грн', ({ days, expected }) => {
    expect(calcRentalCost(days)).toBe(expected);
  });
});

describe('calcRentalCost — знижка від 7 діб', () => {
  it.each([
    { days: 6, expected: 4800 },
    { days: 7, expected: 5040 },
    { days: 8, expected: 5760 },
  ])('межа 7 діб: $days → $expected грн', ({ days, expected }) => {
    expect(calcRentalCost(days)).toBe(expected);
  });
});
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
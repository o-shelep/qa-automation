import { describe, it, expect } from 'vitest';
import {
  calcRentalCost,
  calcRentalPayment,
  calcDepositRefund,
} from '../src/rental';

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

describe('calcRentalCost — знижка від 30 діб', () => {
  it.each([
    { days: 29, expected: 20880 },
    { days: 30, expected: 18000 },
    { days: 31, expected: 18600 },
  ])('межа 30 діб: $days → $expected грн', ({ days, expected }) => {
    expect(calcRentalCost(days)).toBe(expected);
  });
});

describe('calcRentalPayment', () => {
  it.each([
    { days: 1, rent: 800, totalDue: 2800 },
    { days: 7, rent: 5040, totalDue: 7040 },
    { days: 30, rent: 18000, totalDue: 20000 },
  ])(
    '$days діб: оренда $rent + застава 2000 = $totalDue',
    ({ days, rent, totalDue }) => {
      expect(calcRentalPayment(days)).toEqual({
        rent,
        deposit: 2000,
        totalDue,
      });
    },
  );
});

describe('calcDepositRefund', () => {
  it.each([
    { damage: 0, refund: 2000, extraCharge: 0 },
    { damage: 500, refund: 1500, extraCharge: 0 },
    { damage: 1999, refund: 1, extraCharge: 0 },
    { damage: 2000, refund: 0, extraCharge: 0 },
    { damage: 2001, refund: 0, extraCharge: 1 },
    { damage: 3500, refund: 0, extraCharge: 1500 },
  ])(
    'збитки $damage → повернення $refund, доплата $extraCharge',
    ({ damage, refund, extraCharge }) => {
      expect(calcDepositRefund(damage)).toEqual({ refund, extraCharge });
    },
  );
});
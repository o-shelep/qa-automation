import { describe, it, expect } from 'vitest';
import { applyGiftCard } from '../src/order';

describe('applyGiftCard', () => {
  it('частково оплачує замовлення, коли баланс менший за суму', () => {
    // Arrange
    const total = 1200;
    const cardBalance = 500;
    // Act
    const result = applyGiftCard(total, cardBalance);
    // Assert
    expect(result).toEqual({ toPay: 700, remainingBalance: 0 });
  });

  it('повністю оплачує замовлення і зберігає залишок на картці', () => {
    const result = applyGiftCard(300, 1000);
    expect(result).toEqual({ toPay: 0, remainingBalance: 700 });
  });

  // Межа: баланс картки дорівнює сумі замовлення (500 грн)
  it.each([
    { balance: 499, toPay: 1, remaining: 0 },
    { balance: 500, toPay: 0, remaining: 0 },
    { balance: 501, toPay: 0, remaining: 1 },
  ])(
    'межа «баланс = сума» (гривні): баланс $balance → до сплати $toPay, залишок $remaining',
    ({ balance, toPay, remaining }) => {
      const result = applyGiftCard(500, balance);
      expect(result.toPay).toBeCloseTo(toPay, 2);
      expect(result.remainingBalance).toBeCloseTo(remaining, 2);
    },
  );

  it.each([
    { balance: 499.99, toPay: 0.01, remaining: 0 },
    { balance: 500, toPay: 0, remaining: 0 },
    { balance: 500.01, toPay: 0, remaining: 0.01 },
  ])(
    'межа «баланс = сума» (копійки): баланс $balance → до сплати $toPay, залишок $remaining',
    ({ balance, toPay, remaining }) => {
      const result = applyGiftCard(500, balance);
      expect(result.toPay).toBeCloseTo(toPay, 2);
      expect(result.remainingBalance).toBeCloseTo(remaining, 2);
    },
  );

  it('порожня картка (баланс 0) не змінює суму до сплати', () => {
    expect(applyGiftCard(450, 0)).toEqual({ toPay: 450, remainingBalance: 0 });
  });

  it('нульове замовлення не списує кошти з картки', () => {
    expect(applyGiftCard(0, 200)).toEqual({ toPay: 0, remainingBalance: 200 });
  });

  it('заокруглює результат до копійок і усуває похибку рухомої коми', () => {
    // 0.3 − 0.1 у double дає 0.19999999999999998
    const result = applyGiftCard(0.3, 0.1);
    expect(result.toPay).toBeCloseTo(0.2, 2);
    expect(result.toPay.toString()).toBe('0.2');
  });

  it.each([-0.01, -100, Number.NaN, Number.POSITIVE_INFINITY])(
    'відхиляє некоректну суму замовлення %s',
    (total) => {
      expect(() => applyGiftCard(total, 100)).toThrow('INVALID_TOTAL');
    },
  );

  it.each([-0.01, -50, Number.NaN, Number.POSITIVE_INFINITY])(
    'відхиляє некоректний баланс картки %s',
    (balance) => {
      expect(() => applyGiftCard(100, balance)).toThrow('INVALID_BALANCE');
    },
  );
});

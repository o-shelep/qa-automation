const DAILY_RATE = 800;
const DEPOSIT = 2000;

/** Пороги знижок, від більшого до меншого */
const DISCOUNT_TIERS = [
  { minDays: 30, rate: 0.25 },
  { minDays: 7, rate: 0.1 },
] as const;

export interface RentalPayment {
  rent: number;
  deposit: number;
  totalDue: number;
}

export interface DepositRefund {
  refund: number;
  extraCharge: number;
}

function assertValidDays(days: number): void {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('INVALID_DAYS');
  }
}

export function getDiscountRate(days: number): number {
  const tier = DISCOUNT_TIERS.find((t) => days >= t.minDays);
  return tier ? tier.rate : 0;
}

export function calcRentalCost(days: number): number {
  assertValidDays(days);
  return days * DAILY_RATE * (1 - getDiscountRate(days));
}

export function calcRentalPayment(days: number): RentalPayment {
  const rent = calcRentalCost(days);
  return { rent, deposit: DEPOSIT, totalDue: rent + DEPOSIT };
}

export function calcDepositRefund(damage: number): DepositRefund {
  return {
    refund: Math.max(DEPOSIT - damage, 0),
    extraCharge: Math.max(damage - DEPOSIT, 0),
  };
}
const DAILY_RATE = 800;

/** Пороги знижок, від більшого до меншого */
const DISCOUNT_TIERS = [
  { minDays: 30, rate: 0.25 },
  { minDays: 7, rate: 0.1 },
] as const;

export function getDiscountRate(days: number): number {
  const tier = DISCOUNT_TIERS.find((t) => days >= t.minDays);
  return tier ? tier.rate : 0;
}

export function calcRentalCost(days: number): number {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('INVALID_DAYS');
  }
  return days * DAILY_RATE * (1 - getDiscountRate(days));
}
export function calcRentalCost(days: number): number {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('INVALID_DAYS');
  }
  const base = days * 800;
  if (days >= 30) return base * 0.75;
  if (days >= 7) return base * 0.9;
  return base;
}
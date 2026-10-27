export function calcRentalCost(days: number): number {
  if (!Number.isInteger(days) || days < 1) {
    throw new Error('INVALID_DAYS');
  }
  return days * 800;
}
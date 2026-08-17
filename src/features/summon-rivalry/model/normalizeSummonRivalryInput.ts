export function normalizeSummonCount(value: unknown): number {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numericValue));
}

export function normalizeSummonPurchaseCount(value: unknown): number {
  return Math.floor(normalizeSummonCount(value) / 10) * 10;
}

export function adjustSummonPurchase(
  value: unknown,
  direction: -1 | 1,
): number {
  return Math.max(0, normalizeSummonPurchaseCount(value) + direction * 10);
}

export function normalizeAntiqueCount(value: unknown): number {
  let numeric: number;

  try {
    numeric = typeof value === "number" ? value : Number(value);
  } catch {
    return 0;
  }

  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

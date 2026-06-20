export function toFiniteNumber(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(
    String(value).trim(),
  );

  return Number.isFinite(parsed)
    ? parsed
    : null;
}
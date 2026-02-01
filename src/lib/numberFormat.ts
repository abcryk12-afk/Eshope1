export function formatCompactNumber(input: number) {
  const n = Number(input ?? 0);
  if (!Number.isFinite(n)) return "0";

  const abs = Math.abs(n);

  const fmt = (v: number, suffix: string) => {
    const rounded = Math.round(v * 10) / 10;
    const s = rounded % 1 === 0 ? String(Math.trunc(rounded)) : String(rounded);
    return `${s}${suffix}`;
  };

  if (abs < 1000) return String(Math.trunc(n));
  if (abs < 1_000_000) return fmt(n / 1000, "k");
  if (abs < 1_000_000_000) return fmt(n / 1_000_000, "M");
  return fmt(n / 1_000_000_000, "B");
}

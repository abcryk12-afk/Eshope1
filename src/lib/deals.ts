export type DealType = "percent" | "fixed";

export type ActiveDeal = {
  id: string;
  name: string;
  type: DealType;
  value: number;
  priority: number;
  expiresAt: string;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeDealPrice(args: { original: number; type: DealType; value: number }) {
  const original = Math.max(0, Number(args.original) || 0);
  const value = Math.max(0, Number(args.value) || 0);

  if (args.type === "percent") {
    const pct = Math.min(100, value);
    return round2(Math.max(0, original * (1 - pct / 100)));
  }

  return round2(Math.max(0, original - value));
}

export function buildDealLabel(args: { type: DealType; value: number }) {
  const value = Math.max(0, Number(args.value) || 0);
  return args.type === "percent"
    ? `${Math.round(value)}% OFF`
    : `PKR ${Math.round(value)} OFF`;
}

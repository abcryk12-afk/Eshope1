
export type CurrencyCode = "PKR" | "USD";

export function convertFromPkr(
  amountPkr: number,
  currency: CurrencyCode,
  pkrPerUsd: number | null | undefined
) {
  const n = Number(amountPkr ?? 0);

  if (currency === "USD") {
    const rate =
      typeof pkrPerUsd === "number" &&
      Number.isFinite(pkrPerUsd) &&
      pkrPerUsd > 0
        ? pkrPerUsd
        : null;

    return rate ? n / rate : null;
  }

  return n;
}

export function formatMoneyFromPkr(
  amountPkr: number,
  currency: CurrencyCode,
  pkrPerUsd: number | null | undefined
) {
  const v = convertFromPkr(amountPkr, currency, pkrPerUsd);

  if (currency === "USD") {
    if (v === null) return "$—";

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(v);
  }

  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));
}


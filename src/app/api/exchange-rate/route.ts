import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Cache = {
  pkrPerUsd: number;
  fetchedAt: string;
  expiresAt: number;
};

function getCache(): Cache | null {
  const g = globalThis as unknown as { __shopRateCache?: Cache };
  const c = g.__shopRateCache;
  if (!c) return null;
  if (Date.now() > c.expiresAt) return null;
  return c;
}

function setCache(next: Cache) {
  const g = globalThis as unknown as { __shopRateCache?: Cache };
  g.__shopRateCache = next;
}

export async function GET() {
  const cached = getCache();
  if (cached) {
    return NextResponse.json({ pkrPerUsd: cached.pkrPerUsd, fetchedAt: cached.fetchedAt });
  }

  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  const json = (await res.json().catch(() => null)) as unknown;

  if (!res.ok || !json || typeof json !== "object") {
    return NextResponse.json({ message: "Failed to load exchange rate" }, { status: 502 });
  }

  const rates = (json as { rates?: unknown }).rates;
  const pkr = (rates as { PKR?: unknown } | null)?.PKR;

  if (typeof pkr !== "number" || !Number.isFinite(pkr) || pkr <= 0) {
    return NextResponse.json({ message: "Invalid exchange rate" }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  setCache({ pkrPerUsd: pkr, fetchedAt, expiresAt: Date.now() + 30 * 60 * 1000 });

  return NextResponse.json({ pkrPerUsd: pkr, fetchedAt });
}


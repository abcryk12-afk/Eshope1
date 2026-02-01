"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  hydrateCurrency,
  refreshExchangeRate,
  type CurrencyCode,
  type CurrencyState,
} from "@/store/slices/currencySlice";

const CURRENCY_KEY = "shop.currency.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readSelected(v: unknown): CurrencyCode | null {
  return v === "PKR" || v === "USD" ? v : null;
}

function readNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function parseState(raw: string): Partial<CurrencyState> {
  const json = JSON.parse(raw) as unknown;
  if (!isRecord(json)) return {};

  const selected = readSelected(json.selected);
  const pkrPerUsd = readNumber(json.pkrPerUsd);
  const updatedAt = readString(json.updatedAt);

  return {
    selected: selected ?? undefined,
    pkrPerUsd: pkrPerUsd ?? undefined,
    updatedAt: updatedAt ?? undefined,
  };
}

function isStale(updatedAt: string | null, maxAgeMs: number) {
  if (!updatedAt) return true;
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > maxAgeMs;
}

export function useCurrencySync() {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.currency);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(CURRENCY_KEY);
    if (!raw) return;

    try {
      dispatch(hydrateCurrency(parseState(raw)));
    } catch {
      return;
    }
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload = {
      selected: currency.selected,
      pkrPerUsd: currency.pkrPerUsd,
      updatedAt: currency.updatedAt,
    };

    window.localStorage.setItem(CURRENCY_KEY, JSON.stringify(payload));
  }, [currency.selected, currency.pkrPerUsd, currency.updatedAt]);

  useEffect(() => {
    if (currency.selected !== "USD") return;

    const stale = isStale(currency.updatedAt, 30 * 60 * 1000);
    if (currency.pkrPerUsd && !stale) return;

    void dispatch(refreshExchangeRate());
  }, [currency.selected, currency.pkrPerUsd, currency.updatedAt, dispatch]);
}


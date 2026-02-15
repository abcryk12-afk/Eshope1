"use client";

import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  hydrateProductCardEngine,
  type ProductCardEngineState,
} from "@/store/productCardEngineSlice";

const KEY = "shop.productCardEngine.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function read(raw: string | null): Partial<ProductCardEngineState> | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  return parsed as Partial<ProductCardEngineState>;
}

export function useProductCardEngineSync() {
  const dispatch = useAppDispatch();
  const engine = useAppSelector((s) => s.productCardEngine);

  const latestRef = useRef(engine);
  useEffect(() => {
    latestRef.current = engine;
  }, [engine]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = read(window.localStorage.getItem(KEY));
    if (next) dispatch(hydrateProductCardEngine(next));
  }, [dispatch]);

  const serialized = useMemo(() => JSON.stringify(engine), [engine]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, serialized);
  }, [serialized]);
}

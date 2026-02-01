"use client";

import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateCart, type CartItem } from "@/store/slices/cartSlice";
import { hydrateWishlist } from "@/store/slices/wishlistSlice";

function mergeCart(localItems: CartItem[], dbItems: CartItem[]) {
  const merged = new Map<string, CartItem>();

  for (const item of [...dbItems, ...localItems]) {
    const key = `${item.productId}:${item.variantId}`;
    const prev = merged.get(key);

    if (!prev) {
      merged.set(key, { ...item });
      continue;
    }

    merged.set(key, {
      ...prev,
      ...item,
      quantity: Math.max(prev.quantity, item.quantity),
    });
  }

  return [...merged.values()];
}

export function useDbSync() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const cartItems = useAppSelector((s) => s.cart.items);
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);

  const cartSnapshotRef = useRef<CartItem[]>([]);
  const wishlistSnapshotRef = useRef<string[]>([]);

  const hydratedRef = useRef(false);
  const cartSyncTimerRef = useRef<number | null>(null);
  const wishlistSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    cartSnapshotRef.current = cartItems;
  }, [cartItems]);

  useEffect(() => {
    wishlistSnapshotRef.current = wishlistIds;
  }, [wishlistIds]);

  useEffect(() => {
    if (!user?.id) {
      hydratedRef.current = false;
      return;
    }

    let cancelled = false;

    async function hydrateFromDb() {
      const [cartRes, wishlistRes] = await Promise.all([
        fetch("/api/user/cart", { cache: "no-store" }),
        fetch("/api/user/wishlist", { cache: "no-store" }),
      ]);

      if (cancelled) return;

      if (cartRes.ok) {
        const data = (await cartRes.json()) as { items: CartItem[] };
        const merged = mergeCart(cartSnapshotRef.current, data.items ?? []);
        dispatch(hydrateCart(merged));
      }

      if (wishlistRes.ok) {
        const data = (await wishlistRes.json()) as { productIds: string[] };
        const merged = Array.from(
          new Set([...(data.productIds ?? []), ...wishlistSnapshotRef.current])
        );
        dispatch(hydrateWishlist(merged));
      }

      hydratedRef.current = true;
    }

    hydrateFromDb();

    return () => {
      cancelled = true;
    };
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (!user?.id) return;
    if (!hydratedRef.current) return;

    if (cartSyncTimerRef.current) {
      window.clearTimeout(cartSyncTimerRef.current);
    }

    cartSyncTimerRef.current = window.setTimeout(async () => {
      const payload = cartItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      }));

      await fetch("/api/user/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }, 500);

    return () => {
      if (cartSyncTimerRef.current) {
        window.clearTimeout(cartSyncTimerRef.current);
        cartSyncTimerRef.current = null;
      }
    };
  }, [cartItems, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (!hydratedRef.current) return;

    if (wishlistSyncTimerRef.current) {
      window.clearTimeout(wishlistSyncTimerRef.current);
    }

    wishlistSyncTimerRef.current = window.setTimeout(async () => {
      await fetch("/api/user/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wishlistIds),
      });
    }, 500);

    return () => {
      if (wishlistSyncTimerRef.current) {
        window.clearTimeout(wishlistSyncTimerRef.current);
        wishlistSyncTimerRef.current = null;
      }
    };
  }, [wishlistIds, user?.id]);
}

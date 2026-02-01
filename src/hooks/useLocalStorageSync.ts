"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateCart } from "@/store/slices/cartSlice";
import { hydrateWishlist } from "@/store/slices/wishlistSlice";

const CART_KEY = "shop.cart.v1";
const WISHLIST_KEY = "shop.wishlist.v1";

export function useLocalStorageSync() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const wishlistIds = useAppSelector((s) => s.wishlist.productIds);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(CART_KEY);

    if (!raw) return;

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return;

    dispatch(hydrateCart(parsed));
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(WISHLIST_KEY);

    if (!raw) return;

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return;

    dispatch(hydrateWishlist(parsed.filter((v) => typeof v === "string")));
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistIds));
  }, [wishlistIds]);
}

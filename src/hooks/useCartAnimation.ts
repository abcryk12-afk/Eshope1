"use client";

import { useCallback, useRef } from "react";

import { animateFlyToCart } from "@/lib/animateFlyToCart";
import { confettiBurstFromElement } from "@/lib/confettiBurst";

type RunCartAnimationArgs = {
  imageEl: HTMLElement | null;
  onComplete: () => void;
};

function getCartIconEl(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-cart-icon='true']");
}

function bounceAndPulseCartIcon(cartIconEl: HTMLElement) {
  cartIconEl.classList.remove("cart-icon-bounce");
  cartIconEl.classList.remove("cart-icon-pulse");

  void cartIconEl.offsetWidth;

  cartIconEl.classList.add("cart-icon-bounce");
  cartIconEl.classList.add("cart-icon-pulse");

  window.setTimeout(() => {
    cartIconEl.classList.remove("cart-icon-bounce");
    cartIconEl.classList.remove("cart-icon-pulse");
  }, 320);
}

export function useCartAnimation() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const run = useCallback(async ({ imageEl, onComplete }: RunCartAnimationArgs) => {
    if (typeof window === "undefined") {
      onComplete();
      return;
    }

    const cartIconEl = getCartIconEl();

    if (!imageEl || !cartIconEl) {
      onComplete();
      return;
    }

    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    await animateFlyToCart(imageEl, cartIconEl, { durationMs: 600 });

    bounceAndPulseCartIcon(cartIconEl);
    cleanupRef.current = confettiBurstFromElement(cartIconEl, { durationMs: 800, particleCount: 18 });

    window.setTimeout(() => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }, 900);

    onComplete();
  }, []);

  return { run };
}

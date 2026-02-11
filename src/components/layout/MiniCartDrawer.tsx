"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";

import { formatMoneyFromPkr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  removeFromCart,
  setCartItemQuantity,
  type CartItem,
} from "@/store/slices/cartSlice";

type MiniCartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

function lineTotal(i: CartItem) {
  const price = typeof i.unitPrice === "number" ? i.unitPrice : 0;
  return price * i.quantity;
}

export default function MiniCartDrawer({ open, onClose }: MiniCartDrawerProps) {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const currency = useAppSelector((s) => s.currency);

  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }

    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setMounted(true);
      window.setTimeout(() => setVisible(true), 0);
      return;
    }

    setVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, 300);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  const subtotal = items.reduce((acc, i) => acc + lineTotal(i), 0);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm",
        "transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
      role="presentation"
    >
      <aside
        className={cn(
          "absolute bg-surface shadow-2xl",
          isMobile ? "inset-x-0 bottom-0 h-[85dvh] w-full border-t border-border" : "right-0 top-0 h-full w-full max-w-md border-l border-border",
          "transition-transform duration-300",
          visible
            ? "translate-x-0 translate-y-0"
            : isMobile
              ? "translate-y-full"
              : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Cart"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">Cart</h2>
              <p className="text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "item" : "items"}
              </p>
            </div>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
              onClick={onClose}
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <p className="text-sm font-medium text-foreground">Your cart is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add items to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((i) => (
                      <div
                        key={`${i.productId}:${i.variantId}`}
                        className="flex gap-3 rounded-2xl border border-border p-3"
                      >
                        <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted">
                          {i.image ? (
                            <Image
                              src={i.image}
                              alt={i.title ?? "Product"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{i.title ?? "Item"}</p>
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted"
                              onClick={() =>
                                dispatch(
                                  removeFromCart({
                                    productId: i.productId,
                                    variantId: i.variantId,
                                  })
                                )
                              }
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-xl border border-border p-1">
                              <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                                onClick={() =>
                                  dispatch(
                                    setCartItemQuantity({
                                      productId: i.productId,
                                      variantId: i.variantId,
                                      quantity: i.quantity - 1,
                                    })
                                  )
                                }
                                aria-label="Decrease"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-foreground">{i.quantity}</span>
                              <button
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                                onClick={() =>
                                  dispatch(
                                    setCartItemQuantity({
                                      productId: i.productId,
                                      variantId: i.variantId,
                                      quantity: i.quantity + 1,
                                    })
                                  )
                                }
                                aria-label="Increase"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <p className="text-sm font-semibold text-foreground">
                              {formatMoneyFromPkr(lineTotal(i), currency.selected, currency.pkrPerUsd)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

          <div className="shrink-0 border-t border-border bg-surface px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold text-foreground">
                {formatMoneyFromPkr(subtotal, currency.selected, currency.pkrPerUsd)}
              </span>
            </div>

            {items.length === 0 ? (
              <Link href="/" onClick={onClose} className="mt-3 block">
                <Button className="w-full">Browse products</Button>
              </Link>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <Link href="/checkout" onClick={onClose} className="block">
                  <Button variant="accent" size="lg" className="w-full">Checkout</Button>
                </Link>
                <Link href="/cart" onClick={onClose} className="block">
                  <Button variant="secondary" size="lg" className="w-full">View cart</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

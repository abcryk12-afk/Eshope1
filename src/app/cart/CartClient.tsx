"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { removeFromCart, setCartItemQuantity } from "@/store/slices/cartSlice";

type QuoteLine = {
  productId: string;
  variantId: string;
  title: string;
  slug: string;
  image: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  message?: string;
};

type QuoteResponse = {
  items: QuoteLine[];
  itemsSubtotal: number;
  discountAmount: number;
  shippingAmount: number;
  shippingFreeAboveSubtotal?: number | null;
  shippingRemainingForFree?: number | null;
  shippingIsFree?: boolean;
  taxAmount: number;
  totalAmount: number;
};

export default function CartClient() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((s) => s.cart.items);
  const currency = useAppSelector((s) => s.currency);

  const payloadItems = useMemo(
    () =>
      cartItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    [cartItems]
  );

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  useEffect(() => {
    if (payloadItems.length === 0) {
      setQuote({
        items: [],
        itemsSubtotal: 0,
        discountAmount: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
      });
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      const res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });

      if (cancelled) return;

      if (!res.ok) {
        setQuote(null);
        setLoading(false);
        return;
      }

      const data = (await res.json()) as QuoteResponse;
      setQuote(data);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(payloadItems)]);

  if (loading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-96 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>

        {quote?.items?.length ? (
          <div className="mt-4 space-y-3">
            {quote.items.map((i) => {
              const savedTotal =
                typeof i.originalUnitPrice === "number" && i.originalUnitPrice > i.unitPrice
                  ? Math.max(0, (i.originalUnitPrice - i.unitPrice) * i.quantity)
                  : 0;

              return (
                <div
                  key={`${i.productId}:${i.variantId}`}
                  className={cn(
                    "flex gap-3 rounded-2xl border p-3",
                    i.isAvailable
                      ? "border-border"
                      : "border-destructive/40 bg-destructive/10"
                  )}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-muted">
                    {i.image ? (
                      <Image
                        src={i.image}
                        alt={i.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/product/${i.slug}`}
                          className="line-clamp-2 text-sm font-semibold text-foreground hover:underline"
                        >
                          {i.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="text-muted-foreground">
                            {formatMoneyFromPkr(i.unitPrice, currency.selected, currency.pkrPerUsd)}
                          </span>
                          {typeof i.originalUnitPrice === "number" && i.originalUnitPrice > i.unitPrice ? (
                            <span className="text-muted-foreground line-through">
                              {formatMoneyFromPkr(i.originalUnitPrice, currency.selected, currency.pkrPerUsd)}
                            </span>
                          ) : null}
                        </div>
                        {savedTotal > 0 ? (
                          <p className="mt-1 text-xs font-medium text-success">
                            You saved {formatMoneyFromPkr(savedTotal, currency.selected, currency.pkrPerUsd)}
                          </p>
                        ) : null}
                        {!i.isAvailable ? (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {i.message ?? "Not available"}
                          </p>
                        ) : null}
                      </div>

                      <p className="shrink-0 text-sm font-semibold text-foreground">
                        {formatMoneyFromPkr(i.lineTotal, currency.selected, currency.pkrPerUsd)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl border border-border p-1">
                        <button
                          type="button"
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
                          -
                        </button>
                        <span className="w-10 text-center text-sm font-medium text-foreground">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
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
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          dispatch(
                            removeFromCart({
                              productId: i.productId,
                              variantId: i.variantId,
                            })
                          )
                        }
                        className="text-sm font-medium text-muted-foreground hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Your cart is empty.</p>
        )}
      </div>

      <aside className="h-fit rounded-3xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Summary</h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">
              {formatMoneyFromPkr(quote?.itemsSubtotal ?? 0, currency.selected, currency.pkrPerUsd)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-semibold text-foreground">
              {Number(quote?.shippingAmount ?? 0) <= 0
                ? "Free"
                : formatMoneyFromPkr(quote?.shippingAmount ?? 0, currency.selected, currency.pkrPerUsd)}
            </span>
          </div>

          {quote?.shippingIsFree ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-3 text-xs font-medium text-success">
              Free Delivery Applied
            </div>
          ) : (quote?.shippingRemainingForFree ?? 0) > 0 ? (
            <div className="rounded-2xl border border-border bg-muted p-3 text-xs text-foreground-secondary">
              Spend {formatMoneyFromPkr(quote?.shippingRemainingForFree ?? 0, currency.selected, currency.pkrPerUsd)} more for free delivery
            </div>
          ) : null}

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold text-foreground">
                {formatMoneyFromPkr(quote?.totalAmount ?? 0, currency.selected, currency.pkrPerUsd)}
              </span>
            </div>
          </div>
        </div>

        <Link href="/checkout" className={cn("mt-4 block", (!quote?.items?.length || quote.items.some((i) => !i.isAvailable)) && "pointer-events-none opacity-50")}>
          <Button variant="accent" className="w-full">Go to checkout</Button>
        </Link>

        {quote?.items?.some((i) => !i.isAvailable) ? (
          <p className="mt-3 text-sm text-destructive">
            Fix unavailable items before checkout.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

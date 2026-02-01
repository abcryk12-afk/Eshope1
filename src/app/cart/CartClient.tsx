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
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Items</h2>

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
                      ? "border-zinc-200 dark:border-zinc-800"
                      : "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
                  )}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
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
                          className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                        >
                          {i.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="text-zinc-500">
                            {formatMoneyFromPkr(i.unitPrice, currency.selected, currency.pkrPerUsd)}
                          </span>
                          {typeof i.originalUnitPrice === "number" && i.originalUnitPrice > i.unitPrice ? (
                            <span className="text-zinc-400 line-through">
                              {formatMoneyFromPkr(i.originalUnitPrice, currency.selected, currency.pkrPerUsd)}
                            </span>
                          ) : null}
                        </div>
                        {savedTotal > 0 ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            You saved {formatMoneyFromPkr(savedTotal, currency.selected, currency.pkrPerUsd)}
                          </p>
                        ) : null}
                        {!i.isAvailable ? (
                          <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                            {i.message ?? "Not available"}
                          </p>
                        ) : null}
                      </div>

                      <p className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {formatMoneyFromPkr(i.lineTotal, currency.selected, currency.pkrPerUsd)}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl border border-zinc-200 p-1 dark:border-zinc-800">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
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
                        <span className="w-10 text-center text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
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
                        className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
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
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Your cart is empty.</p>
        )}
      </div>

      <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Summary</h2>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Subtotal</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatMoneyFromPkr(quote?.itemsSubtotal ?? 0, currency.selected, currency.pkrPerUsd)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">Shipping</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {Number(quote?.shippingAmount ?? 0) <= 0
                ? "Free"
                : formatMoneyFromPkr(quote?.shippingAmount ?? 0, currency.selected, currency.pkrPerUsd)}
            </span>
          </div>

          {quote?.shippingIsFree ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              Free Delivery Applied
            </div>
          ) : (quote?.shippingRemainingForFree ?? 0) > 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-300">
              Spend {formatMoneyFromPkr(quote?.shippingRemainingForFree ?? 0, currency.selected, currency.pkrPerUsd)} more for free delivery
            </div>
          ) : null}

          <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Total</span>
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {formatMoneyFromPkr(quote?.totalAmount ?? 0, currency.selected, currency.pkrPerUsd)}
              </span>
            </div>
          </div>
        </div>

        <Link href="/checkout" className={cn("mt-4 block", (!quote?.items?.length || quote.items.some((i) => !i.isAvailable)) && "pointer-events-none opacity-50")}>
          <Button className="w-full">Go to checkout</Button>
        </Link>

        {quote?.items?.some((i) => !i.isAvailable) ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            Fix unavailable items before checkout.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

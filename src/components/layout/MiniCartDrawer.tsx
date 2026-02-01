"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, X } from "lucide-react";

import { formatMoneyFromPkr } from "@/lib/currency";
import { cn } from "@/lib/utils";
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

  const subtotal = items.reduce((acc, i) => acc + lineTotal(i), 0);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            className={cn(
              "absolute right-0 top-0 h-full w-full max-w-md",
              "border-l border-border bg-surface shadow-2xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Cart
                </h2>
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

            <div className="flex h-[calc(100%-160px)] flex-col overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <p className="text-sm font-medium text-foreground">
                    Your cart is empty
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add items to see them here.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                    onClick={onClose}
                  >
                    Browse products
                  </Link>
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
                          <p className="truncate text-sm font-medium text-foreground">
                            {i.title ?? "Item"}
                          </p>
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
                            <span className="w-8 text-center text-sm font-medium text-foreground">
                              {i.quantity}
                            </span>
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

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold text-foreground">
                  {formatMoneyFromPkr(subtotal, currency.selected, currency.pkrPerUsd)}
                </span>
              </div>

              <Link
                href="/cart"
                className={cn(
                  "mt-3 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold",
                  "bg-primary text-primary-foreground hover:bg-primary-hover",
                  items.length === 0 && "pointer-events-none opacity-50"
                )}
                onClick={onClose}
              >
                View cart
              </Link>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

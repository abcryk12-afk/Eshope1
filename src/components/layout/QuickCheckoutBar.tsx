"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useStorefrontSettings } from "@/hooks/useStorefrontSettings";
import { useAppSelector } from "@/store/hooks";

export default function QuickCheckoutBar() {
  const pathname = usePathname();
  const { settings } = useStorefrontSettings();
  const enabled = settings?.cartUx?.quickCheckoutEnabled ?? true;
  const autoHideSeconds = settings?.cartUx?.quickCheckoutAutoHideSeconds ?? 4;

  const lastAddedAt = useAppSelector((s) => s.cart.lastAddedAt);
  const lastAdded = useAppSelector((s) => s.cart.lastAdded);
  const cartCount = useAppSelector((s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0));

  const [open, setOpen] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const shouldShow = useMemo(() => {
    if (!enabled) return false;
    return lastAddedAt > 0;
  }, [enabled, lastAddedAt]);

  useEffect(() => {
    if (!shouldShow) return;

    setOpen(true);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const secs = Math.max(1, Math.min(30, Math.trunc(Number(autoHideSeconds) || 4)));

    hideTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, secs * 1000);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [autoHideSeconds, shouldShow, lastAddedAt]);

  useEffect(() => {
    if (!pathname) return;
    if (!pathname.startsWith("/checkout") && !pathname.startsWith("/cart")) return;

    setOpen(false);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [pathname]);

  if (!enabled) return null;
  if (pathname?.startsWith("/checkout")) return null;
  if (pathname?.startsWith("/cart")) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-4 pb-4",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-3xl",
          "rounded-3xl border border-border bg-surface shadow-2xl",
          "transition duration-200",
          open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        )}
        role="status"
      >
        <div className="flex items-start gap-3 p-4">
          {lastAdded?.image ? (
            <div className="relative mt-0.5 h-10 w-10 overflow-hidden rounded-2xl bg-muted">
              <Image
                src={lastAdded.image}
                alt={lastAdded.title || "Added item"}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Item added to cart</p>
            {lastAdded?.title ? (
              <p className="mt-0.5 line-clamp-1 text-sm text-foreground/80">{lastAdded.title}</p>
            ) : null}
            <p className="mt-0.5 text-sm text-muted-foreground">
              {cartCount} {cartCount === 1 ? "item" : "items"} in cart
            </p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                Continue shopping
              </Button>
              <Link href="/checkout" className="w-full sm:w-auto" onClick={() => setOpen(false)}>
                <Button type="button" className="w-full sm:w-auto">Go to checkout</Button>
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { memo, useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

type Props = {
  onClick: () => void;
};

function CartCountBadge({ count }: { count: number }) {
  const prevRef = useRef<number>(count);
  const [anim, setAnim] = useState<null | { prev: number; next: number }>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = count;

    if (count <= prev) {
      setAnim(null);
      return;
    }

    setAnim({ prev, next: count });

    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];

    const t = window.setTimeout(() => setAnim(null), 320);
    timersRef.current.push(t);

    return () => {
      timersRef.current.forEach((x) => window.clearTimeout(x));
      timersRef.current = [];
    };
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1",
        "text-[11px] font-semibold text-primary-foreground"
      )}
      aria-label={`${count} items in cart`}
    >
      <span className="relative inline-flex items-center justify-center">
        {anim ? (
          <>
            <span style={{ animation: "cartCountOut 300ms ease forwards" }}>{anim.prev}</span>
            <span
              className="absolute left-1/2 top-1/2"
              style={{
                transform: "translate(-50%, -50%)",
                animation: "cartCountIn 300ms ease forwards, cartCountPop 300ms ease forwards",
              }}
            >
              {anim.next}
            </span>
          </>
        ) : (
          <span>{count}</span>
        )}
      </span>
    </span>
  );
}

function CartIconButtonImpl({ onClick }: Props) {
  const cartCount = useAppSelector((s) => s.cart.items.reduce((acc, i) => acc + i.quantity, 0));

  return (
    <button
      type="button"
      data-cart-icon="true"
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium",
        "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onClick}
      aria-label="Open cart"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="hidden md:inline">Cart</span>
      <CartCountBadge count={cartCount} />
    </button>
  );
}

const CartIconButton = memo(CartIconButtonImpl);
export default CartIconButton;

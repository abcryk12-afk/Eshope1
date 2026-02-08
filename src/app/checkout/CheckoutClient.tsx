"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { formatMoneyFromPkr } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearCart, removeFromCart, setCartItemQuantity } from "@/store/slices/cartSlice";

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
  couponDiscountAmount?: number;
  promotionDiscountAmount?: number;
  shippingAmount: number;
  shippingFreeAboveSubtotal?: number | null;
  shippingRemainingForFree?: number | null;
  shippingIsFree?: boolean;
  taxAmount: number;
  totalAmount: number;
  deliveryEta?: { minDays: number; maxDays: number; text: string };
  coupon?: { code: string; ok: boolean; message?: string };
  promotion?: { id: string; name: string };
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type PaymentAccount = {
  label?: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  iban?: string;
};

type PaymentsSettings = {
  codEnabled: boolean;
  manual: { enabled: boolean; instructions: string; accounts: PaymentAccount[] };
  online: { enabled: boolean; provider: string; instructions: string };
};

type PaymentsApiResponse = { payments: PaymentsSettings };

 function isRecord(v: unknown): v is Record<string, unknown> {
   return typeof v === "object" && v !== null;
 }

 function readMessage(json: unknown): string | undefined {
   if (!isRecord(json)) return undefined;
   const m = json.message;
   return typeof m === "string" ? m : undefined;
 }

export default function CheckoutClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const isGuest = !session?.user?.id;

  const cartItems = useAppSelector((s) => s.cart.items);
  const currency = useAppSelector((s) => s.currency);

  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [refreshingQuote, setRefreshingQuote] = useState(false);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "manual" | "online">("cod");
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  const [paymentSettings, setPaymentSettings] = useState<PaymentsSettings | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [guestEmail, setGuestEmail] = useState("");
  const [guestEmailTouched, setGuestEmailTouched] = useState(false);

  const [shipping, setShipping] = useState<ShippingAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  });

  const payloadItems = useMemo(
    () =>
      cartItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    [cartItems]
  );

  const couponCodeRef = useRef("");

  const shippingRef = useRef<ShippingAddress>(shipping);

  const guestEmailRef = useRef(guestEmail);

  useEffect(() => {
    couponCodeRef.current = couponCode;
  }, [couponCode]);

  useEffect(() => {
    shippingRef.current = shipping;
  }, [shipping]);

  useEffect(() => {
    guestEmailRef.current = guestEmail;
  }, [guestEmail]);

  const guestEmailOk = useMemo(() => {
    if (!isGuest) return true;
    const e = guestEmail.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }, [guestEmail, isGuest]);

  const canPlace = useMemo(() => {
    if (!quote) return false;
    if (quote.items.length === 0) return false;
    if (quote.items.some((i) => !i.isAvailable)) return false;

    if (currency.selected === "USD" && !currency.pkrPerUsd) return false;

    const codAllowed = currency.selected !== "USD" && (paymentSettings?.codEnabled ?? true);
    const manualAllowed = paymentSettings?.manual?.enabled ?? true;
    const onlineAllowed = paymentSettings?.online?.enabled ?? false;

    if (paymentMethod === "cod" && !codAllowed) return false;
    if (paymentMethod === "manual" && !manualAllowed) return false;
    if (paymentMethod === "online" && !onlineAllowed) return false;

    if (!guestEmailOk) return false;

    if (!shipping.fullName.trim()) return false;
    if (!shipping.phone.trim()) return false;
    if (!shipping.addressLine1.trim()) return false;
    if (!shipping.city.trim()) return false;
    if (!shipping.state.trim()) return false;
    if (!shipping.postalCode.trim()) return false;
    if (!shipping.country.trim()) return false;

    return true;
  }, [quote, shipping, guestEmailOk, currency.selected, currency.pkrPerUsd, paymentMethod, paymentSettings]);

  const shippingOk = useMemo(() => {
    if (!quote) return false;
    if (quote.items.length === 0) return false;
    if (quote.items.some((i) => !i.isAvailable)) return false;

    if (currency.selected === "USD" && !currency.pkrPerUsd) return false;
    if (!guestEmailOk) return false;

    if (!shipping.fullName.trim()) return false;
    if (!shipping.phone.trim()) return false;
    if (!shipping.addressLine1.trim()) return false;
    if (!shipping.city.trim()) return false;
    if (!shipping.state.trim()) return false;
    if (!shipping.postalCode.trim()) return false;
    if (!shipping.country.trim()) return false;

    return true;
  }, [quote, shipping, guestEmailOk, currency.selected, currency.pkrPerUsd]);

  function continueToPayment() {
    if (!shippingOk) {
      toast.error("Please complete your shipping details");
      return;
    }
    setStep("payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPayments() {
      setLoadingPayments(true);
      const res = await fetch("/api/payments", { cache: "no-store" }).catch(() => null);

      if (!res || !res.ok) {
        if (!cancelled) {
          setPaymentSettings(null);
          setLoadingPayments(false);
        }
        return;
      }

      const json = (await res.json().catch(() => null)) as PaymentsApiResponse | null;
      if (!cancelled) {
        setPaymentSettings(json?.payments ?? null);
        setLoadingPayments(false);
      }
    }

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, []);

  const codAllowed = currency.selected !== "USD" && (paymentSettings?.codEnabled ?? true);
  const manualAllowed = paymentSettings?.manual?.enabled ?? true;
  const onlineAllowed = paymentSettings?.online?.enabled ?? false;

  useEffect(() => {
    if (loadingPayments) return;

    const available: Array<"cod" | "manual" | "online"> = [];
    if (onlineAllowed) available.push("online");
    if (manualAllowed) available.push("manual");
    if (codAllowed) available.push("cod");

    if (available.length === 0) return;

    if (!available.includes(paymentMethod)) {
      setPaymentMethod(available[0]);
    }
  }, [paymentMethod, codAllowed, manualAllowed, onlineAllowed, loadingPayments]);

  const loadQuote = useCallback(
    async (
      nextCouponCode?: string,
      mode: "initial" | "refresh" = "refresh",
      source: "auto" | "user" = "auto"
    ) => {
    const effectiveCouponCode =
      typeof nextCouponCode === "string" ? nextCouponCode : couponCodeRef.current;

    const guestEmailValue = guestEmailRef.current.trim().toLowerCase();
    const guestEmailOkNow = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmailValue);

    if (mode === "initial") setLoadingQuote(true);
    else setRefreshingQuote(true);

    let res: Response | null = null;
    try {
      res = await fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: payloadItems,
          couponCode: effectiveCouponCode,
          guestEmail: isGuest && guestEmailOkNow ? guestEmailValue : undefined,
          shippingAddress: shippingRef.current,
        }),
      });
    } catch {
      if (source === "user") toast.error("Network error. Please try again.");
      if (mode === "initial") {
        setQuote(null);
        setLoadingQuote(false);
      }
      setRefreshingQuote(false);
      return null;
    }

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as unknown;
      const msg = readMessage(json) ?? "Failed to refresh quote";

      if (source === "user") toast.error(msg);

      if (mode === "initial") {
        setQuote(null);
        setLoadingQuote(false);
      }
      setRefreshingQuote(false);
      return null;
    }

    const data = (await res.json()) as QuoteResponse;
    setQuote(data);

    if (mode === "initial") setLoadingQuote(false);
    setRefreshingQuote(false);

    return data;
  },
    [payloadItems, isGuest]
  );

  useEffect(() => {
    if (payloadItems.length === 0) return;

    const t = window.setTimeout(() => {
      void loadQuote(undefined, "initial");
    }, 0);

    return () => window.clearTimeout(t);
  }, [payloadItems, loadQuote]);

  useEffect(() => {
    if (payloadItems.length === 0) return;
    if (loadingQuote) return;

    const t = window.setTimeout(() => {
      void loadQuote(undefined, "refresh");
    }, 450);

    return () => window.clearTimeout(t);
  }, [shipping.city, shipping.state, shipping.country, payloadItems.length, loadingQuote, loadQuote]);

  useEffect(() => {
    if (!isGuest) return;
    if (!guestEmailOk) return;
    if (!couponCodeRef.current.trim()) return;
    if (payloadItems.length === 0) return;
    if (loadingQuote) return;

    const t = window.setTimeout(() => {
      void loadQuote(undefined, "refresh");
    }, 450);

    return () => window.clearTimeout(t);
  }, [guestEmail, guestEmailOk, isGuest, payloadItems.length, loadingQuote, loadQuote]);

  async function applyCoupon() {
    const next = couponInput.trim().toUpperCase();
    setCouponCode(next);

    const data = await loadQuote(next, "refresh", "user");

    if (!data) return;

    if (data?.coupon?.ok) {
      toast.success("Coupon applied");
    } else if (data?.coupon?.message) {
      toast.error(data.coupon.message);
    }
  }

  async function placeOrder() {
    if (!canPlace) return;

    if (currency.selected === "USD" && !currency.pkrPerUsd) {
      toast.error("Exchange rate is not available yet. Please try again.");
      return;
    }

    setPlacing(true);

    const payload: Record<string, unknown> = {
      items: payloadItems,
      couponCode,
      shippingAddress: shipping,
      paymentMethod,
      currency: currency.selected,
      pkrPerUsd: currency.selected === "USD" ? currency.pkrPerUsd : undefined,
    };

    if (isGuest) {
      payload.guestEmail = guestEmail.trim().toLowerCase();
    }

    const res = await fetch("/api/checkout/place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json().catch(() => null)) as
      | { orderId?: string; message?: string }
      | null;

    setPlacing(false);

    if (!res.ok) {
      toast.error(data?.message ?? "Could not place order");
      return;
    }

    dispatch(clearCart());
    toast.success("Order placed");
    const orderId = data?.orderId;

    if (orderId) {
      if (isGuest) {
        const email = guestEmail.trim().toLowerCase();
        router.push(`/order/${encodeURIComponent(orderId)}?email=${encodeURIComponent(email)}`);
      } else {
        router.push(`/order/${encodeURIComponent(orderId)}`);
      }
    } else {
      router.push(isGuest ? "/" : "/account");
    }
    router.refresh();
  }

  if (payloadItems.length === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-3xl rounded-3xl border border-border bg-surface p-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Checkout
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-6 inline-flex text-sm font-semibold text-foreground hover:underline"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  if (loadingQuote) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-6xl">
          <Skeleton className="h-9 w-44" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
            <Skeleton className="h-96 w-full rounded-3xl" />
            <Skeleton className="h-96 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Checkout
          </h1>
          <Link href="/" className="text-sm font-semibold text-foreground hover:underline">
            Continue shopping
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setStep("shipping")}
            className={cn(
              "rounded-full border px-3 py-1 font-semibold",
              step === "shipping"
                ? "border-foreground bg-muted text-foreground"
                : "border-border bg-surface text-muted-foreground"
            )}
          >
            1. Shipping
          </button>
          <span className="text-muted-foreground">→</span>
          <button
            type="button"
            onClick={() => {
              if (step === "shipping") {
                continueToPayment();
                return;
              }
              setStep("payment");
            }}
            className={cn(
              "rounded-full border px-3 py-1 font-semibold",
              step === "payment"
                ? "border-foreground bg-muted text-foreground"
                : "border-border bg-surface text-muted-foreground",
              step === "shipping" && !shippingOk && "opacity-60"
            )}
            disabled={step === "shipping" && !shippingOk}
          >
            2. Payment
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {step === "shipping" ? "Shipping" : "Payment"}
            </h2>

            {step === "shipping" ? (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {isGuest ? (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      onBlur={() => setGuestEmailTouched(true)}
                      autoComplete="email"
                    />
                    {guestEmailTouched && guestEmail.trim() && !guestEmailOk ? (
                      <p className="text-sm text-destructive">Enter a valid email.</p>
                    ) : null}
                    {!guestEmail.trim() ? (
                      <p className="text-sm text-muted-foreground">
                        We’ll send order updates to this email.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input value={session?.user?.email ?? ""} disabled />
                  </div>
                )}

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Full name</label>
                  <Input value={shipping.fullName} onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <Input value={shipping.phone} onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Address line 1</label>
                  <Input value={shipping.addressLine1} onChange={(e) => setShipping((s) => ({ ...s, addressLine1: e.target.value }))} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Address line 2</label>
                  <Input value={shipping.addressLine2 ?? ""} onChange={(e) => setShipping((s) => ({ ...s, addressLine2: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">City</label>
                  <Input value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">State</label>
                  <Input value={shipping.state} onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Postal code</label>
                  <Input value={shipping.postalCode} onChange={(e) => setShipping((s) => ({ ...s, postalCode: e.target.value }))} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Country</label>
                  <Input value={shipping.country} onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Shipping to</p>
                    <p className="mt-1 text-foreground-secondary">{shipping.fullName}</p>
                    <p className="mt-1 text-muted-foreground">{shipping.phone}</p>
                    <p className="mt-2 text-muted-foreground">
                      {shipping.addressLine1}
                      {shipping.addressLine2 ? `, ${shipping.addressLine2}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {shipping.city}, {shipping.state} {shipping.postalCode}
                    </p>
                    <p className="text-muted-foreground">{shipping.country}</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStep("shipping")}>
                    Edit
                  </Button>
                </div>
              </div>
            )}

            {step === "payment" ? (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-foreground">Payment method</h2>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {codAllowed ? (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  disabled={loadingPayments || !codAllowed}
                  className={cn(
                    "rounded-2xl border p-4 text-left",
                    paymentMethod === "cod"
                      ? "border-foreground bg-muted"
                      : "border-border bg-surface",
                    (!codAllowed || loadingPayments) && "opacity-50"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">Cash on delivery</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pay when you receive the order.</p>
                </button>
              ) : null}

                <button
                  type="button"
                  onClick={() => setPaymentMethod("manual")}
                  disabled={loadingPayments || !manualAllowed}
                  className={cn(
                    "rounded-2xl border p-4 text-left",
                    paymentMethod === "manual"
                      ? "border-foreground bg-muted"
                      : "border-border bg-surface",
                    (!manualAllowed || loadingPayments) && "opacity-50"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">Bank Transfer</p>
                  <p className="mt-1 text-sm text-muted-foreground">Make a bank transfer to complete payment.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  disabled={loadingPayments || !onlineAllowed}
                  className={cn(
                    "rounded-2xl border p-4 text-left",
                    paymentMethod === "online"
                      ? "border-foreground bg-muted"
                      : "border-border bg-surface",
                    (!onlineAllowed || loadingPayments) && "opacity-50"
                  )}
                >
                  <p className="text-sm font-semibold text-foreground">JazzCash Transfer</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pay via JazzCash to confirm your order.</p>
                </button>
              </div>

              {loadingPayments ? (
                <p className="mt-3 text-sm text-muted-foreground">Loading payment options...</p>
              ) : null}

              {!loadingPayments && paymentMethod === "cod" ? (
                <div className="mt-3 rounded-2xl border border-border bg-muted p-4 text-sm text-foreground-secondary">
                  Pay in cash when your order arrives.
                </div>
              ) : null}

              {!loadingPayments && paymentMethod === "manual" ? (
                <div className="mt-3 rounded-2xl border border-border bg-muted p-4">
                  {paymentSettings?.manual?.instructions ? (
                    <p className="text-sm text-foreground-secondary">{paymentSettings.manual.instructions}</p>
                  ) : (
                    <p className="text-sm text-foreground-secondary">
                      After placing the order, transfer the total amount to our bank account and share the transaction reference.
                    </p>
                  )}

                  {paymentSettings?.manual?.accounts?.length ? (
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                      {paymentSettings.manual.accounts.map((a, idx) => (
                        <div
                          key={`${a.label ?? a.bankName ?? "acc"}:${idx}`}
                          className="rounded-2xl border border-border bg-surface p-4"
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.label || "Bank account"}</div>
                          <div className="mt-2 space-y-1">
                            {a.bankName ? <div className="font-semibold text-foreground">{a.bankName}</div> : null}
                            {a.accountTitle ? <div className="text-foreground-secondary">{a.accountTitle}</div> : null}
                            {a.accountNumber ? <div className="text-foreground-secondary">{a.accountNumber}</div> : null}
                            {a.iban ? <div className="text-foreground-secondary">{a.iban}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!loadingPayments && paymentMethod === "online" ? (
                <div className="mt-3 rounded-2xl border border-border bg-muted p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {paymentSettings?.online?.provider ? `JazzCash Transfer (${paymentSettings.online.provider})` : "JazzCash Transfer"}
                  </p>
                  {paymentSettings?.online?.instructions ? (
                    <p className="mt-2 text-sm text-foreground-secondary">{paymentSettings.online.instructions}</p>
                  ) : (
                    <p className="mt-2 text-sm text-foreground-secondary">
                      JazzCash Transfer is not configured yet. You can still place the order and pay later.
                    </p>
                  )}
                </div>
              ) : null}
              </div>
            ) : null}

            <div className="mt-6">
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
                                <span className="text-muted-foreground">· {i.availableStock} in stock</span>
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
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-surface p-5">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Coupon</label>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="SAVE10"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applyCoupon}
                    disabled={!couponInput.trim() && !couponCode.trim()}
                  >
                    {couponCode.trim() ? "Update" : "Apply"}
                  </Button>
                </div>
                {quote?.coupon && !quote.coupon.ok ? (
                  <p className="mt-2 text-sm text-destructive">
                    {quote.coupon.message ?? "Invalid coupon"}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">
                    {formatMoneyFromPkr(quote?.itemsSubtotal ?? 0, currency.selected, currency.pkrPerUsd)}
                  </span>
                </div>

                {quote?.coupon?.ok && (quote?.couponDiscountAmount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coupon ({quote.coupon.code})</span>
                    <span className="font-semibold text-foreground">
                      -{formatMoneyFromPkr(quote.couponDiscountAmount ?? 0, currency.selected, currency.pkrPerUsd)}
                    </span>
                  </div>
                ) : null}

                {quote?.promotion && (quote?.promotionDiscountAmount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Promo ({quote.promotion.name})</span>
                    <span className="font-semibold text-foreground">
                      -{formatMoneyFromPkr(quote.promotionDiscountAmount ?? 0, currency.selected, currency.pkrPerUsd)}
                    </span>
                  </div>
                ) : null}

                {!(quote?.coupon?.ok && (quote?.couponDiscountAmount ?? 0) > 0) &&
                !(quote?.promotion && (quote?.promotionDiscountAmount ?? 0) > 0) &&
                (quote?.discountAmount ?? 0) > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {quote?.coupon?.ok ? `Discount (${quote.coupon.code})` : "Discount"}
                    </span>
                    <span className="font-semibold text-foreground">
                      -{formatMoneyFromPkr(quote?.discountAmount ?? 0, currency.selected, currency.pkrPerUsd)}
                    </span>
                  </div>
                ) : null}

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

                {quote?.deliveryEta?.text ? (
                  <div className="text-xs text-muted-foreground">{quote.deliveryEta.text}</div>
                ) : null}

                {refreshingQuote ? (
                  <div className="text-xs text-muted-foreground">Updating delivery…</div>
                ) : null}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-semibold text-foreground">
                    {formatMoneyFromPkr(quote?.taxAmount ?? 0, currency.selected, currency.pkrPerUsd)}
                  </span>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatMoneyFromPkr(quote?.totalAmount ?? 0, currency.selected, currency.pkrPerUsd)}
                    </span>
                  </div>
                </div>
              </div>

              {step === "shipping" ? (
                <Button type="button" variant="accent" className="w-full" disabled={!shippingOk || placing} onClick={continueToPayment}>
                  Continue to payment
                </Button>
              ) : (
                <Button type="button" variant="accent" className="w-full" disabled={!canPlace || placing} onClick={placeOrder}>
                  {placing ? "Placing order..." : "Place order"}
                </Button>
              )}

              {quote?.items?.some((i) => !i.isAvailable) ? (
                <p className="text-sm text-destructive">
                  Fix unavailable items before placing the order.
                </p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

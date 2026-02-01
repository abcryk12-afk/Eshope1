import { formatMoneyFromPkr, type CurrencyCode } from "@/lib/currency";

export const DEFAULT_WHATSAPP_ORDER_TEMPLATE = [
  "Hello {{customerName}},",
  "",
  "Thank you for your order on {{storeName}}.",
  "",
  "Order ID: {{orderId}}",
  "Items:",
  "{{productList}}",
  "",
  "Total Amount: {{total}}",
  "Payment Method: {{paymentMethod}}",
  "",
  "Please reply YES to confirm your order.",
].join("\n");

type ItemBrief = {
  title: string;
  quantity: number;
  variant?: string;
};

type BuildOrderMessageArgs = {
  storeName: string;
  customerName: string;
  orderId: string;
  items: ItemBrief[];
  totalAmount: number;
  currency?: CurrencyCode;
  pkrPerUsd?: number;
  paymentMethod?: string;
  template?: string;
};

type NormalizePhoneOptions = {
  defaultCountryCallingCode?: string;
};

function digitsOnly(raw: string) {
  return raw.replace(/[^0-9]/g, "");
}

export function normalizeWhatsAppPhone(raw: string, opts?: NormalizePhoneOptions): string | null {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  const defaultCode = digitsOnly(String(opts?.defaultCountryCallingCode ?? "92")) || "92";

  if (input.startsWith("+")) {
    const d = digitsOnly(input);
    return d.length >= 8 ? d : null;
  }

  const d0 = digitsOnly(input);
  if (!d0) return null;

  if (d0.startsWith("00")) {
    const d = d0.slice(2);
    return d.length >= 8 ? d : null;
  }

  if (d0.startsWith("0")) {
    const d = defaultCode + d0.slice(1);
    return d.length >= 8 ? d : null;
  }

  if (d0.length === 10 && d0.startsWith("3")) {
    const d = defaultCode + d0;
    return d.length >= 8 ? d : null;
  }

  return d0.length >= 8 ? d0 : null;
}

function normalizePaymentMethodLabel(method: string | undefined) {
  const v = String(method ?? "").trim().toLowerCase();
  if (v === "cod") return "COD";
  if (v === "manual") return "Manual";
  if (v === "online") return "Online";
  return v ? v.toUpperCase() : "";
}

function normalizeNewlines(text: string) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTemplate(template: string, values: Record<string, string>) {
  let out = String(template ?? "");

  for (const [k, v] of Object.entries(values)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(k)}\\s*\\}\\}`, "g");
    out = out.replace(re, String(v ?? ""));
  }

  return out;
}

export function buildWhatsAppOrderMessage(args: BuildOrderMessageArgs) {
  const customTemplate = String(args.template ?? "").trim();
  const template = customTemplate ? customTemplate : DEFAULT_WHATSAPP_ORDER_TEMPLATE;

  const storeName = String(args.storeName ?? "").trim() || "Shop";
  const customerName = String(args.customerName ?? "").trim() || "Customer";
  const orderId = String(args.orderId ?? "").trim();

  const productListText = (args.items ?? [])
    .filter((it) => typeof it === "object" && it !== null)
    .map((it) => {
      const title = String(it.title ?? "").trim();
      const qty = Number(it.quantity ?? 0);
      const variant = String(it.variant ?? "").trim();
      if (!title || qty <= 0) return "";
      const suffix = variant ? ` (${variant})` : "";
      return `- ${title}${suffix} x${qty}`;
    })
    .filter(Boolean)
    .join("\n");

  const currency: CurrencyCode = args.currency === "USD" ? "USD" : "PKR";
  const total = formatMoneyFromPkr(Number(args.totalAmount ?? 0), currency, args.pkrPerUsd);
  const paymentMethod = normalizePaymentMethodLabel(args.paymentMethod);

  const values: Record<string, string> = {
    storeName,
    customerName,
    orderId,
    productList: productListText || "- (No items)",
    items: productListText || "- (No items)",
    total,
    paymentMethod,
  };

  return normalizeNewlines(renderTemplate(template, values));
}

export function buildWhatsAppOrderUrl(
  args: BuildOrderMessageArgs & { customerPhone: string; defaultCountryCallingCode?: string }
) {
  const phone = normalizeWhatsAppPhone(args.customerPhone, { defaultCountryCallingCode: args.defaultCountryCallingCode });
  if (!phone) return null;

  const text = buildWhatsAppOrderMessage(args);
  if (!text.trim()) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

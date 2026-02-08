import "server-only";

import { sendMail } from "@/lib/mailer";
import { forgotPasswordEmailHtml } from "@/emails/forgot-password";
import { orderConfirmationEmailHtml } from "@/emails/order-confirmation";

function readBrandConfig() {
  const brandName = (process.env.BRAND_NAME ?? process.env.SMTP_FROM_NAME ?? "").trim();
  const appUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  const accentColor = (process.env.EMAIL_BRAND_ACCENT_COLOR ?? "#2563eb").trim();
  const supportEmail = (process.env.SUPPORT_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? "").trim();

  const missing: string[] = [];
  if (!brandName) missing.push("BRAND_NAME/SMTP_FROM_NAME");
  if (!appUrl) missing.push("APP_URL/NEXTAUTH_URL");
  if (!supportEmail) missing.push("SUPPORT_EMAIL/SMTP_FROM_EMAIL");

  if (missing.length > 0) {
    throw new Error(`Email system is not configured (missing: ${missing.join(", ")})`);
  }

  return { brandName, appUrl, accentColor, supportEmail };
}

function formatPaymentMethodLabel(paymentMethod: string | undefined) {
  const method = String(paymentMethod ?? "").trim().toLowerCase();
  if (!method) return "";

  if (method === "cod") return "Cash on Delivery (COD)";
  if (method === "manual") return "Manual Payment";
  if (method === "online") return "JazzCash";

  return paymentMethod ?? "";
}

function readPaymentInstructionsForMethod(paymentMethod: string | undefined) {
  const method = String(paymentMethod ?? "").trim().toLowerCase();

  // Show instructions only for transfer-based flows.
  const needsInstructions = method === "manual" || method === "online" || method === "jazzcash";
  if (!needsInstructions) return null;

  const isJazzCash = method === "jazzcash" || method === "online";
  
  // Use JazzCash specific title if available, otherwise fallback to default
  const defaultTitle = isJazzCash 
    ? "JazzCash Payment Instructions" 
    : "Bank Transfer Instructions";
    
  const title = (process.env.PAYMENT_INSTRUCTIONS_TITLE ?? defaultTitle).trim();
  
  // Default note for JazzCash if not provided
  const defaultNote = isJazzCash 
    ? "Please include your order number in the payment reference/message when sending money via JazzCash."
    : "Please include your order number in the payment reference/message when making the transfer.";
    
  const note = (process.env.PAYMENT_INSTRUCTIONS_NOTE ?? defaultNote).trim();

  const details: Array<{ label: string; value: string }> = [];
  
  // For JazzCash, use JazzCash specific labels and values
  if (isJazzCash) {
    const jazzCashNumber = (process.env.PAYMENT_ACCOUNT_NUMBER ?? "").trim();
    const jazzCashName = (process.env.PAYMENT_RECEIVER_NAME ?? "").trim();
    const jazzCashTitle = (process.env.PAYMENT_ACCOUNT_TITLE ?? "").trim();
    
    if (jazzCashNumber) details.push({ 
      label: "JazzCash Number", 
      value: jazzCashNumber 
    });
    
    if (jazzCashName) details.push({ 
      label: "Account Holder Name", 
      value: jazzCashName 
    });
    
    if (jazzCashTitle) details.push({ 
      label: "Account Title", 
      value: jazzCashTitle 
    });
    
    // Add WhatsApp for support if available
    const whatsapp = (process.env.PAYMENT_WHATSAPP ?? "").trim();
    if (whatsapp) {
      details.push({ 
        label: "Support WhatsApp", 
        value: whatsapp 
      });
    }
  } else {
    // For bank transfers
    const accountTitle = (process.env.PAYMENT_ACCOUNT_TITLE ?? "").trim();
    const accountNumber = (process.env.PAYMENT_ACCOUNT_NUMBER ?? "").trim();
    const bankName = (process.env.PAYMENT_BANK_NAME ?? "").trim();
    const iban = (process.env.PAYMENT_IBAN ?? "").trim();
    const paymentReceiverName = (process.env.PAYMENT_RECEIVER_NAME ?? "").trim();
    const whatsapp = (process.env.PAYMENT_WHATSAPP ?? "").trim();

    if (bankName) details.push({ label: "Bank Name", value: bankName });
    if (paymentReceiverName) details.push({ label: "Account Holder Name", value: paymentReceiverName });
    if (accountTitle) details.push({ label: "Account Title", value: accountTitle });
    if (accountNumber) details.push({ label: "Account Number", value: accountNumber });
    if (iban) details.push({ label: "IBAN", value: iban });
    if (whatsapp) details.push({ label: "Support WhatsApp", value: whatsapp });
  }

  if (details.length === 0 && !note) return null;

  return { 
    title, 
    note,
    details,
    isJazzCash // Add this flag to help with conditional rendering in the email template
  };
}

export async function sendPasswordResetEmail(args: {
  toEmail: string;
  resetLink: string;
  expiresInMinutes: number;
}) {
  try {
    const { brandName, accentColor, supportEmail } = readBrandConfig();

    const html = forgotPasswordEmailHtml({
      brandName,
      accentColor,
      resetUrl: args.resetLink,
      expiresInMinutes: args.expiresInMinutes,
      supportEmail,
    });

    await sendMail({
      to: args.toEmail,
      subject: `Reset your ${brandName} password`,
      html,
      replyTo: supportEmail,
    });

    return { ok: true as const };
  } catch (err: unknown) {
    console.warn("[email] sendPasswordResetEmail failed", err);
    return { ok: false as const };
  }
}

export async function sendOrderConfirmationEmail(args: {
  toEmail: string;
  customer: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  order: {
    id: string;
    createdAt?: Date;
    paymentMethod?: string;
    orderStatus?: string;
    trackingUrl?: string | null;
    shippingAddress?: {
      fullName?: string;
      phone?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    items: Array<{
      title?: string;
      quantity?: number;
      unitPrice?: number;
    }>;
    currency: string;
    itemsSubtotal?: number;
    shippingAmount?: number;
    discountAmount?: number;
    taxAmount?: number;
    totalAmount: number;
  };
}) {
  try {
    const { brandName, accentColor, supportEmail } = readBrandConfig();

    const paymentMethodLabel = formatPaymentMethodLabel(args.order.paymentMethod);
    const paymentInstructions = readPaymentInstructionsForMethod(args.order.paymentMethod);

    const html = orderConfirmationEmailHtml({
      brandName,
      accentColor,
      supportEmail,
      customer: {
        fullName: args.customer.fullName,
        email: args.customer.email ?? args.toEmail,
        phone: args.customer.phone,
      },
      order: {
        orderId: args.order.id,
        orderDate: args.order.createdAt ?? new Date(),
        paymentMethod: paymentMethodLabel,
        orderStatus: args.order.orderStatus,
        trackingUrl: args.order.trackingUrl ?? undefined,
      },
      paymentInstructions: paymentInstructions ?? undefined,
      deliveryAddress: {
        fullName: args.order.shippingAddress?.fullName,
        phone: args.order.shippingAddress?.phone,
        streetAddress: args.order.shippingAddress?.addressLine1,
        streetAddress2: args.order.shippingAddress?.addressLine2,
        city: args.order.shippingAddress?.city,
        provinceOrState: args.order.shippingAddress?.state,
        country: args.order.shippingAddress?.country,
        postalCode: args.order.shippingAddress?.postalCode,
      },
      items: (args.order.items ?? []).map((i) => ({
        productName: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      pricing: {
        currency: args.order.currency,
        subtotal: args.order.itemsSubtotal,
        deliveryFee: args.order.shippingAmount,
        discount: args.order.discountAmount,
        tax: args.order.taxAmount,
        total: args.order.totalAmount,
      },
    });

    await sendMail({
      to: args.toEmail,
      subject: `Your order has been confirmed 🎉`,
      html,
      replyTo: supportEmail,
    });

    return { ok: true as const };
  } catch (err: unknown) {
    console.warn("[email] sendOrderConfirmationEmail failed", err);
    return { ok: false as const };
  }
}

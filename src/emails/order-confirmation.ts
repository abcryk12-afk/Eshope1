type OrderItem = {
  productName?: string;
  quantity?: number;
  unitPrice?: number;
};

type OrderConfirmationEmailParams = {
  brandName: string;
  accentColor: string;
  supportEmail: string;
  customer: {
    fullName?: string;
    email?: string;
    phone?: string;
  };
  order: {
    orderId: string;
    orderDate?: Date;
    paymentMethod?: string;
    orderStatus?: string;
    trackingUrl?: string;
  };
  paymentInstructions?: {
    title?: string;
    details?: Array<{ label?: string; value?: string }>;
    note?: string;
  };
  deliveryAddress: {
    fullName?: string;
    phone?: string;
    streetAddress?: string;
    streetAddress2?: string;
    city?: string;
    provinceOrState?: string;
    country?: string;
    postalCode?: string;
  };
  items: OrderItem[];
  pricing: {
    currency: string;
    subtotal?: number;
    deliveryFee?: number;
    discount?: number;
    tax?: number;
    total: number;
  };
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(amount: number, currency: string) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safe.toFixed(2)}`;
}

function formatDate(d?: Date) {
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#6b7280;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:6px 0;font-size:13px;color:#111827;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;
}

export function orderConfirmationEmailHtml(params: OrderConfirmationEmailParams) {
  const brandName = escapeHtml(params.brandName);
  const supportEmail = escapeHtml(params.supportEmail);
  const accent = params.accentColor;

  const orderDate = params.order.orderDate ? formatDate(params.order.orderDate) : "";
  const paymentMethod = String(params.order.paymentMethod ?? "").trim();
  const orderStatus = String(params.order.orderStatus ?? "").trim();

  const customerName = String(params.customer.fullName ?? "").trim();
  const customerEmail = String(params.customer.email ?? "").trim();
  const customerPhone = String(params.customer.phone ?? "").trim();

  const shipName = String(params.deliveryAddress.fullName ?? "").trim();
  const shipPhone = String(params.deliveryAddress.phone ?? "").trim();
  const shipLine1 = String(params.deliveryAddress.streetAddress ?? "").trim();
  const shipLine2 = String(params.deliveryAddress.streetAddress2 ?? "").trim();
  const shipCity = String(params.deliveryAddress.city ?? "").trim();
  const shipState = String(params.deliveryAddress.provinceOrState ?? "").trim();
  const shipCountry = String(params.deliveryAddress.country ?? "").trim();
  const shipPostal = String(params.deliveryAddress.postalCode ?? "").trim();

  const currency = params.pricing.currency;
  const subtotal = Number(params.pricing.subtotal ?? 0);
  const deliveryFee = Number(params.pricing.deliveryFee ?? 0);
  const discount = Number(params.pricing.discount ?? 0);
  const tax = Number(params.pricing.tax ?? 0);
  const total = Number(params.pricing.total ?? 0);

  const itemRows = (params.items ?? []).map((i) => {
    const title = escapeHtml(String(i.productName ?? "Item"));
    const qty = Number(i.quantity ?? 0);
    const unit = Number(i.unitPrice ?? 0);
    const line = unit * qty;
    return `
      <tr>
        <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;">
          <div style="font-size:14px;font-weight:700;color:#111827;line-height:1.35;">${title}</div>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#111827;">${qty}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#111827;">${formatMoney(unit, currency)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:700;color:#111827;">${formatMoney(line, currency)}</td>
      </tr>`;
  });

  const addressLines: string[] = [];
  if (shipLine1) addressLines.push(shipLine1);
  if (shipLine2) addressLines.push(shipLine2);

  const cityLineParts: string[] = [];
  if (shipCity) cityLineParts.push(shipCity);
  if (shipState) cityLineParts.push(shipState);
  if (shipPostal) cityLineParts.push(shipPostal);
  if (cityLineParts.length > 0) addressLines.push(cityLineParts.join(", "));
  if (shipCountry) addressLines.push(shipCountry);

  const trackingUrl = String(params.order.trackingUrl ?? "").trim();

  const paymentTitle = String(params.paymentInstructions?.title ?? "").trim();
  const paymentNote = String(params.paymentInstructions?.note ?? "").trim();
  const paymentDetails = (params.paymentInstructions?.details ?? [])
    .map((d) => ({
      label: String(d.label ?? "").trim(),
      value: String(d.value ?? "").trim(),
    }))
    .filter((d) => d.label && d.value);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Order confirmed</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your order has been confirmed</div>
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:${accent};padding:18px 24px;">
          <div style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">${brandName}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.9);margin-top:2px;">Order confirmation</div>
        </div>

        <div style="padding:24px;">
          <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;">Your order has been confirmed</h1>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#374151;">
            Thank you for shopping with ${brandName}. We’re preparing your order.
          </p>

          <div style="margin:16px 0 18px 0;">
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
              <tbody>
                ${orderDate ? row("Order Date", orderDate) : ""}
                ${paymentMethod ? row("Payment Method", paymentMethod) : ""}
                ${orderStatus ? row("Order Status", orderStatus) : ""}
                ${row("Order ID", params.order.orderId)}
              </tbody>
            </table>
          </div>

          <div style="margin:0 0 12px 0;font-size:14px;font-weight:800;color:#111827;">Customer info</div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
            <tbody>
              ${customerName ? row("Full name", customerName) : ""}
              ${customerEmail ? row("Email", customerEmail) : ""}
              ${customerPhone ? row("Phone", customerPhone) : ""}
            </tbody>
          </table>

          <div style="margin:18px 0 12px 0;font-size:14px;font-weight:800;color:#111827;">Delivery address</div>
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;background:#ffffff;">
            <div style="font-size:13px;font-weight:800;color:#111827;">${escapeHtml(shipName || customerName || "")}</div>
            ${shipPhone ? `<div style="font-size:13px;color:#374151;margin-top:4px;">${escapeHtml(shipPhone)}</div>` : ""}
            <div style="font-size:13px;color:#374151;margin-top:8px;line-height:1.6;">
              ${addressLines.map((l) => `${escapeHtml(l)}<br />`).join("")}
            </div>
          </div>

          <div style="margin:18px 0 12px 0;font-size:14px;font-weight:800;color:#111827;">Items</div>
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th align="left" style="padding:12px 10px;font-size:12px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Product</th>
                <th align="center" style="padding:12px 10px;font-size:12px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Qty</th>
                <th align="right" style="padding:12px 10px;font-size:12px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Price</th>
                <th align="right" style="padding:12px 10px;font-size:12px;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows.join("\n")}
            </tbody>
          </table>

          <div style="margin-top:16px;display:block;">
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
              <tbody>
                ${row("Subtotal", formatMoney(subtotal, currency))}
                ${row("Delivery fee", formatMoney(deliveryFee, currency))}
                ${discount > 0 ? row("Discount", `- ${formatMoney(discount, currency)}`) : ""}
                ${tax > 0 ? row("Tax", formatMoney(tax, currency)) : ""}
                <tr>
                  <td style="padding:10px 0;font-size:14px;color:#111827;font-weight:900;">Grand total</td>
                  <td style="padding:10px 0;font-size:16px;color:#111827;font-weight:900;text-align:right;">${formatMoney(total, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${
            paymentDetails.length > 0 || paymentNote
              ? `<div style="margin-top:24px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;overflow:hidden;border-left:4px solid ${accent};">
            <div style="padding:14px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
              <div style="font-size:14px;font-weight:900;color:#111827;display:flex;align-items:center;gap:8px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${accent};">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 10H2" />
                  <path d="M7 14h.01" />
                  <path d="M11 14h.01" />
                  <path d="M15 14h.01" />
                  <path d="M19 14h.01" />
                </svg>
                <span>${escapeHtml(paymentTitle || `Complete Your ${paymentMethod} Payment`)}</span>
              </div>
            </div>
            <div style="padding:16px;">
              <div style="margin-bottom:12px;font-size:13px;color:#4b5563;line-height:1.5;">
                Please complete your payment using the following ${paymentMethod === 'JazzCash' ? 'JazzCash' : 'bank'} details:
              </div>
              ${
                paymentDetails.length > 0
                  ? `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                    <tbody>
                      ${paymentDetails.map((d) => row(d.label, d.value)).join("\n")}
                    </tbody>
                  </table>`
                  : ""
              }
              ${
                paymentNote
                  ? `<div style="margin-top:12px;padding:10px;background-color:#f3f4f6;border-radius:6px;font-size:13px;line-height:1.5;color:#4b5563;">
                      <div style="font-weight:600;margin-bottom:4px;color:#111827;">Important:</div>
                      ${escapeHtml(paymentNote)}
                    </div>`
                  : ""
              }
              <div style="margin-top:16px;padding:10px;background-color:#f0fdf4;border-radius:6px;border-left:3px solid #10b981;font-size:13px;line-height:1.5;color:#065f46;">
                <div style="font-weight:600;margin-bottom:4px;">After making the payment:</div>
                <div>1. Keep your payment receipt safe</div>
                <div>2. You can upload the receipt in your order page</div>
                <div>3. Your order will be processed after payment verification</div>
              </div>
            </div>
          </div>`
              : ""
          }

          <div style="margin-top:18px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
            <div style="font-size:12px;color:#6b7280;">Need help?</div>
            <div style="font-size:13px;color:#374151;margin-top:4px;">
              Email <a href="mailto:${supportEmail}" style="color:${accent};text-decoration:none;font-weight:700;">${supportEmail}</a>
            </div>
          </div>

          <div style="margin-top:14px;font-size:13px;line-height:1.6;color:#6b7280;">
            Thank you for shopping with ${brandName}.
          </div>

          ${
            trackingUrl
              ? `<div style="margin-top:10px;font-size:13px;line-height:1.6;color:#6b7280;">Track your order: <a href="${escapeHtml(
                  trackingUrl
                )}" style="color:${accent};text-decoration:none;font-weight:700;">View tracking</a></div>`
              : ""
          }
        </div>

        <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ${brandName}. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

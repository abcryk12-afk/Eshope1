type OrderAdminNotifyParams = {
  brandName: string;
  accentColor: string;
  orderId: string;
  customerName: string;
  totalAmount: number;
  currency: string;
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

export function orderAdminNotifyEmailHtml(params: OrderAdminNotifyParams) {
  const brandName = escapeHtml(params.brandName);
  const orderId = escapeHtml(params.orderId);
  const customerName = escapeHtml(params.customerName);
  const accent = params.accentColor;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>New order received</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">New order received • ${brandName}</div>
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:${accent};padding:18px 24px;">
          <div style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">${brandName}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.9);margin-top:2px;">Admin notification</div>
        </div>

        <div style="padding:24px;">
          <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;">New order received</h1>
          <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#374151;">
            A new order has been placed. Review and process it in the admin panel.
          </p>

          <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;margin:0 0 12px 0;">
            <div style="font-size:12px;color:#6b7280;">Customer</div>
            <div style="font-size:14px;font-weight:800;color:#111827;">${customerName}</div>
          </div>

          <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;margin:0 0 12px 0;">
            <div style="font-size:12px;color:#6b7280;">Order ID</div>
            <div style="font-size:14px;font-weight:800;color:#111827;">${orderId}</div>
          </div>

          <div style="padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;margin:0 0 6px 0;">
            <div style="font-size:12px;color:#6b7280;">Total</div>
            <div style="font-size:16px;font-weight:900;color:#111827;">${formatMoney(params.totalAmount, params.currency)}</div>
          </div>

          <div style="margin-top:16px;">
            <span style="display:inline-block;background:${accent};color:#ffffff;font-weight:800;font-size:12px;padding:8px 12px;border-radius:999px;">Action required</span>
          </div>
        </div>

        <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ${brandName}. Admin notification.
        </div>
      </div>
    </div>
  </body>
</html>`;
}

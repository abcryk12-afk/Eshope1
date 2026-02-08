type ForgotPasswordEmailParams = {
  brandName: string;
  accentColor: string;
  resetUrl: string;
  expiresInMinutes: number;
  supportEmail: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function forgotPasswordEmailHtml(params: ForgotPasswordEmailParams) {
  const brandName = escapeHtml(params.brandName);
  const resetUrl = escapeHtml(params.resetUrl);
  const supportEmail = escapeHtml(params.supportEmail);
  const accent = params.accentColor;
  const expires = params.expiresInMinutes;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Reset your ${brandName} password</div>
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:${accent};padding:18px 24px;">
          <div style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">${brandName}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.9);margin-top:2px;">Security notification</div>
        </div>

        <div style="padding:24px;">
          <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;">Reset your password</h1>
          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
            We received a request to reset your ${brandName} password. Use the button below to set a new password.
          </p>

          <div style="margin:18px 0 20px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;padding:12px 18px;border-radius:10px;">
              Reset password
            </a>
          </div>

          <div style="padding:14px 14px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;margin:0 0 16px 0;">
            <div style="font-size:12px;color:#6b7280;">This link expires in</div>
            <div style="font-size:14px;font-weight:800;color:#111827;">${expires} minutes</div>
          </div>

          <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#6b7280;">
            If you didn’t request this reset, you can ignore this email. For your security, we recommend changing your password if you suspect unauthorized access.
          </p>

          <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            Need help? Contact <a href="mailto:${supportEmail}" style="color:${accent};text-decoration:none;font-weight:700;">${supportEmail}</a>.
          </p>
        </div>

        <div style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
          © ${new Date().getFullYear()} ${brandName}. All rights reserved.
        </div>
      </div>

      <div style="text-align:center;margin-top:14px;font-size:12px;color:#9ca3af;">
        If the button doesn’t work, copy and paste this URL into your browser:<br />
        <span style="word-break:break-all;">${resetUrl}</span>
      </div>
    </div>
  </body>
</html>`;
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().email().max(320),
});

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const brandName = (process.env.BRAND_NAME ?? process.env.SMTP_FROM_NAME ?? "").trim();
  const appUrl = (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "").trim();
  const accentColor = (process.env.EMAIL_BRAND_ACCENT_COLOR ?? "").trim();
  const supportEmail = (process.env.SUPPORT_EMAIL ?? process.env.SMTP_FROM_EMAIL ?? "").trim();

  const missing: string[] = [];
  if (!brandName) missing.push("BRAND_NAME or SMTP_FROM_NAME");
  if (!appUrl) missing.push("APP_URL or NEXTAUTH_URL");
  if (!accentColor) missing.push("EMAIL_BRAND_ACCENT_COLOR");
  if (!supportEmail) missing.push("SUPPORT_EMAIL or SMTP_FROM_EMAIL");

  try {
    // Ensure SMTP is configured too (sendMail will throw if not).
    // We do not call it here; we just validate envs early.
    const smtpHost = (process.env.SMTP_HOST ?? "").trim();
    const smtpPort = (process.env.SMTP_PORT ?? "").trim();
    const smtpUser = (process.env.SMTP_USER ?? "").trim();
    const smtpPass = (process.env.SMTP_PASS ?? "").trim();
    const smtpFromEmail = (process.env.SMTP_FROM_EMAIL ?? "").trim();
    const smtpFromName = (process.env.SMTP_FROM_NAME ?? "").trim();
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpPort) missing.push("SMTP_PORT");
    if (!smtpUser) missing.push("SMTP_USER");
    if (!smtpPass) missing.push("SMTP_PASS");
    if (!smtpFromEmail) missing.push("SMTP_FROM_EMAIL");
    if (!smtpFromName) missing.push("SMTP_FROM_NAME");
  } catch {
    // ignore
  }

  if (missing.length > 0) {
    const payload =
      process.env.NODE_ENV !== "production"
        ? { message: "Email system is not configured", missing }
        : { message: "Email system is not configured" };
    return NextResponse.json(payload, { status: 500 });
  }

  const email = parsed.data.email.toLowerCase();

  const expiresInMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? "30");
  const ttlMinutes = Number.isFinite(expiresInMinutes) && expiresInMinutes > 0 ? expiresInMinutes : 30;

  const continueUrl = `${appUrl.replace(/\/$/, "")}/login`;
  let resetUrl = "";

  try {
    const auth = getFirebaseAdminAuth();
    resetUrl = await auth.generatePasswordResetLink(email, {
      url: continueUrl,
      handleCodeInApp: false,
    });

    await sendPasswordResetEmail({
      toEmail: email,
      resetLink: resetUrl,
      expiresInMinutes: ttlMinutes,
    });
  } catch (err: unknown) {
    console.warn("[email] forgot-password send failed", err);
  }

  return NextResponse.json({ ok: true });
}

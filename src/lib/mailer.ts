import nodemailer, { type Transporter } from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
};

function parseFrom(raw: string): { name: string; email: string } | null {
  const v = raw.trim();
  if (!v) return null;

  const m = v.match(/^(.*)<([^>]+)>\s*$/);
  if (m) {
    const name = (m[1] ?? "").trim().replace(/^"|"$/g, "");
    const email = (m[2] ?? "").trim();
    if (!email) return null;
    return { name: name || email, email };
  }

  // If only an email is provided.
  if (v.includes("@") && !v.includes(" ")) {
    return { name: v, email: v };
  }

  return null;
}

function readSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST ?? "";
  const port = Number(process.env.SMTP_PORT ?? "0");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const fromParsed = parseFrom(process.env.SMTP_FROM ?? "");
  const fromEmail = (fromParsed?.email ?? process.env.SMTP_FROM_EMAIL ?? "").trim();
  const fromName = (fromParsed?.name ?? process.env.SMTP_FROM_NAME ?? "").trim();

  if (!host || !port || !user || !pass || !fromEmail || !fromName) {
    throw new Error("SMTP is not configured");
  }

  return { host, port, secure, user, pass, fromEmail, fromName };
}

let cachedTransporter: Transporter | null = null;
let cachedVerify: Promise<boolean> | null = null;

export function getMailerTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const cfg = readSmtpConfig();

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    requireTLS: !cfg.secure,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: false,
    },
  });

  cachedVerify = cachedTransporter
    .verify()
    .then(() => {
      console.log("[mailer] SMTP verify ok", {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: cfg.user,
        fromEmail: cfg.fromEmail,
      });
      return true;
    })
    .catch((err: unknown) => {
      console.error("[mailer] SMTP verify failed", err);
      return false;
    });

  return cachedTransporter;
}

export async function sendMail(args: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const cfg = readSmtpConfig();

  const transporter = getMailerTransporter();

  if (cachedVerify) {
    const ok = await cachedVerify;
    if (!ok) {
      throw new Error("SMTP verification failed (check SMTP_* env and server outbound mail access)");
    }
  }

  try {
    return await transporter.sendMail({
      from: {
        name: cfg.fromName,
        address: cfg.fromEmail,
      },
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
  } catch (err: unknown) {
    console.error("[mailer] sendMail failed", {
      to: args.to,
      subject: args.subject,
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      user: cfg.user,
      fromEmail: cfg.fromEmail,
      err,
    });
    throw err;
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const AccountSchema = z.object({
  label: z.string().trim().max(80).optional(),
  bankName: z.string().trim().max(80).optional(),
  accountTitle: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(80).optional(),
  iban: z.string().trim().max(80).optional(),
});

const ManualSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    instructions: z.string().trim().max(2000).optional().default(""),
    accounts: z.array(AccountSchema).optional().default([]),
  })
  .optional()
  .default({ enabled: true, instructions: "", accounts: [] });

const OnlineSchema = z
  .object({
    enabled: z.boolean().optional().default(false),
    provider: z.string().trim().max(60).optional().default(""),
    instructions: z.string().trim().max(2000).optional().default(""),
  })
  .optional()
  .default({ enabled: false, provider: "", instructions: "" });

const BodySchema = z.object({
  codEnabled: z.boolean().optional().default(true),
  manual: ManualSchema,
  online: OnlineSchema,
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readBool(v: unknown, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function readString(v: unknown, fallback = "") {
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
}

function readAccounts(v: unknown) {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .filter((x) => typeof x === "object" && x !== null)
    .map((x) => {
      const rec = x as Record<string, unknown>;
      return {
        label: readString(rec.label),
        bankName: readString(rec.bankName),
        accountTitle: readString(rec.accountTitle),
        accountNumber: readString(rec.accountNumber),
        iban: readString(rec.iban),
      };
    })
    .filter((a) => a.label || a.bankName || a.accountTitle || a.accountNumber || a.iban);
}

function normalizePayments(v: unknown) {
  const root = isRecord(v) ? v : {};
  const manual = isRecord(root.manual) ? root.manual : {};
  const online = isRecord(root.online) ? root.online : {};

  return {
    codEnabled: readBool(root.codEnabled, true),
    manual: {
      enabled: readBool(manual.enabled, true),
      instructions: readString(manual.instructions, ""),
      accounts: readAccounts(manual.accounts),
    },
    online: {
      enabled: readBool(online.enabled, false),
      provider: readString(online.provider, ""),
      instructions: readString(online.instructions, ""),
    },
  };
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).lean()) as unknown;
  const root = isRecord(doc) ? doc : null;

  const payments = normalizePayments(root?.payments);

  return NextResponse.json({ payments });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const doc = await SiteSetting.findOneAndUpdate(
    { key: "global" },
    { $set: { key: "global", payments: parsed.data } },
    { upsert: true, new: true }
  ).lean();

  const root = isRecord(doc) ? doc : null;

  return NextResponse.json({ payments: normalizePayments(root?.payments) });
}

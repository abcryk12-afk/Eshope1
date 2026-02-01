import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";

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

export async function GET() {
  await dbConnect();

  const doc = (await SiteSetting.findOne({ key: "global" }).lean()) as unknown;
  const root = isRecord(doc) ? doc : null;

  const payments = normalizePayments(root?.payments);

  return NextResponse.json({ payments }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

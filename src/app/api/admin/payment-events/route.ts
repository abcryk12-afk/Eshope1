import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import PaymentEventLog from "@/models/PaymentEventLog";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  kind: z.string().trim().max(40).optional(),
  event: z.string().trim().max(120).optional(),
  providerRef: z.string().trim().max(120).optional(),
  orderId: z.string().trim().max(80).optional(),
  signatureOk: z
    .enum(["true", "false"])
    .optional(),
});

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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    event: url.searchParams.get("event") ?? undefined,
    providerRef: url.searchParams.get("providerRef") ?? undefined,
    orderId: url.searchParams.get("orderId") ?? undefined,
    signatureOk: url.searchParams.get("signatureOk") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, kind, event, providerRef, orderId, signatureOk } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (kind) filter.kind = kind;
  if (event) filter.event = event;
  if (providerRef) filter.providerRef = providerRef;
  if (orderId) filter.orderId = orderId;
  if (signatureOk === "true") filter.signatureOk = true;
  if (signatureOk === "false") filter.signatureOk = false;

  const sortSpec: { createdAt: SortOrder } = { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    PaymentEventLog.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .select("kind event signatureOk providerRef orderId createdAt")
      .lean(),
    PaymentEventLog.countDocuments(filter),
  ]);

  const mapped = items.map((l) => ({
    id: String(l._id),
    kind: String(l.kind ?? ""),
    event: String(l.event ?? ""),
    signatureOk: Boolean(l.signatureOk),
    providerRef: String(l.providerRef ?? ""),
    orderId: l.orderId ? String(l.orderId) : null,
    createdAt: new Date(l.createdAt as unknown as string).toISOString(),
  }));

  return NextResponse.json({
    items: mapped,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Deal from "@/models/Deal";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

const UpsertSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    type: z.enum(["percent", "fixed"]),
    value: z.number().min(0),
    priority: z.number().int().min(-100000).max(100000).optional(),
    startsAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    productIds: z.array(z.string().trim().refine(isObjectId, "Invalid product id")).optional().default([]),
    isActive: z.boolean().optional().default(true),
  })
  .refine((d) => new Date(d.startsAt).getTime() < new Date(d.expiresAt).getTime(), {
    message: "Expires must be after start",
    path: ["expiresAt"],
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const deal = await Deal.findById(id)
    .select("name type value priority startsAt expiresAt productIds isActive createdAt")
    .lean();

  if (!deal) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const now = new Date();

  const startsAt = deal.startsAt ? new Date(deal.startsAt as unknown as string).toISOString() : null;
  const expiresAt = deal.expiresAt ? new Date(deal.expiresAt as unknown as string).toISOString() : null;

  const startsMs = startsAt ? new Date(startsAt).getTime() : 0;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;

  return NextResponse.json({
    deal: {
      id: String(deal._id),
      name: String(deal.name ?? ""),
      type: (deal.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      value: Number(deal.value ?? 0),
      priority: Number(deal.priority ?? 0),
      startsAt,
      expiresAt,
      isStarted: startsMs ? startsMs <= now.getTime() : false,
      isExpired: expiresMs ? expiresMs <= now.getTime() : false,
      productIds: Array.isArray(deal.productIds) ? (deal.productIds as unknown[]).map((x) => String(x)) : [],
      isActive: Boolean(deal.isActive),
      createdAt: new Date(deal.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpsertSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const deal = await Deal.findByIdAndUpdate(
    id,
    {
      $set: {
        name: parsed.data.name,
        type: parsed.data.type,
        value: parsed.data.value,
        priority: parsed.data.priority ?? 0,
        startsAt: new Date(parsed.data.startsAt),
        expiresAt: new Date(parsed.data.expiresAt),
        productIds: parsed.data.productIds ?? [],
        isActive: parsed.data.isActive ?? true,
      },
    },
    { new: true }
  )
    .select("name type value priority startsAt expiresAt productIds isActive createdAt")
    .lean();

  if (!deal) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const now = new Date();

  const startsAt = deal.startsAt ? new Date(deal.startsAt as unknown as string).toISOString() : null;
  const expiresAt = deal.expiresAt ? new Date(deal.expiresAt as unknown as string).toISOString() : null;

  const startsMs = startsAt ? new Date(startsAt).getTime() : 0;
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;

  return NextResponse.json({
    deal: {
      id: String(deal._id),
      name: String(deal.name ?? ""),
      type: (deal.type === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      value: Number(deal.value ?? 0),
      priority: Number(deal.priority ?? 0),
      startsAt,
      expiresAt,
      isStarted: startsMs ? startsMs <= now.getTime() : false,
      isExpired: expiresMs ? new Date(expiresAt as string).getTime() <= now.getTime() : false,
      productIds: Array.isArray(deal.productIds) ? (deal.productIds as unknown[]).map((x) => String(x)) : [],
      isActive: Boolean(deal.isActive),
      createdAt: new Date(deal.createdAt as unknown as string).toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const res = await Deal.findByIdAndDelete(id);

  if (!res) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

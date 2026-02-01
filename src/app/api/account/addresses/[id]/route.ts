import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Address from "@/models/Address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z
  .object({
    label: z.string().trim().max(60).optional(),

    fullName: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().min(5).max(40).optional(),

    addressLine1: z.string().trim().min(3).max(140).optional(),
    addressLine2: z.string().trim().max(140).optional(),

    city: z.string().trim().min(2).max(80).optional(),
    province: z.string().trim().min(2).max(80).optional(),
    country: z.string().trim().min(2).max(80).optional(),
    postalCode: z.string().trim().min(2).max(20).optional(),

    isDefault: z.boolean().optional(),
  })
  .strict();

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const current = await Address.findOne({ _id: id, userId: session.user.id }).select("type isDefault").lean();

  if (!current) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const type = String((current as unknown as { type?: string }).type ?? "");

  if (typeof parsed.data.isDefault === "boolean" && parsed.data.isDefault) {
    await Address.updateMany({ userId: session.user.id, type }, { $set: { isDefault: false } });
  }

  const update: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(parsed.data)) {
    if (typeof v !== "undefined") update[k] = v;
  }

  const addr = await Address.findOneAndUpdate({ _id: id, userId: session.user.id }, { $set: update }, { new: true })
    .lean();

  if (!addr) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  const current = await Address.findOne({ _id: id, userId: session.user.id }).select("type isDefault").lean();

  if (!current) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const type = String((current as unknown as { type?: string }).type ?? "");
  const wasDefault = Boolean((current as unknown as { isDefault?: boolean }).isDefault);

  await Address.deleteOne({ _id: id, userId: session.user.id });

  if (wasDefault) {
    const next = await Address.findOne({ userId: session.user.id, type }).sort({ createdAt: -1 }).select("_id");
    if (next?._id) {
      await Address.updateOne({ _id: next._id }, { $set: { isDefault: true } });
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

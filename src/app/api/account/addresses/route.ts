import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Address from "@/models/Address";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z
  .object({
    type: z.enum(["shipping", "billing"]),
    label: z.string().trim().max(60).optional(),

    fullName: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(5).max(40),

    addressLine1: z.string().trim().min(3).max(140),
    addressLine2: z.string().trim().max(140).optional(),

    city: z.string().trim().min(2).max(80),
    province: z.string().trim().min(2).max(80),
    country: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(2).max(20),

    isDefault: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const items = await Address.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();

  const mapped = items.map((a) => {
    const r = a as unknown as Record<string, unknown>;
    return {
      id: String(r._id),
      type: String(r.type),
      label: String(r.label ?? ""),
      fullName: String(r.fullName ?? ""),
      phone: String(r.phone ?? ""),
      addressLine1: String(r.addressLine1 ?? ""),
      addressLine2: String(r.addressLine2 ?? ""),
      city: String(r.city ?? ""),
      province: String(r.province ?? ""),
      country: String(r.country ?? ""),
      postalCode: String(r.postalCode ?? ""),
      isDefault: Boolean(r.isDefault),
      createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
      updatedAt: r.updatedAt ? new Date(String(r.updatedAt)).toISOString() : null,
    };
  });

  return NextResponse.json({ items: mapped }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = CreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const type = parsed.data.type;
  const shouldDefault = Boolean(parsed.data.isDefault);

  const existingCount = await Address.countDocuments({ userId: session.user.id, type });
  const makeDefault = shouldDefault || existingCount === 0;

  if (makeDefault) {
    await Address.updateMany({ userId: session.user.id, type }, { $set: { isDefault: false } });
  }

  const created = await Address.create({
    userId: session.user.id,
    type,
    label: parsed.data.label ?? "",
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    addressLine1: parsed.data.addressLine1,
    addressLine2: parsed.data.addressLine2 ?? "",
    city: parsed.data.city,
    province: parsed.data.province,
    country: parsed.data.country,
    postalCode: parsed.data.postalCode,
    isDefault: makeDefault,
  });

  return NextResponse.json(
    {
      address: {
        id: created._id.toString(),
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

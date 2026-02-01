import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import InventoryAdjustment from "@/models/InventoryAdjustment";
import Product from "@/models/Product";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const BodySchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  delta: z.coerce.number().int().min(-99999).max(99999),
  reason: z.string().trim().max(500).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { ok: false as const, res: NextResponse.json({ message: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return { ok: false as const, res: NextResponse.json({ message: "Forbidden" }, { status: 403 }), session: null };
  }

  return { ok: true as const, res: null, session };
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.delta === 0) {
    return NextResponse.json({ message: "Delta must be non-zero" }, { status: 400 });
  }

  await dbConnect();

  const product = await Product.findById(parsed.data.productId).select("stock variants");

  if (!product) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const actorId = admin.session?.user?.id as string;
  const actorEmail = admin.session?.user?.email ?? "";
  const actorRole = admin.session?.user?.role ?? "";

  if (parsed.data.variantId) {
    const variant = product.variants.id(parsed.data.variantId);

    if (!variant) {
      return NextResponse.json({ message: "Variant not found" }, { status: 404 });
    }

    const previousStock = Number(variant.stock ?? 0);
    const newStock = previousStock + parsed.data.delta;

    if (newStock < 0) {
      return NextResponse.json({ message: "Stock cannot be negative" }, { status: 400 });
    }

    variant.stock = newStock;
    await product.save();

    await InventoryAdjustment.create({
      productId: product._id,
      variantId: variant._id,
      delta: parsed.data.delta,
      previousStock,
      newStock,
      reason: parsed.data.reason,
      actorId,
      actorEmail,
      actorRole,
    });

    return NextResponse.json({ ok: true, productId: product._id.toString(), variantId: variant._id.toString(), previousStock, newStock });
  }

  const previousStock = Number(product.stock ?? 0);
  const newStock = previousStock + parsed.data.delta;

  if (newStock < 0) {
    return NextResponse.json({ message: "Stock cannot be negative" }, { status: 400 });
  }

  product.stock = newStock;
  await product.save();

  await InventoryAdjustment.create({
    productId: product._id,
    delta: parsed.data.delta,
    previousStock,
    newStock,
    reason: parsed.data.reason,
    actorId,
    actorEmail,
    actorRole,
  });

  return NextResponse.json({ ok: true, productId: product._id.toString(), previousStock, newStock });
}

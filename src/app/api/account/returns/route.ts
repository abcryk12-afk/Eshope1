import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import ReturnRequest from "@/models/ReturnRequest";
import SiteSetting from "@/models/SiteSetting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

function safeExt(name: string, type: string) {
  const fromType = String(type || "").toLowerCase();
  if (fromType === "image/jpeg") return ".jpg";
  if (fromType === "image/png") return ".png";
  if (fromType === "image/webp") return ".webp";

  const fromName = path.extname(name || "").toLowerCase();
  if (fromName && /^[.][a-z0-9]{1,8}$/.test(fromName)) return fromName;

  return ".bin";
}

function dayMs(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

const REASONS = new Set([
  "Damaged product",
  "Wrong item received",
  "Not as described",
  "Missing items",
  "Other",
]);

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const items = await ReturnRequest.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .select("orderId productId variantId reason comment images status refundProcessedAt createdAt")
    .lean();

  const orderIds = Array.from(
    new Set(items.map((r) => String((r as unknown as { orderId?: unknown }).orderId)).filter(isObjectId))
  );

  const orders = orderIds.length
    ? await Order.find({ _id: { $in: orderIds }, userId: session.user.id })
        .select("createdAt orderStatus")
        .lean()
    : [];

  const orderById = new Map(
    orders.map((o) => {
      const r = o as unknown as Record<string, unknown>;
      return [String(r._id), { createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null, orderStatus: String(r.orderStatus ?? "") }] as const;
    })
  );

  const productIds = Array.from(
    new Set(items.map((r) => String((r as unknown as { productId?: unknown }).productId)).filter(isObjectId))
  );

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("title slug images storeName brand").lean()
    : [];

  const productById = new Map(
    products.map((p) => {
      const r = p as unknown as Record<string, unknown>;
      const imgs = Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return [
        String(r._id),
        {
          title: String(r.title ?? ""),
          slug: String(r.slug ?? ""),
          image: imgs[0] ?? "",
          storeName: String(r.storeName ?? r.brand ?? ""),
        },
      ] as const;
    })
  );

  const mapped = items.map((rr) => {
    const r = rr as unknown as Record<string, unknown>;
    const oid = String(r.orderId ?? "");
    const pid = String(r.productId ?? "");
    const meta = productById.get(pid);
    const om = orderById.get(oid);

    return {
      id: String(r._id),
      orderId: oid,
      orderShort: oid ? oid.slice(-6) : "",
      orderCreatedAt: om?.createdAt ?? null,
      orderStatus: om?.orderStatus ?? "",
      productId: pid,
      variantId: String(r.variantId ?? ""),
      productTitle: meta?.title ?? "",
      productSlug: meta?.slug ?? "",
      productImage: meta?.image ?? "",
      storeName: meta?.storeName ?? "",
      reason: String(r.reason ?? ""),
      comment: String(r.comment ?? ""),
      images: Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [],
      status: String(r.status ?? ""),
      refundProcessedAt: r.refundProcessedAt ? new Date(String(r.refundProcessedAt)).toISOString() : null,
      createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
    };
  });

  return NextResponse.json({ items: mapped }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ message: "Invalid form" }, { status: 400 });
  }

  const orderId = String(form.get("orderId") ?? "").trim();
  const productId = String(form.get("productId") ?? "").trim();
  const variantId = String(form.get("variantId") ?? "").trim();
  const reason = String(form.get("reason") ?? "").trim();
  const comment = String(form.get("comment") ?? "").trim();

  if (!isObjectId(orderId) || !isObjectId(productId) || !isObjectId(variantId)) {
    return NextResponse.json({ message: "Invalid identifiers" }, { status: 400 });
  }

  if (!REASONS.has(reason)) {
    return NextResponse.json({ message: "Invalid reason" }, { status: 400 });
  }

  const files = form.getAll("images").filter((v): v is File => v instanceof File);

  if (files.length > 5) {
    return NextResponse.json({ message: "Too many images" }, { status: 400 });
  }

  for (const f of files) {
    if (!String(f.type || "").toLowerCase().startsWith("image/")) {
      return NextResponse.json({ message: "Only images are allowed" }, { status: 400 });
    }
    if (f.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: "Image too large (max 5MB)" }, { status: 400 });
    }
  }

  await dbConnect();

  const settings = (await SiteSetting.findOne({ key: "global" }).select("returns").lean()) as unknown;
  const windowDaysRaw = (settings as { returns?: { windowDays?: number } } | null)?.returns?.windowDays;
  const windowDays = typeof windowDaysRaw === "number" && Number.isFinite(windowDaysRaw) ? windowDaysRaw : 14;

  const order = await Order.findOne({ _id: orderId, userId: session.user.id })
    .select("orderStatus deliveredAt items")
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const status = String((order as unknown as { orderStatus?: string }).orderStatus ?? "");

  if (status === "Cancelled") {
    return NextResponse.json({ message: "Cancelled orders are not eligible" }, { status: 400 });
  }

  if (status !== "Delivered") {
    return NextResponse.json({ message: "Only delivered orders are eligible" }, { status: 400 });
  }

  const deliveredAt = (order as unknown as { deliveredAt?: Date | string }).deliveredAt;
  const deliveredDate = deliveredAt ? (deliveredAt instanceof Date ? deliveredAt : new Date(String(deliveredAt))) : null;

  if (!deliveredDate || !Number.isFinite(deliveredDate.getTime())) {
    return NextResponse.json({ message: "Delivery date missing" }, { status: 400 });
  }

  const now = Date.now();
  if (now - deliveredDate.getTime() > dayMs(Math.max(1, Math.min(60, windowDays)))) {
    return NextResponse.json({ message: "Return window expired" }, { status: 400 });
  }

  const items = Array.isArray((order as unknown as { items?: unknown[] }).items)
    ? ((order as unknown as { items?: unknown[] }).items as unknown[])
    : [];

  const match = items.find((it) => {
    const r = it as unknown as Record<string, unknown>;
    return String(r.productId ?? "") === productId && String(r.variantId ?? "") === variantId;
  });

  if (!match) {
    return NextResponse.json({ message: "Order item not found" }, { status: 400 });
  }

  const product = await Product.findById(productId).select("isDigital isNonReturnable isActive").lean();

  if (!product || !(product as unknown as { isActive?: boolean }).isActive) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  if ((product as unknown as { isDigital?: boolean }).isDigital) {
    return NextResponse.json({ message: "Digital products are not eligible" }, { status: 400 });
  }

  if ((product as unknown as { isNonReturnable?: boolean }).isNonReturnable) {
    return NextResponse.json({ message: "This product is non-returnable" }, { status: 400 });
  }

  const existing = await ReturnRequest.findOne({ orderId, productId, variantId }).select("_id");
  if (existing?._id) {
    return NextResponse.json({ message: "A return request already exists for this item" }, { status: 409 });
  }

  const urls: string[] = [];

  if (files.length) {
    const nowDate = new Date();
    const yy = String(nowDate.getFullYear());
    const mm = String(nowDate.getMonth() + 1).padStart(2, "0");

    const baseDir = path.join(process.cwd(), "public", "uploads", "returns", yy, mm);
    await mkdir(baseDir, { recursive: true });

    for (const f of files) {
      const ext = safeExt(f.name, f.type);
      if (![".jpg", ".png", ".webp"].includes(ext)) {
        return NextResponse.json({ message: "Only JPG/PNG/WEBP images are allowed" }, { status: 400 });
      }

      const bytes = Buffer.from(await f.arrayBuffer());
      const filename = `${crypto.randomUUID()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
      const filepath = path.join(baseDir, filename);
      await writeFile(filepath, bytes);

      urls.push(`/uploads/returns/${yy}/${mm}/${filename}`);
    }
  }

  const created = await ReturnRequest.create({
    orderId,
    userId: session.user.id,
    productId,
    variantId,
    reason,
    comment: comment || "",
    images: urls,
    status: "requested",
  });

  return NextResponse.json({ id: created._id.toString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

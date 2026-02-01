import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Review from "@/models/Review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function uniqKey(orderId: string, productId: string) {
  return `${orderId}:${productId}`;
}

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const deliveredOrders = await Order.find({ userId: session.user.id, orderStatus: "Delivered" })
    .sort({ createdAt: -1 })
    .select("items createdAt")
    .lean();

  const orderIds = deliveredOrders.map((o) => String((o as unknown as { _id: unknown })._id));

  const reviews = orderIds.length
    ? await Review.find({ userId: session.user.id, orderId: { $in: orderIds } })
        .sort({ createdAt: -1 })
        .select("productId orderId rating comment isHidden createdAt")
        .lean()
    : [];

  const reviewedKeySet = new Set(
    reviews.map((r) => {
      const rr = isRecord(r) ? r : {};
      return uniqKey(String(rr.orderId ?? ""), String(rr.productId ?? ""));
    })
  );

  const eligibleMap = new Map<
    string,
    {
      orderId: string;
      productId: string;
      title: string;
      slug: string;
      image: string;
    }
  >();

  for (const o of deliveredOrders) {
    const oo = isRecord(o) ? o : {};
    const oid = String(oo._id ?? "");
    const itemsRaw = Array.isArray(oo.items) ? (oo.items as unknown[]) : [];

    for (const it of itemsRaw) {
      const r = isRecord(it) ? it : {};
      const pid = r.productId ? String(r.productId) : "";
      if (!pid) continue;

      const key = uniqKey(oid, pid);
      if (reviewedKeySet.has(key)) continue;
      if (eligibleMap.has(key)) continue;

      eligibleMap.set(key, {
        orderId: oid,
        productId: pid,
        title: readString(r.title),
        slug: readString(r.slug),
        image: readString(r.image),
      });
    }
  }

  const eligible = Array.from(eligibleMap.values());

  const productIds = Array.from(
    new Set(reviews.map((r) => String((r as unknown as { productId?: unknown }).productId ?? "")).filter(isObjectId))
  );

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("title slug images").lean()
    : [];

  const productById = new Map(
    products.map((p) => {
      const r = isRecord(p) ? p : {};
      const imgs = Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return [
        String(r._id),
        {
          title: readString(r.title),
          slug: readString(r.slug),
          image: imgs[0] ?? "",
        },
      ] as const;
    })
  );

  const submitted = reviews.map((r) => {
    const rr = isRecord(r) ? r : {};
    const oid = String(rr.orderId ?? "");
    const pid = String(rr.productId ?? "");
    const pm = productById.get(pid);

    return {
      id: String(rr._id),
      orderId: oid,
      orderShort: oid ? oid.slice(-6) : "",
      productId: pid,
      productTitle: pm?.title ?? "",
      productSlug: pm?.slug ?? "",
      productImage: pm?.image ?? "",
      rating: Number(rr.rating ?? 0),
      comment: readString(rr.comment),
      status: Boolean(rr.isHidden) ? "hidden" : "published",
      createdAt: rr.createdAt ? new Date(String(rr.createdAt)).toISOString() : null,
    };
  });

  return NextResponse.json({ eligible, submitted }, { headers: { "Cache-Control": "no-store" } });
}

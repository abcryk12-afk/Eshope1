import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import ReturnRequest from "@/models/ReturnRequest";
import User from "@/models/User";
import Product from "@/models/Product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isObjectId(v: string) {
  return /^[a-fA-F0-9]{24}$/.test(v);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await dbConnect();

  const items = await ReturnRequest.find({}).sort({ createdAt: -1 }).limit(200).lean();

  const userIds = Array.from(new Set(items.map((r) => String((r as unknown as { userId?: unknown }).userId)).filter(isObjectId)));
  const productIds = Array.from(new Set(items.map((r) => String((r as unknown as { productId?: unknown }).productId)).filter(isObjectId)));

  const [users, products] = await Promise.all([
    userIds.length ? User.find({ _id: { $in: userIds } }).select("email").lean() : Promise.resolve([]),
    productIds.length ? Product.find({ _id: { $in: productIds } }).select("title images storeName brand").lean() : Promise.resolve([]),
  ]);

  const userById = new Map(users.map((u) => [String((u as unknown as { _id: unknown })._id), String((u as unknown as { email?: string }).email ?? "")] as const));

  const productById = new Map(
    products.map((p) => {
      const r = p as unknown as Record<string, unknown>;
      const imgs = Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return [
        String(r._id),
        {
          title: String(r.title ?? ""),
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
    const uid = String(r.userId ?? "");
    const pm = productById.get(pid);

    return {
      id: String(r._id),
      orderId: oid,
      orderShort: oid ? oid.slice(-6) : "",
      userEmail: userById.get(uid) ?? "",
      productTitle: pm?.title ?? "",
      productImage: pm?.image ?? "",
      storeName: pm?.storeName ?? "",
      reason: String(r.reason ?? ""),
      comment: String(r.comment ?? ""),
      images: Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [],
      status: String(r.status ?? ""),
      createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
      refundProcessedAt: r.refundProcessedAt ? new Date(String(r.refundProcessedAt)).toISOString() : null,
    };
  });

  return NextResponse.json({ items: mapped }, { headers: { "Cache-Control": "no-store" } });
}

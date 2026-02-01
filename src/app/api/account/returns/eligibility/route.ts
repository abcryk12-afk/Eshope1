import { NextResponse } from "next/server";
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

function dayMs(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const orderId = String(url.searchParams.get("orderId") ?? "").trim();

  if (!isObjectId(orderId)) {
    return NextResponse.json({ message: "Invalid orderId" }, { status: 400 });
  }

  await dbConnect();

  const settings = (await SiteSetting.findOne({ key: "global" }).select("returns").lean()) as unknown;
  const windowDaysRaw = (settings as { returns?: { windowDays?: number } } | null)?.returns?.windowDays;
  const windowDays = typeof windowDaysRaw === "number" && Number.isFinite(windowDaysRaw) ? windowDaysRaw : 14;

  const order = await Order.findOne({ _id: orderId, userId: session.user.id })
    .select("orderStatus deliveredAt items")
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const status = String((order as unknown as { orderStatus?: string }).orderStatus ?? "");
  const deliveredAt = (order as unknown as { deliveredAt?: Date | string }).deliveredAt;
  const deliveredDate = deliveredAt ? (deliveredAt instanceof Date ? deliveredAt : new Date(String(deliveredAt))) : null;

  const isDelivered = status === "Delivered" && deliveredDate && Number.isFinite(deliveredDate.getTime());

  const itemsRaw: unknown[] = Array.isArray((order as unknown as { items?: unknown[] }).items)
    ? ((order as unknown as { items?: unknown[] }).items as unknown[])
    : [];

  const items = itemsRaw.map((it) => {
    const r = it as unknown as Record<string, unknown>;
    const productId = r.productId ? String(r.productId) : "";
    const variantId = r.variantId ? String(r.variantId) : "";
    return {
      productId,
      variantId,
      title: typeof r.title === "string" ? r.title : "",
      slug: typeof r.slug === "string" ? r.slug : "",
      image: typeof r.image === "string" ? r.image : "",
    };
  });

  const productIds = Array.from(new Set(items.map((i) => i.productId).filter(isObjectId)));

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select("isDigital isNonReturnable storeName brand").lean()
    : [];

  const productMeta = new Map(
    products.map((p) => {
      const r = p as unknown as Record<string, unknown>;
      const id = String(r._id);
      return [
        id,
        {
          isDigital: Boolean(r.isDigital),
          isNonReturnable: Boolean(r.isNonReturnable),
          storeName: String(r.storeName ?? r.brand ?? ""),
        },
      ] as const;
    })
  );

  const existing = await ReturnRequest.find({ orderId, userId: session.user.id })
    .select("productId variantId status")
    .lean();

  const byKey = new Map<string, { status: string }>();

  for (const rr of existing) {
    const r = rr as unknown as Record<string, unknown>;
    const key = `${String(r.productId)}:${String(r.variantId)}`;
    byKey.set(key, { status: String(r.status ?? "") });
  }

  const now = Date.now();
  const windowOk =
    isDelivered &&
    deliveredDate != null &&
    now - deliveredDate.getTime() <= dayMs(Math.max(1, Math.min(60, windowDays)));

  const mapped = items.map((it) => {
    const key = `${it.productId}:${it.variantId}`;

    const existingReq = byKey.get(key) ?? null;
    if (existingReq) {
      return {
        ...it,
        storeName: productMeta.get(it.productId)?.storeName ?? "",
        eligible: false,
        ineligibleReason: "A return request already exists for this item",
        requestStatus: existingReq.status,
      };
    }

    if (status === "Cancelled") {
      return {
        ...it,
        storeName: productMeta.get(it.productId)?.storeName ?? "",
        eligible: false,
        ineligibleReason: "Cancelled orders are not eligible",
        requestStatus: null,
      };
    }

    if (!isDelivered) {
      return {
        ...it,
        storeName: productMeta.get(it.productId)?.storeName ?? "",
        eligible: false,
        ineligibleReason: "Only delivered orders are eligible",
        requestStatus: null,
      };
    }

    if (!windowOk) {
      return {
        ...it,
        storeName: productMeta.get(it.productId)?.storeName ?? "",
        eligible: false,
        ineligibleReason: "Return window expired",
        requestStatus: null,
      };
    }

    const meta = productMeta.get(it.productId);

    if (!meta) {
      return {
        ...it,
        storeName: "",
        eligible: false,
        ineligibleReason: "Product not found",
        requestStatus: null,
      };
    }

    if (meta.isDigital) {
      return {
        ...it,
        storeName: meta.storeName,
        eligible: false,
        ineligibleReason: "Digital products are not eligible",
        requestStatus: null,
      };
    }

    if (meta.isNonReturnable) {
      return {
        ...it,
        storeName: meta.storeName,
        eligible: false,
        ineligibleReason: "This product is non-returnable",
        requestStatus: null,
      };
    }

    return {
      ...it,
      storeName: meta.storeName,
      eligible: true,
      ineligibleReason: null,
      requestStatus: null,
    };
  });

  return NextResponse.json({ windowDays, items: mapped }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import type { SortOrder } from "mongoose";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import SiteSetting from "@/models/SiteSetting";
import User from "@/models/User";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z
    .enum(["all", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"])
    .default("all"),
  paid: z.enum(["all", "paid", "unpaid"]).default("all"),
  q: z.string().trim().max(120).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
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

function isHexObjectId(v: string) {
  return /^[a-f0-9]{24}$/i.test(v);
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    paid: url.searchParams.get("paid") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, status, paid, q, sort } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};

  if (status !== "all") {
    filter.orderStatus = status;
  }

  if (paid !== "all") {
    filter.isPaid = paid === "paid";
  }

  const query = (q ?? "").trim();

  if (query) {
    if (isHexObjectId(query)) {
      filter._id = query;
    } else {
      const userMatches = await User.find({ email: { $regex: query, $options: "i" } })
        .select("_id")
        .limit(25)
        .lean();

      const userIds = userMatches.map((u) => u._id);

      const or: Record<string, unknown>[] = [{ guestEmail: { $regex: query, $options: "i" } }];
      if (userIds.length > 0) {
        or.push({ userId: { $in: userIds } });
      }

      filter.$or = or;
    }
  }

  const sortSpec: { createdAt: SortOrder } =
    sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
  const skip = (page - 1) * limit;

  const [items, total, settingsDoc] = await Promise.all([
    Order.find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit)
      .populate("userId", "email")
      .select(
        "userId guestEmail totalAmount currency pkrPerUsd orderStatus isPaid createdAt items shippingAddress paymentMethod"
      )
      .lean(),
    Order.countDocuments(filter),
    SiteSetting.findOne({ key: "global" }).select("globalSeoTitle whatsAppOrderTemplate").lean(),
  ]);

  const root = settingsDoc as Record<string, unknown> | null;
  const storeName = typeof root?.globalSeoTitle === "string" ? root.globalSeoTitle.trim() : "";
  const whatsAppOrderTemplate =
    typeof root?.whatsAppOrderTemplate === "string" ? root.whatsAppOrderTemplate.trim() : "";

  const mapped = items.map((o) => {
    const user = o.userId as unknown as { email?: string };

    const shipping = (o as unknown as { shippingAddress?: unknown }).shippingAddress as
      | {
          fullName?: string;
          phone?: string;
        }
      | undefined;

    const orderItems = (o as unknown as { items?: unknown[] }).items;
    const itemsBrief = Array.isArray(orderItems)
      ? orderItems
          .filter((it) => typeof it === "object" && it !== null)
          .map((it) => it as Record<string, unknown>)
          .map((it) => ({
            title: String(it.title ?? ""),
            quantity: Number(it.quantity ?? 0),
            variantSku: String(it.variantSku ?? "").trim() || undefined,
            variantSize: String(it.variantSize ?? "").trim() || undefined,
            variantColor: String(it.variantColor ?? "").trim() || undefined,
          }))
          .filter((it) => it.title.trim() && it.quantity > 0)
      : [];

    return {
      id: String(o._id),
      createdAt: new Date(o.createdAt as unknown as string).toISOString(),
      totalAmount: Number(o.totalAmount ?? 0),
      currency: String((o as unknown as { currency?: string }).currency ?? "PKR"),
      pkrPerUsd: Number((o as unknown as { pkrPerUsd?: number }).pkrPerUsd ?? 0) || undefined,
      orderStatus: String(o.orderStatus ?? ""),
      isPaid: Boolean(o.isPaid),
      customerEmail: user?.email ?? (o as unknown as { guestEmail?: string }).guestEmail,
      itemsCount: Array.isArray(o.items) ? o.items.length : 0,
      customerName: typeof shipping?.fullName === "string" ? shipping.fullName : undefined,
      customerPhone: typeof shipping?.phone === "string" ? shipping.phone : undefined,
      items: itemsBrief,
      paymentMethod: String((o as unknown as { paymentMethod?: string }).paymentMethod ?? ""),
    };
  });

  return NextResponse.json({
    storeName: storeName || "Shop",
    whatsAppOrderTemplate: whatsAppOrderTemplate || undefined,
    items: mapped,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

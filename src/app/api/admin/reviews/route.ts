import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { recomputeProductReviewStats } from "@/lib/reviews";
import Product from "@/models/Product";
import Review from "@/models/Review";
import ReviewReply from "@/models/ReviewReply";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(120).optional(),
  hidden: z.enum(["all", "visible", "hidden"]).default("all"),
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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    hidden: url.searchParams.get("hidden") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { page, limit, q, hidden } = parsed.data;

  await dbConnect();

  const filter: Record<string, unknown> = {};

  if (hidden === "visible") filter.isHidden = false;
  if (hidden === "hidden") filter.isHidden = true;

  const skip = (page - 1) * limit;

  const items = await Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const total = await Review.countDocuments(filter);

  const userIds = Array.from(new Set(items.map((r) => String((r as unknown as { userId?: unknown }).userId ?? "")).filter(Boolean)));
  const productIds = Array.from(new Set(items.map((r) => String((r as unknown as { productId?: unknown }).productId ?? "")).filter(Boolean)));

  const [users, products] = await Promise.all([
    userIds.length ? User.find({ _id: { $in: userIds } }).select("email name").lean() : Promise.resolve([]),
    productIds.length ? Product.find({ _id: { $in: productIds } }).select("title slug images").lean() : Promise.resolve([]),
  ]);

  const userById = new Map(
    users.map((u) => {
      const r = isRecord(u) ? u : {};
      return [String(r._id), { email: String(r.email ?? ""), name: String(r.name ?? "") }] as const;
    })
  );

  const productById = new Map(
    products.map((p) => {
      const r = isRecord(p) ? p : {};
      const imgs = Array.isArray(r.images) ? (r.images as unknown[]).filter((x): x is string => typeof x === "string") : [];
      return [String(r._id), { title: String(r.title ?? ""), slug: String(r.slug ?? ""), image: imgs[0] ?? "" }] as const;
    })
  );

  const qq = (q ?? "").trim().toLowerCase();

  const mapped = items
    .map((rev) => {
      const r = isRecord(rev) ? rev : {};
      const uid = String(r.userId ?? "");
      const pid = String(r.productId ?? "");
      const oid = String(r.orderId ?? "");

      const u = userById.get(uid);
      const p = productById.get(pid);

      return {
        id: String(r._id),
        userId: uid,
        userEmail: u?.email ?? "",
        userName: u?.name ?? "",
        productId: pid,
        productTitle: p?.title ?? "",
        productSlug: p?.slug ?? "",
        productImage: p?.image ?? "",
        orderId: oid,
        orderShort: oid ? oid.slice(-6) : "",
        rating: Number(r.rating ?? 0),
        comment: typeof r.comment === "string" ? r.comment : "",
        isHidden: Boolean(r.isHidden),
        createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
      };
    })
    .filter((x) => {
      if (!qq) return true;
      const hay = `${x.userEmail} ${x.userName} ${x.productTitle} ${x.orderShort}`.toLowerCase();
      return hay.includes(qq);
    });

  return NextResponse.json({
    items: mapped,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
}

const UpdateSchema = z
  .object({
    action: z.enum(["hide", "unhide", "delete"]),
  })
  .strict();

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const url = new URL(req.url);
  const reviewId = String(url.searchParams.get("id") ?? "").trim();

  if (!reviewId) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  await dbConnect();

  const review = await Review.findById(reviewId).select("productId isHidden");

  if (!review) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const productId = String((review as unknown as { productId?: unknown }).productId ?? "");

  if (parsed.data.action === "hide") {
    if (!(review as unknown as { isHidden?: boolean }).isHidden) {
      review.set("isHidden", true);
      review.set("hiddenAt", new Date());
      review.set("hiddenBy", admin.session?.user?.id ?? null);
      await review.save();
      await recomputeProductReviewStats(productId);
    }
  }

  if (parsed.data.action === "unhide") {
    if ((review as unknown as { isHidden?: boolean }).isHidden) {
      review.set("isHidden", false);
      review.set("hiddenAt", null);
      review.set("hiddenBy", null);
      await review.save();
      await recomputeProductReviewStats(productId);
    }
  }

  if (parsed.data.action === "delete") {
    await ReviewReply.deleteMany({ reviewId });
    await Review.deleteOne({ _id: reviewId });
    await recomputeProductReviewStats(productId);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { recomputeProductReviewStats } from "@/lib/reviews";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Review from "@/models/Review";
import ReviewReply from "@/models/ReviewReply";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const QuerySchema = z.object({
  productId: z.string().trim().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    productId: url.searchParams.get("productId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query" }, { status: 400 });
  }

  const { productId, page, limit } = parsed.data;

  await dbConnect();

  const product = await Product.findById(productId).select("ratingAvg ratingCount").lean();

  if (!product) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Review.find({ productId, isHidden: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name")
      .lean(),
    Review.countDocuments({ productId, isHidden: false }),
  ]);

  const reviewIds = items.map((r) => String((r as unknown as { _id: unknown })._id));

  const replies = reviewIds.length
    ? await ReviewReply.find({ reviewId: { $in: reviewIds }, isHidden: false })
        .sort({ createdAt: 1 })
        .lean()
    : [];

  const replyByReviewId = new Map<string, unknown[]>();

  for (const rep of replies) {
    const rid = String((rep as unknown as { reviewId: unknown }).reviewId);
    const list = replyByReviewId.get(rid) ?? [];
    list.push(rep);
    replyByReviewId.set(rid, list);
  }

  const mapped = items.map((r) => {
    const rr = r as unknown as {
      _id: unknown;
      rating: number;
      comment?: string;
      createdAt?: string;
      userId?: unknown;
    };

    const u = isRecord(rr.userId) ? rr.userId : {};

    return {
      id: String(rr._id),
      rating: Number(rr.rating ?? 0),
      comment: typeof rr.comment === "string" ? rr.comment : "",
      createdAt: rr.createdAt ? new Date(rr.createdAt).toISOString() : null,
      user: {
        name: typeof u.name === "string" ? u.name : "",
      },
      replies: (replyByReviewId.get(String(rr._id)) ?? []).map((rep) => {
        const x = rep as unknown as {
          _id: unknown;
          message?: string;
          createdAt?: string;
          authorName?: string;
          authorRole?: string;
        };
        return {
          id: String(x._id),
          message: typeof x.message === "string" ? x.message : "",
          createdAt: x.createdAt ? new Date(x.createdAt).toISOString() : null,
          authorName: typeof x.authorName === "string" ? x.authorName : "",
          authorRole: typeof x.authorRole === "string" ? x.authorRole : "",
        };
      }),
    };
  });

  const pages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json(
    {
      summary: {
        ratingAvg: Number((product as unknown as { ratingAvg?: number }).ratingAvg ?? 0),
        ratingCount: Number((product as unknown as { ratingCount?: number }).ratingCount ?? 0),
      },
      items: mapped,
      pagination: { page, pages, total, limit },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

const BodySchema = z
  .object({
    productId: z.string().trim().min(1),
    orderId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  const { productId, orderId, rating, comment } = parsed.data;

  await dbConnect();

  const product = await Product.findById(productId).select("_id isActive").lean();

  if (!product || !(product as unknown as { isActive?: boolean }).isActive) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }

  const order = await Order.findOne({
    _id: orderId,
    userId: session.user.id,
    orderStatus: "Delivered",
    "items.productId": productId,
  })
    .select("_id orderStatus")
    .lean();

  if (!order) {
    return NextResponse.json(
      { message: "Only verified buyers with delivered orders can review this product" },
      { status: 403 }
    );
  }

  const review = await Review.findOneAndUpdate(
    { productId, orderId, userId: session.user.id },
    {
      $set: {
        orderId,
        rating,
        comment: comment ?? "",
        isHidden: false,
        hiddenAt: null,
        hiddenBy: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  await recomputeProductReviewStats(productId);

  return NextResponse.json(
    {
      review: {
        id: String((review as unknown as { _id: unknown })._id),
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

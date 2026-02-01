import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import UserMessage from "@/models/UserMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(100, Number(limitRaw ?? 50) || 50));

  await dbConnect();

  const items = await UserMessage.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(limit).lean();

  const mapped = items.map((m) => {
    const r = isRecord(m) ? m : {};
    const body = typeof r.body === "string" ? r.body : "";
    const preview = body.length > 120 ? body.slice(0, 120) + "…" : body;

    return {
      id: String(r._id),
      title: typeof r.title === "string" ? r.title : "",
      preview,
      body,
      type: typeof r.type === "string" ? r.type : "",
      relatedOrderId: r.relatedOrderId ? String(r.relatedOrderId) : null,
      isRead: Boolean(r.isRead),
      createdAt: r.createdAt ? new Date(String(r.createdAt)).toISOString() : null,
    };
  });

  return NextResponse.json({ items: mapped }, { headers: { "Cache-Control": "no-store" } });
}

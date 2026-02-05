import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { pingSitemapIfEnabled } from "@/lib/sitemapPing";
import Product from "@/models/Product";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["activate", "deactivate", "delete"]),
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

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const ids = parsed.data.ids;

  if (parsed.data.action === "delete") {
    const res = await Product.deleteMany({ _id: { $in: ids } });
    void pingSitemapIfEnabled();
    return NextResponse.json({ ok: true, deleted: res.deletedCount ?? 0 });
  }

  const isActive = parsed.data.action === "activate";
  const res = await Product.updateMany({ _id: { $in: ids } }, { $set: { isActive } });

  void pingSitemapIfEnabled();

  return NextResponse.json({ ok: true, modified: res.modifiedCount ?? 0 });
}

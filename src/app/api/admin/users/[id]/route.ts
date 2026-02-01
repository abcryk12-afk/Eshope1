import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";
import User from "@/models/User";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

const UpdateSchema = z
  .object({
    role: z.enum(["user", "staff", "admin", "super_admin"]).optional(),
    isBlocked: z.boolean().optional(),
  })
  .strict();

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

function canUpdate(actorRole: string) {
  return actorRole === "admin" || actorRole === "super_admin";
}

function canAssignRole(actorRole: string, nextRole: string) {
  if (actorRole === "super_admin") return true;
  if (actorRole !== "admin") return false;

  return nextRole !== "admin" && nextRole !== "super_admin";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const { id } = await params;

  await dbConnect();

  const user = await User.findById(id).select("name email role isBlocked createdAt").lean();

  if (!user) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const orders = await Order.find({ userId: id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("totalAmount orderStatus isPaid createdAt items")
    .lean();

  const mappedOrders = orders.map((o) => ({
    id: String(o._id),
    createdAt: new Date(o.createdAt as unknown as string).toISOString(),
    totalAmount: Number(o.totalAmount ?? 0),
    orderStatus: String(o.orderStatus ?? ""),
    isPaid: Boolean(o.isPaid),
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
  }));

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: Boolean(user.isBlocked),
      createdAt: new Date(user.createdAt as unknown as string).toISOString(),
    },
    orders: mappedOrders,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.res;

  const actorRole = admin.session?.user?.role ?? "";

  if (!canUpdate(actorRole)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = UpdateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.role && !canAssignRole(actorRole, parsed.data.role)) {
    return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
  }

  await dbConnect();

  const update: Record<string, unknown> = {};

  if (typeof parsed.data.isBlocked === "boolean") {
    update.isBlocked = parsed.data.isBlocked;
  }

  if (parsed.data.role) {
    update.role = parsed.data.role;
  }

  const user = await User.findByIdAndUpdate(id, { $set: update }, { new: true })
    .select("name email role isBlocked createdAt")
    .lean();

  if (!user) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isBlocked: Boolean(user.isBlocked),
      createdAt: new Date(user.createdAt as unknown as string).toISOString(),
    },
  });
}

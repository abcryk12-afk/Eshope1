import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Category from "@/models/Category";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

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

const ItemSchema = z.object({
  id: z.string().trim().min(1),
  parentId: z.string().trim().min(1).nullable().optional().default(null),
  sortOrder: z.number().int(),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function readParentId(v: unknown): string {
  if (!isRecord(v)) return "";
  const raw = v.parentId;
  return raw ? String(raw) : "";
}

function readLevel(v: unknown): number {
  if (!isRecord(v)) return 0;
  const raw = v.level;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

async function wouldCreateCycle(id: string, parentId: string | null) {
  if (!parentId) return false;
  if (parentId === id) return true;

  let cur: string | null = parentId;
  for (let i = 0; i < 40; i++) {
    const doc = await Category.findById(cur).select("parentId").lean();
    const pid = readParentId(doc);
    if (!pid) return false;
    if (pid === id) return true;
    cur = pid;
  }

  return true;
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

  // Prevent circular nesting
  for (const it of parsed.data.items) {
    if (await wouldCreateCycle(it.id, it.parentId ?? null)) {
      return NextResponse.json({ message: "Invalid nesting" }, { status: 400 });
    }
  }

  // Apply parentId + sortOrder
  await Category.bulkWrite(
    parsed.data.items.map((it) => ({
      updateOne: {
        filter: { _id: it.id },
        update: { $set: { parentId: it.parentId ?? null, sortOrder: it.sortOrder } },
      },
    }))
  );

  // Recompute levels for all categories (safe + keeps data consistent)
  const all = (await Category.find({}).select("_id parentId level").lean()) as unknown[];
  const byId = new Map<string, { id: string; parentId: string | null; level: number }>();

  for (const c of all) {
    const id = isRecord(c) ? String(c._id ?? "") : "";
    if (!id) continue;
    byId.set(id, {
      id,
      parentId: isRecord(c) && c.parentId ? String(c.parentId) : null,
      level: readLevel(c),
    });
  }

  const computed = new Map<string, number>();
  const computing = new Set<string>();

  function computeLevel(id: string): number {
    if (computed.has(id)) return computed.get(id)!;
    if (computing.has(id)) return 0;
    computing.add(id);

    const n = byId.get(id);
    if (!n) {
      computing.delete(id);
      computed.set(id, 0);
      return 0;
    }

    const pid = n.parentId;
    const lvl = pid && byId.has(pid) ? Math.min(20, computeLevel(pid) + 1) : 0;

    computing.delete(id);
    computed.set(id, lvl);
    return lvl;
  }

  const updates: { id: string; level: number }[] = [];
  for (const id of byId.keys()) {
    const lvl = computeLevel(id);
    updates.push({ id, level: lvl });
  }

  await Category.bulkWrite(
    updates.map((u) => ({
      updateOne: {
        filter: { _id: u.id },
        update: { $set: { level: u.level } },
      },
    }))
  );

  return NextResponse.json({ ok: true });
}

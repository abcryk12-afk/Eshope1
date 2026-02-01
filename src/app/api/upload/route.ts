import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import crypto from "crypto";

import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

function safeExt(name: string, type: string) {
  const fromName = path.extname(name || "").toLowerCase();
  if (fromName && /^[.][a-z0-9]{1,8}$/.test(fromName)) return fromName;

  const fromType = type.toLowerCase();
  if (fromType === "image/jpeg") return ".jpg";
  if (fromType === "image/png") return ".png";
  if (fromType === "image/webp") return ".webp";
  if (fromType === "image/gif") return ".gif";

  return ".bin";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_ROLE_SET.has(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);

  if (!form) {
    return NextResponse.json({ message: "Invalid form" }, { status: 400 });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ message: "No files" }, { status: 400 });
  }

  const urls: string[] = [];

  const now = new Date();
  const yy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const baseDir = path.join(process.cwd(), "public", "uploads", yy, mm);
  await mkdir(baseDir, { recursive: true });

  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only images are allowed" }, { status: 400 });
    }

    if (f.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large" }, { status: 400 });
    }

    const ext = safeExt(f.name, f.type);
    const filename = `${crypto.randomUUID()}${ext}`;
    const abs = path.join(baseDir, filename);

    const buf = Buffer.from(await f.arrayBuffer());
    await writeFile(abs, buf);

    urls.push(`/uploads/${yy}/${mm}/${filename}`);
  }

  return NextResponse.json({ urls }, { status: 201 });
}

import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import path from "path";
import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import Order from "@/models/Order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeExt(name: string, type: string) {
  const fromType = type.toLowerCase();
  if (fromType === "image/jpeg") return ".jpg";
  if (fromType === "image/png") return ".png";
  if (fromType === "application/pdf") return ".pdf";

  const fromName = path.extname(name || "").toLowerCase();
  if (fromName === ".jpg" || fromName === ".jpeg") return ".jpg";
  if (fromName === ".png") return ".png";
  if (fromName === ".pdf") return ".pdf";

  return ".bin";
}

function isAllowedType(type: string) {
  const t = String(type || "").toLowerCase();
  return t === "image/jpeg" || t === "image/png" || t === "application/pdf";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  const url = new URL(req.url);
  const emailRaw = url.searchParams.get("email");
  const email = emailRaw ? emailRaw.trim().toLowerCase() : "";

  if (!session?.user?.id && !email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);

  if (!form) {
    return NextResponse.json({ message: "Invalid form" }, { status: 400 });
  }

  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  if (!isAllowedType(file.type)) {
    return NextResponse.json({ message: "Only JPG, PNG, or PDF allowed" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ message: "File too large" }, { status: 400 });
  }

  await dbConnect();

  const filter: Record<string, unknown> = { _id: id };

  if (session?.user?.id) {
    filter.userId = session.user.id;
  } else {
    filter.guestEmail = email;
  }

  const order = await Order.findOne(filter)
    .select("paymentMethod paymentStatus isPaid guestEmail")
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const paymentMethod = String((order as unknown as { paymentMethod?: string }).paymentMethod ?? "");

  if (paymentMethod !== "manual" && paymentMethod !== "online") {
    return NextResponse.json({ message: "Receipt upload is only available for manual or online payment" }, { status: 400 });
  }

  const paymentStatus = String((order as unknown as { paymentStatus?: string }).paymentStatus ?? "");

  if ((order as unknown as { isPaid?: boolean }).isPaid || paymentStatus === "Paid") {
    return NextResponse.json({ message: "Payment is already approved" }, { status: 400 });
  }

  const now = new Date();
  const yy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const baseDir = path.join(process.cwd(), "public", "uploads", "receipts", yy, mm);
  await mkdir(baseDir, { recursive: true });

  const ext = safeExt(file.name, file.type);
  if (!isAllowedType(file.type) || ext === ".bin") {
    return NextResponse.json({ message: "Invalid file" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  const abs = path.join(baseDir, filename);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buf);

  const fileUrl = `/uploads/receipts/${yy}/${mm}/${filename}`;

  const updated = await Order.findByIdAndUpdate(
    id,
    {
      $set: {
        paymentReceiptUrl: fileUrl,
        paymentReceiptUploadedAt: now,
        paymentReceiptRejectedReason: null,
        paymentReceiptReviewedAt: null,
        paymentReceiptReviewedBy: null,
        paymentStatus: "ProofSubmitted",
      },
    },
    { new: true }
  )
    .select("paymentStatus paymentReceiptUrl paymentReceiptUploadedAt")
    .lean();

  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const uploadedAt = (updated as unknown as { paymentReceiptUploadedAt?: string | Date }).paymentReceiptUploadedAt;
  const uploadedAtIso = uploadedAt
    ? (uploadedAt instanceof Date ? uploadedAt : new Date(String(uploadedAt))).toISOString()
    : null;

  return NextResponse.json(
    {
      order: {
        paymentStatus: String((updated as unknown as { paymentStatus?: string }).paymentStatus ?? ""),
        paymentReceiptUrl: String((updated as unknown as { paymentReceiptUrl?: string }).paymentReceiptUrl ?? ""),
        paymentReceiptUploadedAt: uploadedAtIso,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

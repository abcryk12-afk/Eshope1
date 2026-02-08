import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

export const runtime = "nodejs";

const BodySchema = z.object({
  token: z.string().trim().min(10),
  password: z.string().min(8).max(200),
});

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await dbConnect();

  const tokenHash = sha256(parsed.data.token);

  const doc = await PasswordResetToken.findOne({ tokenHash }).select("userId email expiresAt usedAt");

  if (!doc) {
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
  }

  if (doc.usedAt) {
    return NextResponse.json({ message: "Token already used" }, { status: 400 });
  }

  if (new Date(doc.expiresAt).getTime() < Date.now()) {
    return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await User.updateOne(
    { _id: doc.userId, email: doc.email },
    { $set: { passwordHash } }
  );

  doc.usedAt = new Date();
  await doc.save();

  return NextResponse.json({ ok: true });
}

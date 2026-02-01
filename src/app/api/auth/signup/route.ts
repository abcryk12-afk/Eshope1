import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import User from "@/models/User";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const SignupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { message: "Database is not configured" },
      { status: 503 }
    );
  }

  const json = (await req.json().catch(() => null)) as unknown;

  const parsed = SignupSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid signup payload" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    await dbConnect();
  } catch (err: unknown) {
    console.error("[auth/signup] dbConnect failed", err);

    if (err instanceof Error && err.message.startsWith("Invalid MONGODB_URI")) {
      return NextResponse.json(
        { message: err.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Could not connect to database" },
      { status: 503 }
    );
  }

  const existing = await User.findOne({ email }).catch(() => null);

  if (existing) {
    return NextResponse.json(
      { message: "Email already in use" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const user = await User.create({
      name: parsed.data.name.trim(),
      email,
      passwordHash,
      role: "user",
    });

    return NextResponse.json(
      {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const rec = isRecord(err) ? err : {};
    const code = typeof rec.code === "number" ? rec.code : undefined;

    if (code === 11000) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Could not create account" },
      { status: 500 }
    );
  }
}

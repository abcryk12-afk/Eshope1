import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export const runtime = "nodejs";

const WishlistSchema = z.array(z.string().min(1));

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id).select("wishlist");

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ productIds: (user.wishlist ?? []).map(String) });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = WishlistSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid wishlist payload" },
      { status: 400 }
    );
  }

  await dbConnect();

  const user = await User.findByIdAndUpdate(
    session.user.id,
    { $set: { wishlist: parsed.data } },
    { new: true }
  ).select("wishlist");

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ productIds: (user.wishlist ?? []).map(String) });
}

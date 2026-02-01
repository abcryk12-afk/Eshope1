import { NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json(
      { ok: false, db: "not_configured" },
      { status: 503 }
    );
  }

  await dbConnect();

  return NextResponse.json({ ok: true, db: "connected" });
}

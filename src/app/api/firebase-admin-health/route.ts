import { NextResponse } from "next/server";

import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = getFirebaseAdminAuth();
    const projectId = String((auth.app.options as { projectId?: unknown })?.projectId ?? "");
    return NextResponse.json({ ok: true, projectId });
  } catch (err: unknown) {
    console.error("[firebase-admin-health] init failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

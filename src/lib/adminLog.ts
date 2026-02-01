import type { Session } from "next-auth";

import { dbConnect } from "@/lib/db";
import AdminLog from "@/models/AdminLog";

type LogParams = {
  session: Session | null;
  action: string;
  entityType: string;
  entityId?: string;
  message?: string;
  meta?: unknown;
};

export async function logAdminAction({ session, action, entityType, entityId, message, meta }: LogParams) {
  try {
    if (!session?.user?.id) return;

    await dbConnect();

    await AdminLog.create({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      action,
      entityType,
      entityId,
      message,
      meta,
    });
  } catch {
    return;
  }
}

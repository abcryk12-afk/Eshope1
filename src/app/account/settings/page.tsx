import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);

  await dbConnect();

  const user = session?.user?.id
    ? await User.findById(session.user.id).select("name email").lean()
    : null;

  const name = String((user as unknown as { name?: string })?.name ?? "");
  const email = String((user as unknown as { email?: string })?.email ?? "");

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your profile and security.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Personal information</h2>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Name:</span> {name || "—"}
            </div>
            <div>
              <span className="font-semibold text-foreground">Email:</span> {email || "—"}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Editing profile fields will be added next.</p>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="text-sm font-semibold text-foreground">Security</h2>
          <p className="mt-3 text-sm text-muted-foreground">Password/email change UI will be added next.</p>
        </div>
      </div>
    </div>
  );
}

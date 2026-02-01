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
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Manage your profile and security.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Personal information</h2>
          <div className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">Name:</span> {name || "—"}
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">Email:</span> {email || "—"}
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Editing profile fields will be added next.</p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Security</h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Password/email change UI will be added next.</p>
        </div>
      </div>
    </div>
  );
}

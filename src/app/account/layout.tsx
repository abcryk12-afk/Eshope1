import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import AccountSidebar from "@/app/account/_components/AccountSidebar";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  await dbConnect();

  const user = session?.user?.id
    ? await User.findById(session.user.id).select("name email isBlocked").lean()
    : null;

  const name = String((user as unknown as { name?: string })?.name ?? session?.user?.name ?? "");
  const email = String((user as unknown as { email?: string })?.email ?? session?.user?.email ?? "");
  const isBlocked = Boolean((user as unknown as { isBlocked?: boolean })?.isBlocked);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <AccountSidebar user={{ name, email, isBlocked }} />
          </aside>
          <main className="min-w-0 space-y-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

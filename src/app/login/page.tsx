import { Suspense } from "react";

import LoginClient from "@/app/login/LoginClient";

function LoginFallback() {
  return (
    <div className="min-h-[calc(100vh-0px)] bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-6 space-y-4">
          <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}

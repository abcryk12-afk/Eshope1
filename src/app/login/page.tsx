import { Suspense } from "react";

import LoginClient from "@/app/login/LoginClient";

function LoginFallback() {
  return (
    <div className="min-h-[calc(100vh-0px)] bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="mt-6 space-y-4">
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
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

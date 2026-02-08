"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { confirmPasswordReset } from "firebase/auth";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getFirebaseClientAuth } from "@/lib/firebaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();

  const token = useMemo(() => params.get("token") ?? "", [params]);
  const oobCode = useMemo(() => params.get("oobCode") ?? "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!oobCode && !token) {
      toast.error("Invalid reset link");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      if (oobCode) {
        const auth = getFirebaseClientAuth();
        await confirmPasswordReset(auth, oobCode, password);
      } else {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        const data = (await res.json().catch(() => null)) as unknown;

        function readMessage(v: unknown) {
          if (typeof v !== "object" || v === null) return "";
          const rec = v as Record<string, unknown>;
          return typeof rec.message === "string" ? rec.message : "";
        }

        if (!res.ok) {
          toast.error(readMessage(data) || "Could not reset password");
          return;
        }
      }

      toast.success("Password updated. Please sign in.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground">Set a new password for your account.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm password</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

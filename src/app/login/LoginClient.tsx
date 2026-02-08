"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getFirebaseClientAuth } from "@/lib/firebaseClient";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "email" | "google">(null);

  const establishSession = useCallback(
    async (user: User) => {
      const idToken = await user.getIdToken(true);

      const res = await signIn("credentials", {
        redirect: false,
        idToken,
        callbackUrl,
      });

      if (!res || res.error) {
        console.error("[login] NextAuth firebase provider error", res?.error);
        throw new Error("Could not start session");
      }
    },
    [callbackUrl]
  );

  async function onForgotPassword() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      toast.error("Enter your email first");
      return;
    }

    function readMessage(v: unknown) {
      if (typeof v !== "object" || v === null) return "";
      const rec = v as Record<string, unknown>;
      return typeof rec.message === "string" ? rec.message : "";
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: nextEmail }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as unknown;
        const msg = readMessage(data) || "Could not send reset email";
        toast.error(msg);
        return;
      }

      toast.success("Password reset email sent");
    } catch {
      toast.error("Could not send reset email");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateRedirect() {
      try {
        const auth = getFirebaseClientAuth();
        const res = await getRedirectResult(auth);
        if (!res?.user || cancelled) return;

        await establishSession(res.user);

        toast.success("Welcome back");
        router.push(callbackUrl);
        router.refresh();
      } catch {
        return;
      }
    }

    hydrateRedirect();

    return () => {
      cancelled = true;
    };
  }, [callbackUrl, establishSession, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading("email");

    try {
      const auth = getFirebaseClientAuth();
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      await establishSession(cred.user);

      toast.success("Welcome back");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      console.error("[login] Firebase sign-in error", err);
      if (err instanceof Error && err.message === "Firebase is not configured") {
        try {
          const res = await signIn("credentials", {
            redirect: false,
            email: email.trim(),
            password,
            callbackUrl,
          });

          if (!res || res.error) {
            toast.error("Invalid email or password");
            return;
          }

          toast.success("Welcome back");
          router.push(callbackUrl);
          router.refresh();
          return;
        } catch {
          toast.error("Invalid email or password");
        }
      } else {
        toast.error("Login failed. Check your credentials or try Google sign-in.");
      }
      return;
    } finally {
      setLoading(null);
    }
  }

  async function onProvider(provider: "google") {
    setLoading(provider);

    try {
      const auth = getFirebaseClientAuth();
      const p = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, p);
      await establishSession(cred.user);

      toast.success("Welcome back");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Firebase is not configured") {
        toast.error("Authentication is not configured");
        return;
      }

      const rec = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
      const code = typeof rec.code === "string" ? rec.code : "";
      const message = typeof rec.message === "string" ? rec.message : "";

      if (code.includes("popup") || code.includes("redirect") || code.includes("blocked")) {
        try {
          const auth = getFirebaseClientAuth();
          const p = new GoogleAuthProvider();
          await signInWithRedirect(auth, p);
          return;
        } catch {
          toast.error(code || message || "Could not sign in");
        }
      } else {
        toast.error(code || message || "Could not sign in");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="text-sm text-muted-foreground">
            Use your email and password.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            disabled={loading !== null}
            onClick={() => onProvider("google")}
          >
            {loading === "google" ? "Signing in..." : "Continue with Google"}
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "email" ? "Signing in..." : "Sign in"}
          </Button>

          <button
            type="button"
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={onForgotPassword}
            disabled={loading !== null}
          >
            Forgot password?
          </button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <span>New here?</span>{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

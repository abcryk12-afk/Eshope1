"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type User,
} from "firebase/auth";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getFirebaseClientAuth } from "@/lib/firebaseClient";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<null | "email" | "google" | "facebook">(null);

  const establishSession = useCallback(
    async (user: User) => {
      const idToken = await user.getIdToken(true);

      const res = await signIn("firebase", {
        redirect: false,
        idToken,
        callbackUrl,
      });

      if (!res || res.error) {
        throw new Error("Could not start session");
      }
    },
    [callbackUrl]
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateRedirect() {
      try {
        const auth = getFirebaseClientAuth();
        const res = await getRedirectResult(auth);
        if (!res?.user || cancelled) return;

        await establishSession(res.user);

        toast.success("Welcome");
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
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const nextName = name.trim();
      if (nextName) {
        await updateProfile(cred.user, { displayName: nextName });
      }

      await establishSession(cred.user);

      toast.success("Account created");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Firebase is not configured") {
        toast.error("Authentication is not configured");
        return;
      }

      toast.error("Could not create account");
    } finally {
      setLoading(null);
    }
  }

  async function onProvider(provider: "google" | "facebook") {
    setLoading(provider);

    try {
      const auth = getFirebaseClientAuth();
      const p = provider === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
      const cred = await signInWithPopup(auth, p);
      await establishSession(cred.user);

      toast.success("Welcome");
      router.push(callbackUrl);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Firebase is not configured") {
        toast.error("Authentication is not configured");
        return;
      }

      const rec = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
      const code = typeof rec.code === "string" ? rec.code : "";

      if (code.includes("popup") || code.includes("redirect")) {
        try {
          const auth = getFirebaseClientAuth();
          const p = provider === "google" ? new GoogleAuthProvider() : new FacebookAuthProvider();
          await signInWithRedirect(auth, p);
          return;
        } catch {
          toast.error("Could not sign up");
        }
      } else {
        toast.error("Could not sign up");
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
            Create account
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign up to manage orders and wishlist.
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
            {loading === "google" ? "Signing up..." : "Continue with Google"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full justify-center"
            disabled={loading !== null}
            onClick={() => onProvider("facebook")}
          >
            {loading === "facebook" ? "Signing up..." : "Continue with Facebook"}
          </Button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "email" ? "Creating..." : "Create account"}
          </Button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <span>Already have an account?</span>{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

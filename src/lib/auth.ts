import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { dbConnect } from "@/lib/db";
import { getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import User from "@/models/User";

type AppRole = "user" | "staff" | "admin" | "super_admin";

const ADMIN_ROLES: AppRole[] = ["staff", "admin", "super_admin"];

async function authorizeWithFirebaseIdToken(idToken: string) {
  const auth = getFirebaseAdminAuth();

  let decoded: {
    uid: string;
    email?: string;
    name?: string;
  };

  try {
    const token = await auth.verifyIdToken(idToken);
    decoded = {
      uid: String(token.uid),
      email: typeof token.email === "string" ? token.email : undefined,
      name:
        typeof (token as unknown as { name?: unknown }).name === "string"
          ? String((token as unknown as { name?: unknown }).name)
          : undefined,
    };
  } catch (err: unknown) {
    console.warn("[auth] firebase token verify failed", err);
    return null;
  }

  const email = decoded.email?.trim().toLowerCase() ?? "";
  const uid = decoded.uid.trim();

  if (!uid) return null;

  await dbConnect();

  const existingByUid = await User.findOne({ firebaseUid: uid }).lean();
  const existingByEmail = email ? await User.findOne({ email }).lean() : null;
  const existing = existingByUid ?? existingByEmail;

  if (existing && existing.isBlocked) {
    console.warn("[auth] user blocked (firebase)", { email, uid });
    return null;
  }

  const nameFromToken = decoded.name?.trim() || "";
  const fallbackName = email ? email.split("@")[0] || "User" : "User";
  const safeName = (nameFromToken || fallbackName).slice(0, 80);
  const safeRole = String(existing?.role ?? "user").trim() as AppRole;

  if (existing) {
    if (!existingByUid && uid) {
      await User.updateOne({ _id: existing._id }, { $set: { firebaseUid: uid } }).catch(() => null);
    }

    if (!String(existing.name ?? "").trim() && safeName.length >= 2) {
      await User.updateOne({ _id: existing._id }, { $set: { name: safeName } }).catch(() => null);
    }

    return {
      id: String(existing._id),
      name: String(existing.name ?? safeName),
      email: String(existing.email ?? email),
      role: safeRole,
    };
  }

  if (!email) return null;

  try {
    const created = await User.create({
      name: safeName.length >= 2 ? safeName : "User",
      email,
      firebaseUid: uid,
      role: "user",
    });

    return {
      id: created._id.toString(),
      name: created.name,
      email: created.email,
      role: "user" as AppRole,
    };
  } catch (err: unknown) {
    console.error("[auth] firebase user upsert failed", err);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  jwt: { maxAge: 60 * 60 * 8 },
  providers: [
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "idToken", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken?.trim();

        if (!idToken) return null;

        return authorizeWithFirebaseIdToken(idToken);
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        idToken: { label: "idToken", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        admin: { label: "Admin", type: "text" },
      },
      async authorize(credentials) {
        const idToken = credentials?.idToken?.trim();
        if (idToken) {
          return authorizeWithFirebaseIdToken(idToken);
        }

        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        const adminOnly = credentials?.admin === "true";

        if (!email || !password) {
          console.warn("[auth] credentials missing", { adminOnly });
          return null;
        }

        await dbConnect();

        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user) {
          console.warn("[auth] user not found", { email, adminOnly });
          return null;
        }

        if (user.isBlocked) {
          console.warn("[auth] user blocked", { email, adminOnly });
          return null;
        }

        const role = String(user.role ?? "").trim() as AppRole;

        if (adminOnly && !ADMIN_ROLES.includes(role)) {
          console.warn("[auth] admin login denied (role)", { email, role });
          return null;
        }

        if (!user.passwordHash) {
          console.warn("[auth] password login denied (no password)", { email, adminOnly });
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);

        if (!ok) {
          console.warn("[auth] invalid password", { email, adminOnly });
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      const envBaseUrl = (process.env.NEXTAUTH_URL ?? "").trim();
      const finalBase = envBaseUrl || baseUrl;

      if (!envBaseUrl) {
        console.warn("[auth] NEXTAUTH_URL is missing; falling back to request baseUrl", { baseUrl });
      }
      if (!process.env.NEXTAUTH_SECRET || !String(process.env.NEXTAUTH_SECRET).trim()) {
        console.warn("[auth] NEXTAUTH_SECRET is missing/empty; auth cookies/signing may break");
      }

      // Allow relative callback URLs.
      if (url.startsWith("/")) return `${finalBase}${url}`;

      // Only allow same-origin absolute URLs; otherwise, force to base.
      try {
        const u = new URL(url);
        const b = new URL(finalBase);
        if (u.origin === b.origin) return url;
      } catch {
        // ignore
      }

      return finalBase;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: AppRole }).role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AppRole;
      }

      return session;
    },
  },
};

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { dbConnect } from "@/lib/db";
import User from "@/models/User";

type AppRole = "user" | "staff" | "admin" | "super_admin";

const ADMIN_ROLES: AppRole[] = ["staff", "admin", "super_admin"];

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  jwt: { maxAge: 60 * 60 * 8 },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        admin: { label: "Admin", type: "text" },
      },
      async authorize(credentials) {
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

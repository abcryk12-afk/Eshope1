import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const ADMIN_ROLE_SET = new Set(["staff", "admin", "super_admin"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAccountPage = pathname.startsWith("/account");
  const isMyOrdersPage = pathname.startsWith("/my-orders");

  if (!isAdminPage && !isAdminApi && !isAccountPage && !isMyOrdersPage) {
    return NextResponse.next();
  }

  if (isAdminPage && pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (isAdminApi) {
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!ADMIN_ROLE_SET.has(String(token.role ?? ""))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  }

  if (isAdminPage) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (!ADMIN_ROLE_SET.has(String(token.role ?? ""))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", "/");
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (isAccountPage || isMyOrdersPage) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/my-orders/:path*", "/api/admin/:path*"],
};

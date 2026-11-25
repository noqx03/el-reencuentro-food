import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const role = req.nextauth.token?.role;

    if (
      pathname.startsWith("/admin") &&
      role !== "ADMIN" &&
      role !== "SUPERADMIN"
    ) {
      return NextResponse.redirect(new URL("/pos", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token?.id),
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/pos/:path*", "/caja/:path*", "/pedidos/:path*", "/admin/:path*"],
};

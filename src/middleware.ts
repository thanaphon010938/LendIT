import { withAuth, type NextRequestWithAuth } from "next-auth/middleware";
import { NextResponse, type NextFetchEvent } from "next/server";

const authMiddleware = withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export default function middleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  // Dev-only: let scripts/dev.mjs reach pages so they compile ahead of time.
  // Only for requests without a session, so the (main) layout redirects them and no data is rendered.
  const hasSession = req.cookies.getAll().some((cookie) => cookie.name.includes("session-token"));
  if (process.env.NODE_ENV === "development" && req.headers.get("x-dev-warmup") === "1" && !hasSession) {
    return NextResponse.next();
  }
  return authMiddleware(req, event);
}

export const config = {
  matcher: ["/", "/equipment/:path*", "/loans/:path*", "/admin/:path*", "/profile/:path*", "/print/:path*"],
};

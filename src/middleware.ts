import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/session";

// Refreshes/validates Wesh Star IA's own signed session cookie on protected
// routes (Edge runtime — Web Crypto only, no Postgres connection here).
// Actual role/permission checks still happen server-side in each route via
// getAccess(); this only establishes whether a session is present.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  // Persist the browser language on first visit (worldwide auto-localization)
  if (!request.cookies.get("lang")) {
    const code = (request.headers.get("accept-language") || "").split(",")[0]
      ?.trim().split(";")[0].split("-")[0].toLowerCase();
    if (code && /^[a-z]{2}$/.test(code)) {
      response.cookies.set("lang", code, { path: "/", maxAge: 31536000 });
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*", "/admin/:path*", "/moderator/:path*", "/generate/:path*",
    "/videos/:path*", "/settings/:path*"
  ]
};

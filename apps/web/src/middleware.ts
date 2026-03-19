import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function generateRequestId(): string {
  // Use Web Crypto API for Edge Runtime compatibility
  const array = new Uint32Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => x.toString(16).padStart(8, "0")).join("-");
}

function setSecurityHeaders(res: NextResponse) {
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-XSS-Protection", "0");
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https:",
    "font-src 'self' data:",
    "frame-ancestors 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy-Report-Only", csp);
  return res;
}

/**
 * Phase 7A: Lightweight route protection
 * 
 * Blocks CLIENT users from planner routes and planners from client routes.
 * Full auth checks are still done at page level, but this provides defense in depth.
 */
export default async function middleware(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? generateRequestId();
  const pathname = req.nextUrl.pathname;
  
  // Get token to check user role (lightweight - doesn't require DB)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const userRole = token?.role as string | undefined;
  
  // Phase 7A: Block CLIENT users from planner routes
  if (userRole === "CLIENT") {
    // Block access to planner namespaces
    if (
      pathname.startsWith("/pro/planner") ||
      pathname.startsWith("/diy-planner") ||
      pathname.startsWith("/app/vault")
    ) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }
  
  // Phase 7A: Block planners from client portal routes (unless explicitly allowed)
  if (userRole === "PRO_PLANNER" || userRole === "DIY_PLANNER") {
    // Planners should not access client portal routes
    // (They can access via their own vault routes)
    if (pathname.startsWith("/client/events") && !pathname.includes("/admin")) {
      // Allow if it's an admin view, otherwise redirect
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }
  
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  setSecurityHeaders(res);
  
  return res;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/pro/planner/:path*",
    "/diy-planner/:path*",
    "/client/:path*",
  ],
};

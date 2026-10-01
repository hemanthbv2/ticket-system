import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isQueue = pathname.startsWith("/queue");
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if (isQueue || isDashboard || isAdmin) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
    });

    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (token.role as string) || "requester";

    // 1. Requesters MUST get 403 on /queue, /dashboard, and /admin
    if (role === "requester") {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0b0f19;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:2rem;background:rgba(255,255,255,0.05);border-radius:1rem;border:1px solid rgba(255,255,255,0.1);max-width:400px;">
    <h1 style="color:#ef4444;margin:0 0 1rem 0;font-size:2rem;">403 Forbidden</h1>
    <p style="color:#94a3b8;font-size:0.95rem;margin:0 0 1.5rem 0;">Requesters are not permitted to access this area.</p>
    <a href="/tickets" style="background:#6366f1;color:#fff;padding:0.6rem 1.2rem;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.875rem;">Return to My Tickets</a>
  </div>
</body>
</html>`,
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // 2. Only admin can access /admin
    if (isAdmin && role !== "admin") {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0b0f19;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:2rem;background:rgba(255,255,255,0.05);border-radius:1rem;border:1px solid rgba(255,255,255,0.1);max-width:400px;">
    <h1 style="color:#ef4444;margin:0 0 1rem 0;font-size:2rem;">403 Forbidden</h1>
    <p style="color:#94a3b8;font-size:0.95rem;margin:0 0 1.5rem 0;">Administrative privileges are required to access this area.</p>
    <a href="/tickets" style="background:#6366f1;color:#fff;padding:0.6rem 1.2rem;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.875rem;">Return to My Tickets</a>
  </div>
</body>
</html>`,
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // 3. Only media_head and admin can access /dashboard
    if (isDashboard && role !== "media_head" && role !== "admin") {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>403 Forbidden</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#0b0f19;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:2rem;background:rgba(255,255,255,0.05);border-radius:1rem;border:1px solid rgba(255,255,255,0.1);max-width:400px;">
    <h1 style="color:#ef4444;margin:0 0 1rem 0;font-size:2rem;">403 Forbidden</h1>
    <p style="color:#94a3b8;font-size:0.95rem;margin:0 0 1.5rem 0;">Media Head or Admin privileges are required to access this area.</p>
    <a href="/tickets" style="background:#6366f1;color:#fff;padding:0.6rem 1.2rem;border-radius:0.5rem;text-decoration:none;font-weight:600;font-size:0.875rem;">Return to My Tickets</a>
  </div>
</body>
</html>`,
        {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/queue/:path*", "/dashboard/:path*", "/admin/:path*"],
};

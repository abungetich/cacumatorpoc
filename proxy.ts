import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { evaluateRouteGuard } from "@/lib/route-guards";

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const publicAssetOrSystemPath =
    pathname.startsWith("/_next") || pathname === "/favicon.ico";

  try {
    if (pathname.startsWith("/api/auth") || publicAssetOrSystemPath) {
      return NextResponse.next();
    }

    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-auth-secret-change-me",
    });

    const decision = evaluateRouteGuard({
      pathname,
      isLoggedIn: Boolean(token),
      isPending: token?.status === "pending",
      isOnboarding: token?.status === "onboarding",
      role: typeof token?.role === "string" ? token.role : undefined,
    });

    if (decision.type === "json") {
      return NextResponse.json({ message: decision.message }, { status: decision.status });
    }

    if (decision.type === "redirect") {
      return NextResponse.redirect(new URL(decision.destination, req.url));
    }

    return NextResponse.next();
  } catch {
    const isProtectedApi = pathname.startsWith("/api/protected");
    if (isProtectedApi) {
      return NextResponse.json({ message: "Invalid or expired session. Please log in again." }, { status: 401 });
    }

    const fallbackDecision = evaluateRouteGuard({
      pathname,
      isLoggedIn: false,
      isPending: false,
      isOnboarding: false,
      role: undefined,
    });

    if (fallbackDecision.type === "redirect") {
      return NextResponse.redirect(new URL(fallbackDecision.destination, req.url));
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

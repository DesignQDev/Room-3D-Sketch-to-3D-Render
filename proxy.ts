import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/new", "/render", "/account", "/consent"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isProtected &&
    req.auth &&
    !(req.auth.user as { consented?: boolean } | undefined)?.consented &&
    pathname !== "/consent"
  ) {
    const consentUrl = new URL("/consent", req.nextUrl.origin);
    consentUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(consentUrl);
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new/:path*",
    "/render/:path*",
    "/account/:path*",
    "/consent",
    "/consent/:path*",
  ],
};

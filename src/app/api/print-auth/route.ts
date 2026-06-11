import { NextRequest, NextResponse } from "next/server";
import { getPrintExportToken, PRINT_AUTH_COOKIE } from "@/lib/print/auth";

export const dynamic = "force-dynamic";

/**
 * One-time browser bootstrap for the print routes:
 * GET /api/print-auth?token=<PRINT_EXPORT_TOKEN> sets the HTTP-only auth
 * cookie and redirects to the app, after which the UI's same-origin
 * fetches to /api/generate-print pass the gate automatically.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const expected = getPrintExportToken();
  if (!expected) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const candidate = request.nextUrl.searchParams.get("token")?.trim() || "";
  if (candidate !== expected) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(PRINT_AUTH_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

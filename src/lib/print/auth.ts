import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Shared-secret gate for the print render/upload routes (ported from
 * f1app's lib/print-auth.js).
 *
 * These routes burn headless-Chromium time and write into the shared
 * Google Drive tree that the prints-orchestrator ingests as catalog
 * designs — they must not stay publicly callable.
 *
 * Auth, in order of precedence:
 *   1. `Authorization: Bearer <PRINT_EXPORT_TOKEN>` — machine callers.
 *   2. The `tennis_print_token` HTTP-only cookie — set once per browser by
 *      visiting /api/print-auth?token=<PRINT_EXPORT_TOKEN>; the UI's
 *      same-origin fetches then pass automatically.
 *
 * Enforcement is opt-in: while PRINT_EXPORT_TOKEN is unset the gate allows
 * everything, so deploying before setting the env var cannot brick the UI.
 */

export const PRINT_AUTH_COOKIE = "tennis_print_token";

export function getPrintExportToken(): string | null {
  const token = process.env.PRINT_EXPORT_TOKEN?.trim();
  return token || null;
}

function safeEqual(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isAuthorizedPrintRequest(request: NextRequest): boolean {
  const token = getPrintExportToken();
  if (!token) return true;

  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (bearer && safeEqual(bearer, token)) return true;

  const cookie = request.cookies.get(PRINT_AUTH_COOKIE)?.value?.trim() || "";
  return Boolean(cookie && safeEqual(cookie, token));
}

export const UNAUTHORIZED_PRINT_BODY = {
  error: "Unauthorized",
  message:
    "Print generation requires authorization. Open /api/print-auth?token=… once in this browser, or send a Bearer token.",
};

import "server-only";
import { NextResponse } from "next/server";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(code: string, status: number, extra: Record<string, unknown> = {}): NextResponse {
  return json({ error: code, ...extra }, status);
}

/**
 * Defence in depth against cross-site requests: state-changing API calls must be same-origin
 * JSON. (Browsers cannot send a cross-site JSON POST without a CORS preflight, which we never
 * approve, but checking the Origin header costs nothing.)
 */
export function isSameOriginJson(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return false;
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readJson(request: Request, maxBytes = 64_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("payload_too_large");
  return JSON.parse(text);
}

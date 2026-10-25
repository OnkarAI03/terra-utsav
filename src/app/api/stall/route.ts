import { createHash, timingSafeEqual } from "node:crypto";
import { fail, isSameOriginJson, json, readJson } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Checks the team PIN that turns the team's own laptops and phone into stall devices (see
 * src/lib/game/prize.ts). The PIN lives only in the STALL_PIN environment variable (Netlify:
 * Site configuration > Environment variables), never in this public repository. Without it,
 * stall mode cannot be turned on.
 */

const WRONG_DELAY_MS = 1_000;
const WINDOW_MS = 10 * 60_000;
const MAX_WRONG = 20;

// Wrong tries per address. Per server instance only, so it slows a script down rather than
// stopping it outright; the PIN's length does the rest.
const wrongTries = new Map<string, number[]>();

function clientAddress(request: Request): string {
  return request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function recentWrongTries(address: string, now: number): number[] {
  return (wrongTries.get(address) ?? []).filter((t) => now - t < WINDOW_MS);
}

function samePin(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isSameOriginJson(request)) return fail("bad_request", 400);
  const expected = process.env.STALL_PIN?.trim();
  if (!expected) return fail("not_set", 503);

  const address = clientAddress(request);
  const now = Date.now();
  const recent = recentWrongTries(address, now);
  if (recent.length >= MAX_WRONG) return fail("rate_limited", 429);

  let pin: unknown;
  try {
    pin = ((await readJson(request, 1_000)) as { pin?: unknown } | null)?.pin;
  } catch {
    return fail("bad_request", 400);
  }
  if (typeof pin !== "string" || pin.trim() === "" || pin.length > 64) return fail("bad_request", 400);

  if (samePin(pin.trim(), expected)) return json({ ok: true });

  if (wrongTries.size > 5_000) wrongTries.clear();
  wrongTries.set(address, [...recent, now]);
  await new Promise((resolve) => setTimeout(resolve, WRONG_DELAY_MS));
  return fail("wrong_pin", 401);
}

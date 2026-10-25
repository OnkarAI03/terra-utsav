import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/stall/route";

const PIN = "468024";

/** A same-origin JSON request from one address (the route counts wrong tries per address). */
const pinRequest = (body: unknown, { address = "203.0.113.1", origin = "http://localhost:3000" } = {}) =>
  new Request("http://localhost:3000/api/stall", {
    method: "POST",
    headers: { "content-type": "application/json", origin, host: "localhost:3000", "x-nf-client-connection-ip": address },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

/** Wrong PINs are answered after a delay; fake timers skip it. */
async function send(request: Request) {
  const pending = POST(request);
  await vi.advanceTimersByTimeAsync(1_000);
  return pending;
}

describe("the stall PIN check", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("STALL_PIN", PIN);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("accepts the team PIN and nothing else", async () => {
    const right = await send(pinRequest({ pin: PIN }, { address: "198.51.100.1" }));
    expect(right.status).toBe(200);
    expect(await right.json()).toEqual({ ok: true });
    expect(right.headers.get("cache-control")).toBe("no-store");
    expect((await send(pinRequest({ pin: ` ${PIN} ` }, { address: "198.51.100.1" }))).status).toBe(200);

    const wrong = await send(pinRequest({ pin: "468025" }, { address: "198.51.100.1" }));
    expect(wrong.status).toBe(401);
    expect(JSON.stringify(await wrong.json())).not.toContain(PIN);
  });

  it("keeps stall mode off when no PIN is set on the server", async () => {
    vi.stubEnv("STALL_PIN", "");
    expect((await send(pinRequest({ pin: PIN }, { address: "198.51.100.2" }))).status).toBe(503);
    expect((await send(pinRequest({ pin: "" }, { address: "198.51.100.2" }))).status).toBe(503);
  });

  it("refuses cross-site and malformed requests", async () => {
    expect((await send(pinRequest({ pin: PIN }, { address: "198.51.100.3", origin: "https://evil.example" }))).status).toBe(400);
    for (const body of ["{not json", {}, { pin: 468024 }, { pin: "   " }, { pin: "1".repeat(65) }]) {
      expect((await send(pinRequest(body, { address: "198.51.100.3" }))).status).toBe(400);
    }
  });

  it("stops answering an address after 20 wrong tries", async () => {
    const address = "198.51.100.4";
    for (let i = 0; i < 20; i++) expect((await send(pinRequest({ pin: String(100000 + i) }, { address }))).status).toBe(401);
    expect((await send(pinRequest({ pin: PIN }, { address }))).status).toBe(429);
    // Other addresses are unaffected, and the block lifts after ten minutes.
    expect((await send(pinRequest({ pin: PIN }, { address: "198.51.100.5" }))).status).toBe(200);
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect((await send(pinRequest({ pin: PIN }, { address }))).status).toBe(200);
  });
});

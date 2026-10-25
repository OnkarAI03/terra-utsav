/**
 * Prize play without the database. When Supabase is not configured, the phone keeps its own
 * record: how many prize attempts it has used and, once it wins, a winner card. At the stall a
 * team member checks the card live (its clock ticks, so a screenshot shows a frozen time), gives
 * the prize and taps "Prize given", which this phone then remembers. With Supabase configured the
 * server-checked coupon flow applies instead and none of this is used.
 */

export interface LocalWin {
  code: string;
  wonAt: string;
  claimedAt: string | null;
}

export interface LocalPrize {
  attemptsUsed: number;
  win: LocalWin | null;
}

const KEY = "tu-prize-v1";
const EMPTY: LocalPrize = { attemptsUsed: 0, win: null };

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** This phone's record. Anything missing or unreadable counts as a fresh start. */
export function readLocalPrize(): LocalPrize {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as Partial<LocalPrize> | null;
    const attemptsUsed = typeof v?.attemptsUsed === "number" && Number.isInteger(v.attemptsUsed) && v.attemptsUsed >= 0 ? v.attemptsUsed : 0;
    const w = v?.win;
    const win =
      w && typeof w.code === "string" && typeof w.wonAt === "string"
        ? { code: w.code, wonAt: w.wonAt, claimedAt: typeof w.claimedAt === "string" ? w.claimedAt : null }
        : null;
    return { attemptsUsed, win };
  } catch {
    return EMPTY;
  }
}

export function writeLocalPrize(prize: LocalPrize): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(prize));
  } catch {
    /* storage unavailable: the game still plays, the record just isn't kept */
  }
}

// No 0/O or 1/I, so the code reads out loud and copies down without mistakes.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomIndexes(n: number): number[] {
  const c = typeof globalThis.crypto?.getRandomValues === "function" ? globalThis.crypto : null;
  if (c) return Array.from(c.getRandomValues(new Uint32Array(n)), (x) => x % ALPHABET.length);
  return Array.from({ length: n }, () => Math.floor(Math.random() * ALPHABET.length));
}

/** A short winner code the team can read or note down, e.g. "MINI-7K4Q". */
export function winnerCode(indexes: number[] = randomIndexes(4)): string {
  return `MINI-${indexes.map((i) => ALPHABET[i % ALPHABET.length]).join("")}`;
}

/** Prize play stays open until the event ends; winners collect their prize at the stall on the day. */
export function localPrizeOpen(endsAt: string | null | undefined, now = Date.now()): boolean {
  const ends = endsAt ? Date.parse(endsAt) : Number.NaN;
  return Number.isNaN(ends) || now <= ends;
}

/** Records a win once; a second win on the same phone keeps the first card. */
export function recordLocalWin(now = new Date()): LocalPrize {
  const cur = readLocalPrize();
  const next = cur.win ? cur : { ...cur, win: { code: winnerCode(), wonAt: now.toISOString(), claimedAt: null } };
  writeLocalPrize(next);
  return next;
}

/** The team member has handed over the prize. */
export function markLocalPrizeGiven(now = new Date()): LocalPrize {
  const cur = readLocalPrize();
  if (!cur.win || cur.win.claimedAt) return cur;
  const next = { ...cur, win: { ...cur.win, claimedAt: now.toISOString() } };
  writeLocalPrize(next);
  return next;
}

/** Counts an attempt when its first level starts, so backing out before playing costs nothing. */
export function spendLocalAttempt(): LocalPrize {
  const cur = readLocalPrize();
  const next = { ...cur, attemptsUsed: cur.attemptsUsed + 1 };
  writeLocalPrize(next);
  return next;
}

// ---------------------------------------------------------------- stall devices
// The team's own laptops and phone at the stall are shared by many players. A team member opens
// /game?stall=1 and enters the team PIN, which the server checks against STALL_PIN (set in Netlify,
// never in this public code). The device then keeps only a salted hash of the PIN, so "Next player"
// can ask for it again without the network, plus a tally of the prizes handed out on it.
// ?stall=0 turns stall mode off again.

const STALL_KEY = "tu-stall-v1";
const LOG_KEY = "tu-stall-log-v1";

export interface StallWin {
  code: string;
  wonAt: string;
  givenAt: string | null;
}

/** "on": a stall device. "ask": the address has ?stall=1 but no PIN has been entered here yet. */
export type StallState = "on" | "ask" | "off";

export type StallUnlock = "ok" | "wrong" | "busy" | "not-set" | "offline";

interface StallLock {
  salt: string;
  hash: string;
}

function readLock(): StallLock | null {
  try {
    const v = JSON.parse(storage()?.getItem(STALL_KEY) ?? "null") as Partial<StallLock> | null;
    return typeof v?.salt === "string" && typeof v.hash === "string" ? { salt: v.salt, hash: v.hash } : null;
  } catch {
    return null;
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function pinHash(salt: string, pin: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin.trim()}`));
  return toHex(new Uint8Array(digest));
}

/** Whether this is a stall device, reading ?stall=1 (asks for the PIN) and ?stall=0 (turns it off). */
export function readStallState(search: string = typeof window === "undefined" ? "" : window.location.search): StallState {
  const q = new URLSearchParams(search).get("stall");
  if (q === "0") {
    try {
      storage()?.removeItem(STALL_KEY);
    } catch {
      /* nothing stored */
    }
  }
  if (readLock()) return "on";
  return q === "1" ? "ask" : "off";
}

/** Makes this a stall device once the server accepts the team PIN. */
export async function unlockStall(pin: string): Promise<StallUnlock> {
  let res: Response;
  try {
    res = await fetch("/api/stall", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
  } catch {
    return "offline";
  }
  if (res.status === 401) return "wrong";
  if (res.status === 429) return "busy";
  if (res.status === 503) return "not-set";
  if (!res.ok) return "offline";
  try {
    const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
    storage()?.setItem(STALL_KEY, JSON.stringify({ salt, hash: await pinHash(salt, pin) }));
    return "ok";
  } catch {
    return "offline";
  }
}

/** Checks the team PIN on a stall device, without the network. */
export async function stallPinMatches(pin: string): Promise<boolean> {
  const lock = readLock();
  if (!lock) return false;
  try {
    return (await pinHash(lock.salt, pin)) === lock.hash;
  } catch {
    return false;
  }
}

/** Every win on this stall device so far, oldest first. */
export function readStallLog(): StallWin[] {
  try {
    const v = JSON.parse(storage()?.getItem(LOG_KEY) ?? "[]") as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((w): w is StallWin => typeof w?.code === "string" && typeof w?.wonAt === "string" && (w.givenAt === null || typeof w.givenAt === "string"));
  } catch {
    return [];
  }
}

/** Next player on a stall device: files the last player's win (if any) in the tally and starts afresh. */
export function nextPlayer(): LocalPrize {
  const cur = readLocalPrize();
  if (cur.win) {
    const log = [...readStallLog(), { code: cur.win.code, wonAt: cur.win.wonAt, givenAt: cur.win.claimedAt }];
    try {
      storage()?.setItem(LOG_KEY, JSON.stringify(log));
    } catch {
      /* the tally is a convenience; the next player can still play */
    }
  }
  writeLocalPrize(EMPTY);
  return EMPTY;
}

/** Prizes handed out on this device: the tally plus the current player's, once given. */
export function prizesGiven(log: StallWin[], current: LocalPrize | null): number {
  return log.filter((w) => w.givenAt !== null).length + (current?.win?.claimedAt ? 1 : 0);
}

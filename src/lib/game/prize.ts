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

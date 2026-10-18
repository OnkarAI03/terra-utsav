"use server";

import { z } from "zod";
import { AuthError, requireRole } from "@/lib/auth";

export type CouponCheck = {
  status: "valid" | "redeemed" | "expired" | "void" | "invalid" | "rate_limited" | "error";
  redeemed?: boolean;
  code?: string;
  label?: string;
  valueText?: string | null;
  issuedAt?: string;
  expiresAt?: string | null;
  lastRedeemedAt?: string | null;
  redeemedAt?: string | null;
  redemptionsLeft?: number;
  holder?: string | null;
  message?: string;
};

const codeSchema = z.string().trim().min(4).max(40);

function authMessage(e: unknown): CouponCheck {
  if (e instanceof AuthError) {
    return { status: "error", message: e.code === "forbidden" ? "This account does not have staff access." : "Please sign in again." };
  }
  return { status: "error", message: "Something went wrong. Try again." };
}

/** Check a coupon. The database function verifies the caller is staff before answering. */
export async function lookupCoupon(raw: string): Promise<CouponCheck> {
  const parsed = codeSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid" };
  try {
    const { supabase } = await requireRole("staff");
    const { data, error } = await supabase.rpc("coupon_lookup", { p_code: parsed.data });
    if (error) return { status: "error", message: "Could not check that coupon." };
    return data as CouponCheck;
  } catch (e) {
    return authMessage(e);
  }
}

/** Redeem a coupon atomically. A second press, or a second phone, cannot redeem it twice. */
export async function redeemCoupon(raw: string, note?: string): Promise<CouponCheck> {
  const parsed = codeSchema.safeParse(raw);
  if (!parsed.success) return { status: "invalid" };
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 200) || null : null;
  try {
    const { supabase } = await requireRole("staff");
    const { data, error } = await supabase.rpc("coupon_redeem", { p_code: parsed.data, p_note: cleanNote });
    if (error) return { status: "error", message: "Could not redeem that coupon." };
    return data as CouponCheck;
  } catch (e) {
    return authMessage(e);
  }
}

export async function recentRedemptions(): Promise<{ code: string; label: string; redeemedAt: string }[]> {
  try {
    const { supabase } = await requireRole("staff");
    const { data } = await supabase.rpc("staff_recent_redemptions", { p_limit: 10 });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const challengeSchema = z.object({
  participant: z.string().trim().max(40).optional().transform((v) => (v ? v : null)),
  // The attempt is 60 seconds; "completed" means the full 60.
  seconds: z.coerce.number().int().min(0).max(60),
  completed: z.boolean(),
}).refine((v) => !v.completed || v.seconds === 60, { message: "A completed attempt is the full 60 seconds." });

export type ChallengeState = { ok: boolean; message: string } | null;

/** Record a wet-brick result. Only staff can, and only under their own name (enforced by RLS). */
export async function recordChallenge(_prev: ChallengeState, formData: FormData): Promise<ChallengeState> {
  const parsed = challengeSchema.safeParse({
    participant: formData.get("participant") ?? undefined,
    seconds: formData.get("seconds"),
    completed: formData.get("completed") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Enter the seconds held (0 to 60)." };
  try {
    const { supabase, user } = await requireRole("staff");
    const { error } = await supabase.from("challenge_results").insert({
      participant_label: parsed.data.participant,
      held_seconds: parsed.data.seconds,
      completed: parsed.data.completed,
      recorded_by: user.id,
    });
    if (error) return { ok: false, message: "Could not save that result." };
    const who = parsed.data.participant ? `${parsed.data.participant}: ` : "";
    return { ok: true, message: `Saved. ${who}${parsed.data.seconds} s, ${parsed.data.completed ? "completed" : "not completed"}.` };
  } catch (e) {
    return { ok: false, message: authMessage(e).message ?? "Not allowed." };
  }
}

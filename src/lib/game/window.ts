import type { EventSettings, RewardSettings } from "@/lib/settings";

/**
 * Where reward play stands right now. Players never sign up; coupons can be won on event
 * day only, between the event's start and end (admin > Event), and only once the organisers have
 * switched coupons on and confirmed the terms (admin > Rewards). The database applies the same
 * rules in game_start_attempt; this copy only decides what the game screen says.
 *
 * - "before": the event has not started
 * - "open": reward play is on
 * - "paused": during the event, but coupons are switched off or not confirmed
 * - "after": the event is over
 */
export type RewardPhase = "before" | "open" | "paused" | "after";

export function rewardPhase(
  event: Pick<EventSettings, "startsAt" | "endsAt">,
  rewards: Pick<RewardSettings, "rewardsEnabled" | "confirmed">,
  options: { earlyAccess?: boolean; now?: number } = {},
): RewardPhase {
  const now = options.now ?? Date.now();
  // Staff and admins may play early to test the flow, as the database allows.
  if (!options.earlyAccess) {
    const starts = event.startsAt ? Date.parse(event.startsAt) : Number.NaN;
    const ends = event.endsAt ? Date.parse(event.endsAt) : Number.NaN;
    if (!Number.isNaN(starts) && now < starts) return "before";
    if (!Number.isNaN(ends) && now > ends) return "after";
  }
  return rewards.rewardsEnabled && rewards.confirmed ? "open" : "paused";
}

/** "Tuesday, 27 October 2026, 9 am to 3 pm", for "coupons can be won on event day only". */
export function eventDayText(event: Pick<EventSettings, "dateText" | "timeText">): string | null {
  return [event.dateText, event.timeText].filter(Boolean).join(", ") || null;
}

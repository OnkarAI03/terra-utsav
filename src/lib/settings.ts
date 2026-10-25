import { z } from "zod";

/**
 * Event and reward settings. Stored as JSON in public.site_settings and edited from /admin.
 * Unknown real-world facts default to null and are shown on the site as "to be announced".
 * Nothing here may be invented: dates, places, prices and coupon values come from organisers.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https:\/\//.test(v), "Use a full https:// link");

const optionalIsoDate = z
  .string()
  .trim()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "Use a valid date and time");

export const eventSettingsSchema = z.object({
  festivalName: optionalText(80),
  dateText: optionalText(80),
  timeText: optionalText(80),
  startsAt: optionalIsoDate,
  endsAt: optionalIsoDate,
  venue: optionalText(120),
  stallLocation: optionalText(160),
  mapUrl: optionalUrl,
  instagramUrl: optionalUrl,
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Use a valid email address"),
  confirmed: z.boolean(),
});

export const rewardSettingsSchema = z.object({
  rewardsEnabled: z.boolean(),
  couponLabel: z.string().trim().min(1).max(80),
  couponValueText: optionalText(120),
  maxRedemptions: z.number().int().min(1).max(10),
  expiresAfterHours: z.number().int().min(1).max(24 * 60).nullable(),
  expiresAt: optionalIsoDate,
  maxCouponsTotal: z.number().int().min(0).max(100_000).nullable(),
  confirmed: z.boolean(),
  redemptionInstructions: z.string().trim().min(1).max(400),
});

export type EventSettings = z.infer<typeof eventSettingsSchema>;
export type RewardSettings = z.infer<typeof rewardSettingsSchema>;

/**
 * Dates in admin forms are picked as India time with <input type="datetime-local"> ("2026-10-27T15:00")
 * and stored as ISO with +05:30, so Postgres and every browser read the same moment.
 */
export function fromIstInput(value: string | null): string | null | "invalid" {
  if (!value) return null;
  const m = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) return "invalid";
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`;
  return Number.isNaN(Date.parse(iso)) ? "invalid" : iso;
}

/** The value for a datetime-local input, in India time, from a stored ISO date. */
export function toIstInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

export const VENUE_ADDRESS ="S. B. Patil Institute of Management, Pradhikaran Road, Haveli, Maharashtra 411044";

export const INSTAGRAM_URL = "https://www.instagram.com/pcet_terra_utsav";

// Event name, date, timings, venue and Instagram supplied by the team on 2026-10-18. The exact stall
// spot inside the campus is still to come.
export const DEFAULT_EVENT: EventSettings = {
  festivalName: "Eco-friendly Diwali Mandi 2026",
  dateText: "Tuesday, 27 October 2026",
  timeText: "9 am to 3 pm",
  startsAt: "2026-10-27T09:00:00+05:30",
  endsAt: "2026-10-27T15:00:00+05:30",
  venue: VENUE_ADDRESS,
  stallLocation: null,
  mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(VENUE_ADDRESS)}`,
  instagramUrl: INSTAGRAM_URL,
  contactEmail: null,
  confirmed: true,
};

export const DEFAULT_REWARDS: RewardSettings = {
  rewardsEnabled: true,
  couponLabel: "TERRA UTSAV winner's coupon",
  // No discount: since 2026-10-25 winners simply collect a prize from the team (the 50% off a
  // Chocolate Bomb supplied on 2026-10-18 was dropped at the team's request).
  couponValueText: null,
  maxRedemptions: 1,
  expiresAfterHours: null,
  expiresAt: null,
  maxCouponsTotal: null,
  confirmed: false,
  redemptionInstructions:
    "Show this coupon at the TERRA UTSAV stall. A team member will scan or type the code and redeem it for you.",
};

export function parseEventSettings(input: unknown): EventSettings {
  const parsed = eventSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_EVENT;
}

export function parseRewardSettings(input: unknown): RewardSettings {
  const parsed = rewardSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_REWARDS;
}

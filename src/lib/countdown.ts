/** Where the event stands at a moment in time, for the live countdown. */
export type EventPhase =
  | { phase: "before"; days: number; hours: number; minutes: number; seconds: number }
  | { phase: "open"; leftMinutes: number }
  | { phase: "over" };

/** Without an end time the event is taken to last 8 hours. Null when the start is unknown. */
export function eventPhase(startsAt: string | null | undefined, endsAt: string | null | undefined, now: number): EventPhase | null {
  const start = startsAt ? Date.parse(startsAt) : Number.NaN;
  if (Number.isNaN(start)) return null;
  const parsedEnd = endsAt ? Date.parse(endsAt) : Number.NaN;
  const end = Number.isNaN(parsedEnd) || parsedEnd <= start ? start + 8 * 3_600_000 : parsedEnd;
  if (now < start) {
    const total = Math.ceil((start - now) / 1000);
    return {
      phase: "before",
      days: Math.floor(total / 86_400),
      hours: Math.floor((total % 86_400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  }
  if (now < end) return { phase: "open", leftMinutes: Math.ceil((end - now) / 60_000) };
  return { phase: "over" };
}

const clock = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

/** "3 pm" or "3:30 pm", in India time. */
export function shortTime(iso: string): string {
  const parts = clock.formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const period = (parts.find((p) => p.type === "dayPeriod")?.value ?? "").toLowerCase().replace(/\./g, "");
  return `${hour}${minute === "00" ? "" : `:${minute}`} ${period}`.trim();
}

/** "2h 14m" or "45m". */
export function minutesText(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

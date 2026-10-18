import { describe, expect, it } from "vitest";
import { eventDayText, rewardPhase } from "@/lib/game/window";
import { DEFAULT_EVENT } from "@/lib/settings";

const event = { startsAt: "2026-10-27T09:00:00+05:30", endsAt: "2026-10-27T15:00:00+05:30" };
const on = { rewardsEnabled: true, confirmed: true };
const at = (iso: string) => ({ now: Date.parse(iso) });

describe("reward play opens on event day only", () => {
  it("is closed before the event, open during it and over after it", () => {
    expect(rewardPhase(event, on, at("2026-10-18T12:00:00+05:30"))).toBe("before");
    expect(rewardPhase(event, on, at("2026-10-27T08:59:00+05:30"))).toBe("before");
    expect(rewardPhase(event, on, at("2026-10-27T09:00:00+05:30"))).toBe("open");
    expect(rewardPhase(event, on, at("2026-10-27T14:59:00+05:30"))).toBe("open");
    expect(rewardPhase(event, on, at("2026-10-27T15:01:00+05:30"))).toBe("after");
  });

  it("stays paused during the event until coupons are switched on and confirmed", () => {
    const day = at("2026-10-27T11:00:00+05:30");
    expect(rewardPhase(event, { rewardsEnabled: true, confirmed: false }, day)).toBe("paused");
    expect(rewardPhase(event, { rewardsEnabled: false, confirmed: true }, day)).toBe("paused");
  });

  it("lets staff and admins in early to test, like the database does", () => {
    expect(rewardPhase(event, on, { earlyAccess: true, ...at("2026-10-18T12:00:00+05:30") })).toBe("open");
    expect(rewardPhase(event, { rewardsEnabled: true, confirmed: false }, { earlyAccess: true, ...at("2026-10-18T12:00:00+05:30") })).toBe("paused");
  });

  it("leaves a side of the window open when its date is missing or unreadable", () => {
    expect(rewardPhase({ startsAt: null, endsAt: null }, on, at("2026-10-18T12:00:00+05:30"))).toBe("open");
    expect(rewardPhase({ startsAt: "not a date", endsAt: event.endsAt }, on, at("2026-10-18T12:00:00+05:30"))).toBe("open");
  });

  it("says when coupons can be won, from the event settings", () => {
    expect(eventDayText(DEFAULT_EVENT)).toBe("Tuesday, 27 October 2026, 9 am to 3 pm");
    expect(eventDayText({ dateText: null, timeText: null })).toBeNull();
  });
});

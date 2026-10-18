import "server-only";
import { CHALLENGE } from "@/content/challenge";
import { getEventSettings, getGameSettings, getProducts, getRewardSettings, getTeam } from "@/lib/data/public";
import { AVAILABILITY_LABEL, formatPrice } from "@/lib/format";
import type { KoochuFacts } from "./answer";

/**
 * Everything Koochu Puchu may say, taken from the same sources the pages use, so the chat always
 * agrees with the site (and picks up admin edits). Nothing here is written for the bot alone.
 */
export async function loadKoochuFacts(): Promise<KoochuFacts> {
  const [event, rewards, game, products, team] = await Promise.all([getEventSettings(), getRewardSettings(), getGameSettings(), getProducts(), getTeam()]);
  const groupName = new Map(team.groups.map((g) => [g.id, g.name]));

  return {
    event: {
      festivalName: event.festivalName,
      dateText: event.dateText,
      timeText: event.timeText,
      venue: event.venue,
      stallLocation: event.stallLocation,
      mapUrl: event.mapUrl,
      instagramUrl: event.instagramUrl,
      contactEmail: event.contactEmail,
    },
    rewards: {
      rewardsEnabled: rewards.rewardsEnabled,
      couponValueText: rewards.couponValueText,
      maxRedemptions: rewards.maxRedemptions,
      maxCouponsTotal: rewards.maxCouponsTotal,
    },
    game: {
      attempts: game.maxRewardAttempts,
      levels: game.levels.map((l) => ({ name: l.name, target: l.targetCatches, seconds: Math.round(l.durationMs / 1000) })),
    },
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      price: formatPrice(p.pricePaise, p.priceNote),
      priceKnown: p.pricePaise !== null,
      // Same wording as the menu and the homepage.
      availability:
        p.availability === "coming_soon" ? (p.category === "diyas" ? "On sale on event day" : "Served on event day") : AVAILABILITY_LABEL[p.availability],
    })),
    team: {
      groups: team.groups.map((g) => ({ name: g.name, members: team.students.filter((s) => s.groupId === g.id).map((s) => s.name) })),
      students: team.studentsArePreview ? [] : team.students.map((s) => ({ name: s.name, title: s.title, group: s.groupId ? (groupName.get(s.groupId) ?? null) : null })),
      mentors: team.mentorsArePreview ? [] : team.mentors.map((m) => ({ name: m.name, title: m.title })),
      mentorsPending: team.mentorsArePreview,
    },
    challenge: { seconds: CHALLENGE.durationSeconds, rulesApproved: CHALLENGE.rulesApproved },
  };
}

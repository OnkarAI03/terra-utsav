import "server-only";
import { cache } from "react";
import { DEFAULT_PRODUCTS } from "@/content/products";
import { defaultTeam } from "@/content/team";
import { DEFAULT_GAME_SETTINGS, parseGameSettings, type GameSettings } from "@/lib/game/config";
import { DEFAULT_EVENT, DEFAULT_REWARDS, parseEventSettings, parseRewardSettings, type EventSettings, type RewardSettings } from "@/lib/settings";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { MASCOT_VARIANTS, type MascotVariant, type Product, type TeamData, type TeamGroup, type TeamLink, type TeamMember } from "@/lib/types";

/**
 * Public content. Reads from Supabase when it is configured and falls back to the defaults in
 * src/content and src/lib when it is not (or when the database cannot be reached), so the site
 * always renders. Admin saves refresh the pages using these functions immediately; otherwise they
 * refresh hourly, so Netlify's servers near the visitor can keep a copy (with a one-minute refresh
 * almost every visit fetched the page from far away, about a second's wait).
 */

async function readSetting(key: "event" | "rewards" | "game"): Promise<unknown | undefined> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", key).maybeSingle();
    if (error || !data) return undefined;
    return data.value;
  } catch {
    return undefined;
  }
}

export const getEventSettings = cache(async (): Promise<EventSettings> => {
  const value = await readSetting("event");
  return value === undefined ? DEFAULT_EVENT : parseEventSettings(value);
});

export const getRewardSettings = cache(async (): Promise<RewardSettings> => {
  const value = await readSetting("rewards");
  return value === undefined ? DEFAULT_REWARDS : parseRewardSettings(value);
});

export const getGameSettings = cache(async (): Promise<GameSettings> => {
  const value = await readSetting("game");
  return value === undefined ? DEFAULT_GAME_SETTINGS : parseGameSettings(value);
});

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string | null;
  description: string;
  price_paise: number | null;
  price_note: string | null;
  availability: Product["availability"];
  featured: boolean;
  featured_label: string | null;
  image_url: string | null;
  image_alt: string;
  image_is_illustrative: boolean;
  sort_order: number;
}

export function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category === "diyas" ? "diyas" : "food",
    tagline: row.tagline,
    description: row.description,
    pricePaise: row.price_paise,
    priceNote: row.price_note,
    availability: row.availability,
    featured: row.featured,
    featuredLabel: row.featured_label,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    imageIsIllustrative: row.image_is_illustrative,
    sortOrder: row.sort_order,
  };
}

export const getProducts = cache(async (): Promise<Product[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return DEFAULT_PRODUCTS;
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .neq("availability", "hidden")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error || !data) return DEFAULT_PRODUCTS;
    return (data as ProductRow[]).map(mapProduct);
  } catch {
    return DEFAULT_PRODUCTS;
  }
});

function asVariant(v: unknown): MascotVariant {
  return MASCOT_VARIANTS.includes(v as MascotVariant) ? (v as MascotVariant) : "generic";
}

function asLinks(v: unknown): TeamLink[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((l): l is TeamLink => typeof l?.label === "string" && typeof l?.url === "string" && /^https:\/\//.test(l.url))
    .slice(0, 4);
}

export const getTeam = cache(async (): Promise<TeamData> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return defaultTeam();
  try {
    const [groupsRes, membersRes] = await Promise.all([
      supabase.from("team_groups").select("id, slug, name, description, mascot_variant, sort_order").eq("visible", true).order("sort_order"),
      supabase.from("team_members_public").select("*").order("sort_order"),
    ]);
    if (groupsRes.error || membersRes.error) return defaultTeam();

    const groups: TeamGroup[] = (groupsRes.data ?? []).map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      description: g.description,
      mascotVariant: asVariant(g.mascot_variant),
      sortOrder: g.sort_order,
    }));

    const members: TeamMember[] = (membersRes.data ?? []).map((m) => ({
      id: m.id,
      slug: m.slug,
      name: m.name,
      title: m.title,
      groupId: m.group_id,
      kind: m.kind === "mentor" ? "mentor" : "student",
      photoUrl: m.photo_url,
      mascotUrl: m.mascot_url,
      mascotVariant: asVariant(m.mascot_variant),
      bio: m.bio,
      links: asLinks(m.links),
      sortOrder: m.sort_order,
    }));

    if (members.length === 0) return defaultTeam();
    const fallback = defaultTeam();
    const mentors = members.filter((m) => m.kind === "mentor");
    const students = members.filter((m) => m.kind === "student");
    return {
      groups,
      // Mentors not entered yet keep their labelled preview slots.
      mentors: mentors.length ? mentors : fallback.mentors,
      students,
      mentorsArePreview: mentors.length === 0,
      studentsArePreview: false,
    };
  } catch {
    return defaultTeam();
  }
});

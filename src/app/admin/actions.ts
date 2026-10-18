"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { AuthError, requireRole, type Session } from "@/lib/auth";
import { gameSettingsSchema } from "@/lib/game/config";
import { formatDateTime } from "@/lib/format";
import { eventSettingsSchema, fromIstInput, rewardSettingsSchema } from "@/lib/settings";
import { MASCOT_VARIANTS } from "@/lib/types";

export type ActionState = { ok: boolean; message: string } | null;

const ok = (message: string): ActionState => ({ ok: true, message });
const fail = (message: string): ActionState => ({ ok: false, message });

/** Every admin action starts here: the role is checked on the server, then again by RLS. */
async function admin(): Promise<Session> {
  return requireRole("admin");
}

function authFail(e: unknown): ActionState {
  if (e instanceof AuthError) return fail(e.code === "forbidden" ? "Admins only." : "Please sign in again.");
  console.error(e);
  return fail("Something went wrong. Nothing was saved.");
}

function text(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function int(fd: FormData, key: string): number | null {
  const v = text(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

function refresh() {
  revalidatePath("/", "layout");
  // The Koochu Puchu chat caches the same content separately.
  revalidateTag("site-content");
}

async function saveSetting(session: Session, key: "event" | "rewards" | "game", value: unknown) {
  return session.supabase
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: session.user.id }, { onConflict: "key" });
}

// ------------------------------------------------------------------ uploads
const IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png", "image/avif"];

async function uploadImage(session: Session, file: FormDataEntryValue | null, folder: string): Promise<string | null | "invalid"> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) return "invalid";
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await session.supabase.storage.from("site-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return "invalid";
  return session.supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

// ------------------------------------------------------------------ settings
export async function saveEvent(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const startsAt = fromIstInput(text(fd, "startsAt"));
    const endsAt = fromIstInput(text(fd, "endsAt"));
    if (startsAt === "invalid" || endsAt === "invalid") return fail("Pick the start and end with the calendar (India time).");
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return fail("The end is before the start.");
    const parsed = eventSettingsSchema.safeParse({
      festivalName: text(fd, "festivalName"),
      dateText: text(fd, "dateText"),
      timeText: text(fd, "timeText"),
      startsAt,
      endsAt,
      venue: text(fd, "venue"),
      stallLocation: text(fd, "stallLocation"),
      mapUrl: text(fd, "mapUrl"),
      instagramUrl: text(fd, "instagramUrl"),
      contactEmail: text(fd, "contactEmail"),
      confirmed: fd.get("confirmed") === "on",
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields and try again.");
    const { error } = await saveSetting(session, "event", parsed.data);
    if (error) return fail("Could not save the event details.");
    refresh();
    return ok("Event details saved.");
  } catch (e) {
    return authFail(e);
  }
}

export async function saveRewards(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const expiresAt = fromIstInput(text(fd, "expiresAt"));
    if (expiresAt === "invalid") return fail("Pick the expiry date and time with the calendar (India time).");
    if (expiresAt && Date.parse(expiresAt) <= Date.now()) return fail("That expiry is in the past. Coupons would be born expired.");
    const expiresAfterHours = int(fd, "expiresAfterHours");
    if (expiresAt && expiresAfterHours !== null) return fail("Use either a fixed expiry or hours, not both.");
    const parsed = rewardSettingsSchema.safeParse({
      rewardsEnabled: fd.get("rewardsEnabled") === "on",
      couponLabel: text(fd, "couponLabel") ?? "",
      couponValueText: text(fd, "couponValueText"),
      maxRedemptions: int(fd, "maxRedemptions") ?? 1,
      expiresAfterHours,
      expiresAt,
      maxCouponsTotal: int(fd, "maxCouponsTotal"),
      confirmed: fd.get("confirmed") === "on",
      redemptionInstructions: text(fd, "redemptionInstructions") ?? "",
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields and try again.");
    if (parsed.data.maxCouponsTotal === 0) return fail("Total coupons is 0, so every winner would be told they have run out. Leave it empty for no limit.");
    const { error } = await saveSetting(session, "rewards", parsed.data);
    if (error) return fail("Could not save the reward rules.");
    refresh();
    const expiry = parsed.data.expiresAt
      ? ` Coupons expire ${formatDateTime(parsed.data.expiresAt)} (India time).`
      : parsed.data.expiresAfterHours
        ? ` Each coupon expires ${parsed.data.expiresAfterHours} hours after it is won.`
        : " Coupons have no expiry.";
    const live =
      parsed.data.rewardsEnabled && parsed.data.confirmed
        ? " Reward play runs during the event (the start and end times in Event)."
        : " Reward play stays closed until coupons are switched on and the terms are confirmed.";
    return ok(`Reward rules saved and live.${expiry}${live}`);
  } catch (e) {
    return authFail(e);
  }
}

export async function saveGame(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    let candidate: unknown;
    try {
      candidate = JSON.parse(String(fd.get("settings") ?? ""));
    } catch {
      return fail("The settings are not valid JSON.");
    }
    const parsed = gameSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail(`${issue?.path.join(".") || "settings"}: ${issue?.message ?? "invalid"}`);
    }
    const { error } = await saveSetting(session, "game", parsed.data);
    if (error) return fail("Could not save the game settings.");
    refresh();
    return ok("Game settings saved. Attempts already in progress keep the rules they started with.");
  } catch (e) {
    return authFail(e);
  }
}

// ------------------------------------------------------------------ menu
const productSchema = z.object({
  id: z.uuid().nullable(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes").max(60),
  name: z.string().min(1).max(80),
  category: z.enum(["food", "diyas"]),
  tagline: z.string().max(80).nullable(),
  description: z.string().max(600),
  price_paise: z.number().int().min(0).max(10_000_000).nullable(),
  price_note: z.string().max(80).nullable(),
  availability: z.enum(["available", "sold_out", "coming_soon", "hidden"]),
  featured: z.boolean(),
  featured_label: z.string().max(30).nullable(),
  image_url: z.string().max(500).nullable(),
  image_alt: z.string().max(200),
  image_is_illustrative: z.boolean(),
  sort_order: z.number().int().min(-1000).max(1000),
});

export async function saveProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const rupees = text(fd, "price");
    const pricePaise = rupees === null ? null : Math.round(Number(rupees) * 100);
    if (pricePaise !== null && !Number.isFinite(pricePaise)) return fail("Price must be a number of rupees, or empty.");

    const uploaded = await uploadImage(session, fd.get("image"), "products");
    if (uploaded === "invalid") return fail("Images must be WebP, JPEG, PNG or AVIF and under 5 MB.");

    const parsed = productSchema.safeParse({
      id: text(fd, "id"),
      slug: text(fd, "slug") ?? "",
      name: text(fd, "name") ?? "",
      category: text(fd, "category") ?? "food",
      tagline: text(fd, "tagline"),
      description: text(fd, "description") ?? "",
      price_paise: pricePaise,
      price_note: text(fd, "price_note"),
      availability: text(fd, "availability") ?? "coming_soon",
      featured: fd.get("featured") === "on",
      featured_label: text(fd, "featured_label"),
      image_url: uploaded ?? text(fd, "image_url"),
      image_alt: text(fd, "image_alt") ?? "",
      image_is_illustrative: uploaded ? false : fd.get("image_is_illustrative") === "on",
      sort_order: int(fd, "sort_order") ?? 0,
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
    const { id, ...row } = parsed.data;
    const { error } = id
      ? await session.supabase.from("products").update(row).eq("id", id)
      : await session.supabase.from("products").insert(row);
    if (error) return fail(error.code === "23505" ? "That slug is already used." : "Could not save the item.");
    refresh();
    return ok(`${row.name} saved.`);
  } catch (e) {
    return authFail(e);
  }
}

export async function deleteProduct(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const id = z.uuid().safeParse(text(fd, "id"));
    if (!id.success) return fail("Missing item.");
    const { error } = await session.supabase.from("products").delete().eq("id", id.data);
    if (error) return fail("Could not delete the item.");
    refresh();
    return ok("Item deleted.");
  } catch (e) {
    return authFail(e);
  }
}

// ------------------------------------------------------------------ team
const groupSchema = z.object({
  id: z.uuid().nullable(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes").max(60),
  name: z.string().min(1).max(60),
  description: z.string().max(240).nullable(),
  mascot_variant: z.enum(MASCOT_VARIANTS),
  sort_order: z.number().int().min(-1000).max(1000),
  visible: z.boolean(),
});

export async function saveGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const parsed = groupSchema.safeParse({
      id: text(fd, "id"),
      slug: text(fd, "slug") ?? "",
      name: text(fd, "name") ?? "",
      description: text(fd, "description"),
      mascot_variant: text(fd, "mascot_variant") ?? "generic",
      sort_order: int(fd, "sort_order") ?? 0,
      visible: fd.get("visible") === "on",
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
    const { id, ...row } = parsed.data;
    const { error } = id
      ? await session.supabase.from("team_groups").update(row).eq("id", id)
      : await session.supabase.from("team_groups").insert(row);
    if (error) return fail(error.code === "23505" ? "That slug is already used." : "Could not save the group.");
    refresh();
    return ok(`${row.name} saved.`);
  } catch (e) {
    return authFail(e);
  }
}

export async function deleteGroup(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const id = z.uuid().safeParse(text(fd, "id"));
    if (!id.success) return fail("Missing group.");
    const { error } = await session.supabase.from("team_groups").delete().eq("id", id.data);
    if (error) return fail("Could not delete the group.");
    refresh();
    return ok("Group deleted. Its members are now ungrouped.");
  } catch (e) {
    return authFail(e);
  }
}

const linkSchema = z.array(z.object({ label: z.string().min(1).max(30), url: z.url().refine((u) => u.startsWith("https://"), "Links must start with https://") })).max(4);

const memberSchema = z.object({
  id: z.uuid().nullable(),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and dashes").max(60),
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  group_id: z.uuid().nullable(),
  kind: z.enum(["student", "mentor"]),
  photo_url: z.string().max(500).nullable(),
  photo_consent: z.boolean(),
  mascot_url: z.string().max(500).nullable(),
  mascot_variant: z.enum(MASCOT_VARIANTS).nullable(),
  bio: z.string().max(400).nullable(),
  links: linkSchema,
  sort_order: z.number().int().min(-1000).max(1000),
  visible: z.boolean(),
});

export async function saveMember(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const photo = await uploadImage(session, fd.get("photo"), "team/photos");
    const mascot = await uploadImage(session, fd.get("mascot"), "team/mascots");
    if (photo === "invalid" || mascot === "invalid") return fail("Images must be WebP, JPEG, PNG or AVIF and under 5 MB.");

    const links = (text(fd, "links") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, url] = line.split("|").map((s) => s.trim());
        return { label, url };
      });

    const parsed = memberSchema.safeParse({
      id: text(fd, "id"),
      slug: text(fd, "slug") ?? "",
      name: text(fd, "name") ?? "",
      title: text(fd, "title") ?? "",
      group_id: text(fd, "group_id"),
      kind: text(fd, "kind") ?? "student",
      photo_url: photo ?? text(fd, "photo_url"),
      photo_consent: fd.get("photo_consent") === "on",
      mascot_url: mascot ?? text(fd, "mascot_url"),
      mascot_variant: text(fd, "mascot_variant"),
      bio: text(fd, "bio"),
      links,
      sort_order: int(fd, "sort_order") ?? 0,
      visible: fd.get("visible") === "on",
    });
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the fields.");
    const { id, ...row } = parsed.data;
    const { error } = id
      ? await session.supabase.from("team_members").update(row).eq("id", id)
      : await session.supabase.from("team_members").insert(row);
    if (error) return fail(error.code === "23505" ? "That slug is already used." : "Could not save the person.");
    refresh();
    return ok(`${row.name} saved.${row.photo_url && !row.photo_consent ? " Their photo stays hidden until consent is ticked." : ""}`);
  } catch (e) {
    return authFail(e);
  }
}

export async function deleteMember(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const id = z.uuid().safeParse(text(fd, "id"));
    if (!id.success) return fail("Missing person.");
    const { error } = await session.supabase.from("team_members").delete().eq("id", id.data);
    if (error) return fail("Could not delete.");
    refresh();
    return ok("Removed from the team page.");
  } catch (e) {
    return authFail(e);
  }
}

// ------------------------------------------------------------------ people, attempts, coupons
const emailSchema = z.email().max(120);

export async function setRole(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const email = emailSchema.safeParse(text(fd, "email"));
    const role = z.enum(["staff", "admin"]).safeParse(text(fd, "role"));
    const grant = text(fd, "intent") !== "revoke";
    if (!email.success || !role.success) return fail("Enter an email and pick a role.");
    const { data, error } = await session.supabase.rpc("admin_set_role", { p_email: email.data, p_role: role.data, p_grant: grant });
    if (error) return fail("Could not change the role.");
    if (!data?.ok) {
      return fail(
        data?.error === "user_not_found"
          ? "No account with that email yet. Ask them to sign in once first."
          : data?.error === "cannot_remove_own_admin"
            ? "You cannot remove your own admin role."
            : "Could not change the role.",
      );
    }
    revalidatePath("/admin/people");
    return ok(`${grant ? "Granted" : "Removed"} ${role.data} for ${email.data}.`);
  } catch (e) {
    return authFail(e);
  }
}

export async function grantBonusAttempts(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const email = emailSchema.safeParse(text(fd, "email"));
    const count = z.number().int().min(0).max(10).safeParse(int(fd, "count"));
    if (!email.success || !count.success) return fail("Enter an email and a number from 0 to 10.");
    const { data, error } = await session.supabase.rpc("admin_grant_bonus_attempts", { p_email: email.data, p_count: count.data });
    if (error || !data?.ok) return fail(data?.error === "user_not_found" ? "No account with that email yet." : "Could not update attempts.");
    return ok(`${email.data} now has ${count.data} extra attempt${count.data === 1 ? "" : "s"}.`);
  } catch (e) {
    return authFail(e);
  }
}

export async function voidCoupon(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const session = await admin();
    const code = z.string().min(4).max(40).safeParse(text(fd, "code"));
    if (!code.success) return fail("Enter a coupon code.");
    const { data, error } = await session.supabase.rpc("admin_void_coupon", { p_code: code.data });
    if (error || !data?.ok) return fail("That coupon could not be cancelled (unknown, already used or already cancelled).");
    return ok(`Coupon ${code.data.toUpperCase()} cancelled.`);
  } catch (e) {
    return authFail(e);
  }
}

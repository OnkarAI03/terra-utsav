import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "staff" | "admin";

export interface Session {
  supabase: SupabaseClient;
  user: User;
  roles: Role[];
}

/**
 * The signed-in visitor, verified with Supabase Auth (getUser contacts the auth server, so a
 * forged or expired cookie is rejected). Roles come from public.user_roles, never from profile
 * fields or user metadata the visitor could edit.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (data ?? []).map((r) => r.role as Role);
  return { supabase, user, roles };
}

export function hasRole(session: Session | null, role: Role): boolean {
  if (!session) return false;
  if (role === "staff") return session.roles.includes("staff") || session.roles.includes("admin");
  return session.roles.includes("admin");
}

/** For pages: send visitors without the role to sign in, or to a polite refusal. */
export async function requirePageRole(role: Role, nextPath: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!hasRole(session, role)) redirect(`/login?denied=${role}&next=${encodeURIComponent(nextPath)}`);
  return session;
}

export class AuthError extends Error {
  constructor(public readonly code: "unauthenticated" | "forbidden" | "not_configured") {
    super(code);
  }
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function requireRole(role: Role | null): Promise<Session> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AuthError("not_configured");
  const session = await getSession();
  if (!session) throw new AuthError("unauthenticated");
  if (role && !hasRole(session, role)) throw new AuthError("forbidden");
  return session;
}

/** Only allow redirects to paths on this site. */
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/auth/") || value.startsWith("/api/")) return fallback;
  return value;
}

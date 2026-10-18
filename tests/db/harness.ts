import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Runs the real migrations in an in-memory Postgres (PGlite) with a small shim for the parts of
 * Supabase they rely on: the anon / authenticated / service_role roles, auth.users, auth.uid(),
 * the storage schema, and Supabase's default grants on the public schema.
 *
 * PGlite has a single connection, so it cannot reproduce two truly simultaneous transactions.
 * The concurrency guarantees come from row locks and unique constraints, which these tests
 * exercise by replaying the same request twice.
 */
const SUPABASE_SHIM = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SUPABASE_SHIM);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    try {
      await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
    } catch (error) {
      throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
    }
  }
  return db;
}

export async function createUser(db: PGlite, email: string): Promise<string> {
  const r = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}

export async function grantRole(db: PGlite, userId: string, role: "staff" | "admin"): Promise<void> {
  await db.query("insert into public.user_roles (user_id, role) values ($1, $2)", [userId, role]);
}

type Role = "anon" | "authenticated" | "service_role";

/** Run `fn` inside a transaction as a given API role, optionally as a signed-in user. */
export async function as<T>(db: PGlite, role: Role, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return fn(tx);
  });
}

/** Call a JSON-returning SQL function as the server (service role). */
export async function serviceCall<T = Record<string, unknown>>(db: PGlite, sql: string, params: unknown[]): Promise<T> {
  return as(db, "service_role", null, async (tx) => {
    const r = await tx.query<{ result: T }>(`select ${sql} as result`, params);
    return r.rows[0].result;
  });
}

export async function userCall<T = Record<string, unknown>>(db: PGlite, userId: string, sql: string, params: unknown[]): Promise<T> {
  return as(db, "authenticated", userId, async (tx) => {
    const r = await tx.query<{ result: T }>(`select ${sql} as result`, params);
    return r.rows[0].result;
  });
}

/** Pretend a level was started `ms` milliseconds ago (the server clock check uses started_at). */
export async function backdateLevel(db: PGlite, attemptId: string, level: number, ms: number): Promise<void> {
  await db.query(
    "update public.game_attempt_levels set started_at = now() - make_interval(secs => $3::double precision / 1000) where attempt_id = $1 and level = $2",
    [attemptId, level, ms],
  );
}

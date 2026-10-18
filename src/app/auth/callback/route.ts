import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * Finishes a sign-in from an email link or OAuth provider. Handles both the PKCE `code` flow and
 * the `token_hash` flow, then sends the visitor to a safe, same-site path.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get("next"), "/rewards");
  const supabase = await createSupabaseServerClient();
  const failWith = (kind: string) => NextResponse.redirect(new URL(`/login?error=${kind}&next=${encodeURIComponent(next)}`, url.origin));
  const fail = failWith("link");
  if (!supabase) return fail;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return /verifier/i.test(`${error.code ?? ""} ${error.message}`) ? failWith("browser") : fail;
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail;
  } else {
    return fail;
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

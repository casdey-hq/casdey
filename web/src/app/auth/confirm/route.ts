import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { markRecovery, RESET_PATH } from "@/lib/password-recovery";
import { supabaseServer } from "@/lib/supabase-server";
import { safeNextPath } from "@/lib/safe-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where the password reset email's link lands.
 *
 * /auth/callback exchanges a PKCE code, which only works in the browser that
 * asked for the email, because that browser holds the other half of the code
 * in a cookie. A reset link opened from a phone's mail app, or an older link
 * after a second email was requested, has no matching half and fails as
 * "expired or already used" even though it is neither. Which is most resets:
 * people forget a password on a laptop and read the email on a phone.
 *
 * This route verifies the email's token hash on the server instead, which
 * needs nothing from the browser. The link is built in the Supabase dashboard
 * template (Authentication, Emails, Reset password):
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
const TYPES: EmailOtpType[] = [
  "recovery",
  "signup",
  "invite",
  "magiclink",
  "email_change",
  "email",
];

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type || !TYPES.includes(type)) {
    return redirectToLogin(origin, "That link is incomplete. Request a new one.");
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    return redirectToLogin(
      origin,
      type === "recovery"
        ? "That reset link has expired or was already used. Request a new one below."
        : "That link has expired or was already used. Try again.",
    );
  }

  const next =
    type === "recovery" ? RESET_PATH : safeNextPath(searchParams.get("next"));
  const response = NextResponse.redirect(`${origin}${next}`);
  // See src/lib/password-recovery.ts: only a recovery link earns the right to
  // set a password without the old one.
  if (type === "recovery") markRecovery(response);
  return response;
}

function redirectToLogin(origin: string, message: string): NextResponse {
  const url = new URL("/login", origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

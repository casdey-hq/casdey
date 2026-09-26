import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/supabase-server";

// Google sign-in lands here with a one-time code, which becomes a session cookie.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/admin";
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  if (code) {
    const supabase = await supabaseAuth();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.redirect(new URL("/admin/login?error=sign-in-failed", request.url));
}

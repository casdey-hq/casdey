import { NextResponse, type NextRequest } from "next/server";
import { supabaseAuth } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await supabaseAuth();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}

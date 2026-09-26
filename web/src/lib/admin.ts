import { redirect } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase-server";

// Who may open /admin. Override with ADMIN_EMAILS (comma separated).
const DEFAULT_ADMINS = ["davide@casdey.com", "07davide.longo@gmail.com", "info@casdey.com"];

export function adminEmails(): string[] {
  const fromEnv = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_ADMINS;
}

export function isAdmin(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Returns the signed-in admin's email, or redirects to the sign-in page. */
export async function requireAdmin(): Promise<string> {
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) redirect("/admin/login");
  if (!isAdmin(email)) redirect("/admin/login?error=not-allowed");
  return email;
}

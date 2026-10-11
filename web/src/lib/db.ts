// Supabase's REST API with the service-role key (server only).
export function supabase(path: string, init: RequestInit & { prefer?: string } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (init.prefer) headers.Prefer = init.prefer;
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
}

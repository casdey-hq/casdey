import type { NextRequest } from "next/server";
import { sendConfirmation } from "@/lib/confirmation-email";

const GOALS = new Set(["body", "face", "style", "discipline"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function supabase(path: string, init: RequestInit & { prefer?: string } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "That didn't go through. Try again in a moment." }, { status: 400 });
  }

  // Bots fill the hidden field; pretend it worked and store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") return Response.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address, like name@example.com." }, { status: 400 });
  }
  const goal = typeof body.goal === "string" && GOALS.has(body.goal) ? body.goal : null;
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;
  const country = request.headers.get("x-vercel-ip-country");

  try {
    // ignore-duplicates: joining twice is fine, changes nothing and returns no row,
    // so no second confirmation email goes out.
    const insert = await supabase("waitlist?on_conflict=email", {
      method: "POST",
      prefer: "resolution=ignore-duplicates,return=representation",
      body: JSON.stringify({ email, goal, source, country }),
    });
    if (!insert.ok) {
      console.error("waitlist insert failed", insert.status, await insert.text());
      return Response.json({ error: "That didn't go through. Try again in a moment." }, { status: 502 });
    }
    const rows = (await insert.json()) as { id: string }[];
    const row = rows[0];
    if (row && (await sendConfirmation(email))) {
      await supabase(`waitlist?id=eq.${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ confirmation_sent_at: new Date().toISOString() }),
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("waitlist error", error);
    return Response.json({ error: "That didn't go through. Try again in a moment." }, { status: 502 });
  }
}

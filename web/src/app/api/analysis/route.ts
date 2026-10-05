import { after, type NextRequest } from "next/server";
import { analyse, type Photo } from "@/lib/analysis";
import { sendAnalysis } from "@/lib/analysis-email";
import { describe, validAnswers, validBody } from "@/lib/quiz";

// The model call takes a while with two photos.
export const maxDuration = 90;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** About 1.5 MB of JPEG. The page resizes photos to 1280 px, far below this. */
const MAX_PHOTO = 2_000_000;
const PER_EMAIL_PER_DAY = 3;
const FAILED = "The analysis didn't go through. Try again in a moment.";

function supabase(path: string, init: RequestInit & { prefer?: string } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (init.prefer) headers.Prefer = init.prefer;
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers });
}

function photo(value: unknown): Photo | null {
  if (typeof value !== "string") return null;
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || match[1].length > MAX_PHOTO) return null;
  return { data: match[1], mediaType: "image/jpeg" };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: FAILED }, { status: 400 });
  }

  // Bots fill the hidden field; answer like a failure and spend nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") return Response.json({ error: FAILED }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address, like name@example.com." }, { status: 400 });
  }
  if (!validAnswers(body.answers) || !validBody(body.body)) {
    return Response.json({ error: "Some answers are missing. Go back and check each step." }, { status: 400 });
  }
  if (body.answers.age === "under18" || body.adult !== true) {
    return Response.json({ error: "Casdey is for people 18 and over." }, { status: 400 });
  }
  const face = photo(body.face);
  if (!face) return Response.json({ error: "Add a face photo to get your analysis." }, { status: 400 });
  const bodyPhoto = body.bodyPhoto ? photo(body.bodyPhoto) : null;

  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const recent = await supabase(`analyses?select=id&email=eq.${encodeURIComponent(email)}&created_at=gte.${since}`, {
      prefer: "count=exact",
      method: "HEAD",
    });
    const count = Number(recent.headers.get("content-range")?.split("/")[1] ?? 0);
    if (count >= PER_EMAIL_PER_DAY) {
      return Response.json({ error: "You've had 3 analyses today. Check your inbox for the last one, or come back tomorrow." }, { status: 429 });
    }

    const result = await analyse(face, bodyPhoto, describe(body.answers, body.body));
    if (!result.usable) return Response.json({ retake: result.unusable_reason });

    const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;
    const insert = await supabase("analyses", {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        email,
        goal: body.answers.goal,
        answers: { ...body.answers, body: body.body },
        result: { read: result.read, levers: result.levers },
        had_body_photo: Boolean(bodyPhoto),
        source,
        country: request.headers.get("x-vercel-ip-country"),
      }),
    });
    if (!insert.ok) console.error("analysis insert failed", insert.status, await insert.text());
    const row = insert.ok ? ((await insert.json()) as { id: string }[])[0] : null;

    // The person sees the result straight away; the email copy goes out after the response.
    after(async () => {
      if ((await sendAnalysis(email, result.read, result.levers)) && row) {
        await supabase(`analyses?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ email_sent_at: new Date().toISOString() }) });
      }
    });

    return Response.json({ read: result.read, levers: result.levers });
  } catch (error) {
    console.error("analysis error", error);
    return Response.json({ error: FAILED }, { status: 502 });
  }
}

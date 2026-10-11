// Emails for the paid 90-day plan (2026-10-11): a welcome to the person who
// started the trial, and a heads-up to Davide, who writes the plan by hand.
const FROM = "Casdey <hello@casdey.com>";
const REPLY_TO = "info@casdey.com";

async function send(payload: Record<string, unknown>): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("plan email failed", error);
    return false;
  }
}

export function sendWelcome(to: string, trialEnds: Date, price: string): Promise<boolean> {
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(trialEnds);
  const text = [
    "You're in.",
    "",
    "Your 90-day plan is being written for you now, from your answers and your 3 levers. It reaches this inbox within 24 hours.",
    "",
    "How it works:",
    "1. Your plan: what to do each day, for 90 days, built around your 3 levers.",
    "2. A daily check-in: reply to the day's email with a quick photo or a line on what you did. I read every one.",
    "3. A weekly review: what's working, what to change.",
    "",
    "One thing that makes the plan better: reply to this email with a clear, front-facing photo in daylight, and anything you want me to know.",
    "",
    `Your free trial runs until ${day}. Nothing is charged before then. After that it's ${price}. To cancel, reply "cancel" to any Casdey email, any time, and it's done.`,
    "",
    "Davide @casdey",
  ].join("\n");
  return send({ from: FROM, to, reply_to: REPLY_TO, subject: "You're in: your 90-day plan is being written", text });
}

export function notifyDavide(detail: { email: string; interval: string; analysis: string | null; goal?: string; result?: unknown; answers?: unknown }): Promise<boolean> {
  const to = process.env.WAITLIST_NOTIFY_TO || "davide@casdey.com";
  const text = [
    `New 90-day plan trial: ${detail.email} (${detail.interval}).`,
    "",
    "Write their plan by hand and send it within 24 hours. Their analysis and answers:",
    "",
    `Analysis row: ${detail.analysis ?? "not linked"}`,
    `Goal: ${detail.goal ?? "?"}`,
    "",
    JSON.stringify({ answers: detail.answers ?? null, result: detail.result ?? null }, null, 2).slice(0, 6000),
  ].join("\n");
  return send({ from: "Casdey alerts <hello@casdey.com>", to, subject: `Casdey: new plan trial (${detail.email})`, text });
}

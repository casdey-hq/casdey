// Emails Davide when the free analysis fails (out of Anthropic credit, an
// outage, a bug), so it never breaks silently. At most one alert per 30
// minutes per server instance; a burst of failures sends one email, not many.
const FROM = "Casdey alerts <hello@casdey.com>";
const EVERY_MS = 30 * 60 * 1000;
let lastSent = 0;

export async function alertDavide(subject: string, detail: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.WAITLIST_NOTIFY_TO || "davide@casdey.com";
  if (!key || Date.now() - lastSent < EVERY_MS) return;
  lastSent = Date.now();
  const credit = /credit balance/i.test(detail);
  const text = [
    credit
      ? "The free analysis on www.casdey.com is failing because the Anthropic account is out of credit. Every visitor who finishes the quiz gets an error until it's topped up: console.anthropic.com, casdey organisation, Plans & Billing."
      : "The free analysis on www.casdey.com just failed. Visitors who finish the quiz get an error until it's fixed.",
    "",
    "Error:",
    detail.slice(0, 1500),
    "",
    "You'll get at most one of these every 30 minutes.",
  ].join("\n");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, text }),
    });
  } catch (error) {
    console.error("alert email failed", error);
  }
}

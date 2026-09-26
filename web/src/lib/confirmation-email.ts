// "You're on the list" email, sent once per address through Resend.
const FROM = "Casdey <hello@casdey.com>";
const REPLY_TO = "info@casdey.com";

const text = `You're on the list.

Thanks for joining the Casdey waitlist. Casdey is a 90-day glow-up plan for your body, skin and style, checked every day, with no fake scores.

When it opens, you'll get your free face and physique analysis first. We'll email you then, and only about Casdey.

If you didn't sign up, ignore this email and you won't hear from us again. To be removed at any time, reply to this email.

Casdey
https://www.casdey.com`;

const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:22px;padding:40px 36px">
<tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.5px;padding-bottom:28px">Casdey</td></tr>
<tr><td style="font-size:32px;font-weight:700;letter-spacing:-1px;line-height:1.1;padding-bottom:16px">You&rsquo;re on the list.</td></tr>
<tr><td style="font-size:17px;line-height:1.55;color:#6e6e73;padding-bottom:16px">Thanks for joining the Casdey waitlist. Casdey is a 90-day glow-up plan for your body, skin and style, checked every day, with no fake scores.</td></tr>
<tr><td style="font-size:17px;line-height:1.55;color:#6e6e73;padding-bottom:28px">When it opens, you&rsquo;ll get your free face and physique analysis first. We&rsquo;ll email you then, and only about Casdey.</td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#86868b;border-top:1px solid #e8e8ed;padding-top:20px">If you didn&rsquo;t sign up, ignore this email and you won&rsquo;t hear from us again. To be removed at any time, reply to this email.</td></tr>
</table></td></tr></table></body></html>`;

export async function sendConfirmation(to: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject: "You're on the Casdey list", text, html }),
  });
  return response.ok;
}

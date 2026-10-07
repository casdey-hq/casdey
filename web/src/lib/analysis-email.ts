// "Your free analysis" email: a copy of the result, sent through Resend.
import type { Result } from "@/lib/analysis";

const FROM = "Casdey <hello@casdey.com>";
const REPLY_TO = "info@casdey.com";

function escape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendAnalysis(to: string, { score, potential, read, levers }: Result): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;

  const text = [
    "Your free Casdey analysis",
    "",
    `Your score now: ${score.toFixed(1)}. Your potential in 90 days: ${potential.toFixed(1)}.`,
    "",
    read,
    "",
    ...levers.flatMap((lever, i) => [`${i + 1}. ${lever.title} (+${lever.gain.toFixed(1)})`, lever.why, `This week: ${lever.first_step}`, ""]),
    "Your full 90-day plan, with a daily check-in that makes sure you actually do it, opens soon. You'll get an email the day your 7-day free trial is ready.",
    "",
    "Your photos were not stored. If you didn't ask for this, ignore this email. To be removed at any time, reply to it.",
    "",
    "Casdey",
    "https://www.casdey.com",
  ].join("\n");

  const rows = levers
    .map(
      (lever, i) => `<tr><td style="padding:0 0 22px">
<div style="font-size:13px;font-weight:600;color:#6e6e73;padding-bottom:4px">Lever ${i + 1} &middot; +${lever.gain.toFixed(1)}</div>
<div style="font-size:21px;font-weight:700;letter-spacing:-0.4px;padding-bottom:6px">${escape(lever.title)}</div>
<div style="font-size:16px;line-height:1.5;color:#3a3a3c;padding-bottom:10px">${escape(lever.why)}</div>
<div style="font-size:15px;line-height:1.5;background:#f5f5f7;border-radius:14px;padding:12px 14px"><b>This week:</b> ${escape(lever.first_step)}</div>
</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:22px;padding:40px 36px">
<tr><td style="font-size:20px;font-weight:700;letter-spacing:-0.5px;padding-bottom:28px">Casdey</td></tr>
<tr><td style="font-size:32px;font-weight:700;letter-spacing:-1px;line-height:1.1;padding-bottom:16px">Your free analysis</td></tr>
<tr><td style="padding-bottom:22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="50%" style="background:#f5f5f7;border-radius:16px;padding:16px 18px"><div style="font-size:12px;font-weight:600;color:#6e6e73">Your score now</div><div style="font-size:40px;font-weight:700;letter-spacing:-1.5px">${score.toFixed(1)}</div></td>
<td width="12"></td>
<td width="50%" style="background:#1d1d1f;color:#ffffff;border-radius:16px;padding:16px 18px"><div style="font-size:12px;font-weight:600;color:#a1a1a6">Potential in 90 days</div><div style="font-size:40px;font-weight:700;letter-spacing:-1.5px">${potential.toFixed(1)}</div></td>
</tr></table></td></tr>
<tr><td style="font-size:17px;line-height:1.55;color:#6e6e73;padding-bottom:28px">${escape(read)}</td></tr>
${rows}
<tr><td style="font-size:16px;line-height:1.55;color:#6e6e73;padding:6px 0 28px">Your full 90-day plan, with a daily check-in that makes sure you actually do it, opens soon. You&rsquo;ll get an email the day your 7-day free trial is ready.</td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#86868b;border-top:1px solid #e8e8ed;padding-top:20px">Your photos were not stored. If you didn&rsquo;t ask for this, ignore this email. To be removed at any time, reply to it.</td></tr>
</table></td></tr></table></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject: "Your free Casdey analysis", text, html }),
  });
  return response.ok;
}

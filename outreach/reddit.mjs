// Daily Reddit outreach list (2026-10-11). Reads the public RSS feeds of
// rate-me subreddits (no API app needed; Reddit's app registration is gated),
// keeps posts by men who state an age of 18 or more, skips posts already
// listed, and writes outreach/lists/<date>.md with a ready reply for each.
// Davide posts the replies himself; nothing here logs in or posts.
//
//   node outreach/reddit.mjs            (takes a few minutes: Reddit rate-limits)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SUBS = ["Rateme", "truerateme", "looksmaxxing", "malegrooming"];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAX_AGE_H = 48;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function feed(sub) {
  for (let i = 0; i < 12; i++) {
    const response = await fetch(`https://www.reddit.com/r/${sub}/new/.rss`, { headers: { "user-agent": UA } });
    if (response.ok) return response.text();
    if (response.status !== 429) return "";
    await sleep(30_000);
  }
  return "";
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** "22M", "M22", "[M23]", "21 M", "(M27)", "M/33": the age if it reads male and 18+. */
function maleAge(title) {
  const t = title.replace(/[()[\]/,.:-]/g, " ");
  const m = /\b(\d{2})\s*m\b/i.exec(t) || /\bm\s*(\d{2})\b/i.exec(t) || /\b(\d{2})\s*(?:yo|y o)?\s*male\b/i.exec(t);
  if (!m) return null;
  const age = Number(m[1]);
  return age >= 18 && age <= 45 ? age : null;
}

function reply(title, sub) {
  const t = title.toLowerCase();
  if (/anxiety|depress|ugly|hate (my|how)|insecur/.test(t))
    return "(No plug here: just be kind and give one real, specific tip about his photos. Helping is the point.)";
  if (/bald|hairline|thinning|minoxidil|finasteride|meds/.test(t))
    return "If it keeps thinning, a short buzz with a sharp lineup usually looks better than holding on, and it shows off the face. Stubble helps balance it. If you want an objective read on what else would move you most, casdey.com is free: score, 90-day potential and your top 3 changes.";
  if (/shave|beard|stubble/.test(t))
    return "Honestly the beard question comes down to jawline definition. Try a short, even stubble before going fully clean shaven, it usually reads sharper. If you want an objective read, casdey.com gives you a free score, your 90-day potential and the 3 changes that matter most for your face.";
  if (/hair/.test(t))
    return "The hair works for you. Biggest lever I'd look at next is the cut framing your face: a bit more volume on top, tighter on the sides. If you want it broken down properly, casdey.com is free: score, 90-day potential, and the 3 changes that'd move you most.";
  if (/tip|advice|improve|honest|help/.test(t))
    return "Solid base. The quick wins for most guys are a sharper haircut, consistent skincare (cleanser + moisturiser + SPF), and posture in photos. For your face specifically, casdey.com gives you a free score, your 90-day potential and your own top 3 changes. Takes 2 min.";
  if (sub === "looksmaxxing")
    return "Good starting point, your potential is clearly higher than where you are now. If you want the exact gap, casdey.com is free: score now, 90-day potential, and the 3 levers that close it.";
  return "Good base, you're closer to the top than you think. The fastest gains usually come from the cut, skin and how you hold your face in photos. If you want your exact numbers, casdey.com is free: your score, your 90-day potential and the 3 changes that get you there.";
}

const statePath = path.join(here, "lists", ".seen.json");
fs.mkdirSync(path.join(here, "lists"), { recursive: true });
const seen = new Set(fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : []);
const picks = [];
for (const sub of SUBS) {
  const xml = await feed(sub);
  for (const entry of xml.split("<entry>").slice(1)) {
    const get = (re) => decode((entry.match(re) || [])[1] || "");
    const link = get(/<link href="([^"]+)"/);
    const title = get(/<title>([^<]+)/);
    const updated = new Date(get(/<updated>([^<]+)/));
    const age = maleAge(title);
    if (!link || seen.has(link) || !age || Date.now() - updated > MAX_AGE_H * 3600e3) continue;
    picks.push({ sub, link, title, age, author: get(/<name>([^<]+)/), updated });
  }
  await sleep(20_000);
}
picks.sort((a, b) => b.updated - a.updated);
const day = new Date().toISOString().slice(0, 10);
const lines = [
  `# Reddit outreach list, ${day}`,
  "",
  `${picks.length} new posts by men 18+ asking to be rated. Open each, look at the photos first, and change the first sentence so it's about HIM (one real, specific compliment or tip). Keep casdey.com as plain text. Skip anyone who sounds down on himself.`,
  "",
  "Subreddit rules: r/Rateme and r/truerateme remove self-promotion. If a comment there gets removed, keep giving real advice and leave casdey.com out of that sub.",
  "",
  ...picks.flatMap((p, i) => [
    `## ${i + 1}. r/${p.sub}: ${p.title}`,
    `${p.link}  (${p.author}, ${p.age})`,
    "",
    `> ${reply(p.title, p.sub)}`,
    "",
  ]),
];
const out = path.join(here, "lists", `${day}.md`);
fs.writeFileSync(out, lines.join("\n"));
for (const p of picks) seen.add(p.link);
fs.writeFileSync(statePath, JSON.stringify([...seen].slice(-3000)));
console.log(`${picks.length} posts -> ${out}`);

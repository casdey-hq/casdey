// Scores frames the live tool would refuse (a video frame: soft, mid-laugh), for the score card of a REMAKE only.
// Same model, prompt and scale as src/lib/analysis.ts with the "can't be judged fairly" rule removed, as Davide
// authorised on 2026-10-07. The tool is calibrated on men: for a woman it is only indicative. Average 2-3 frames.
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
const root = "./"; // run from web/: cd web && node scripts/score-frame.mjs <frame.jpg...>
for (const line of fs.readFileSync(root + ".env.local", "utf8").split(/\r?\n/)) { const i = line.indexOf("="); if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, ""); }
const source = fs.readFileSync(root + "src/lib/analysis.ts", "utf8");
let SYSTEM = source.match(/const SYSTEM = `([\s\S]*?)`;/)[1];
// Lift the "can't be judged fairly" refusal rule for this one-off (Davide's go, 2026-10-07).
SYSTEM = SYSTEM.replace(/ Also false if the photo can[\s\S]*?instead, so the same face gets the same score\./, "");
if (/Also false if the photo/.test(SYSTEM)) throw new Error("refusal rule still in the prompt");
const SCHEMA = Function(`return (${source.match(/const SCHEMA = (\{[\s\S]*?\n\});/)[1]})`)();
const client = new Anthropic();
const note = "Note: the subject is a young woman, and this photo is a frame from a video, so it is a little soft and she is smiling. Judge her face as fairly as you can, looking through the video softness and the expression. Do not mark it unusable: always return usable true with your best score on the same 1 to 10 scale, and three levers.";
const answers = "What do you want to improve most? All of it\nHow old are you? 22 to 25\nHow often do you train? 1 or 2 times a week\nHow much do you sleep? 7 to 8 hours\nWhat do you do for your skin? A few products\nHow do you feel about your hair? Happy with it\nHow would you describe how you dress? Decent, could be sharper";
const out = [];
for (const f of process.argv.slice(2)) {
  const data = fs.readFileSync(f).toString("base64");
  const r = await client.beta.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default", system: SYSTEM, output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } }, messages: [{ role: "user", content: [{ type: "text", text: "Face photo:" }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data } }, { type: "text", text: `${note}\n\nHis answers:\n${answers}` }] }] });
  const j = JSON.parse(r.content.find((b) => b.type === "text").text);
  const gain = (j.levers || []).slice(0, 3).reduce((s, l) => s + Math.min(Math.max(l.gain, 0.1), 1.5), 0);
  out.push({ f, usable: j.usable, score: j.score, potential: Math.min(j.score + gain, 10) });
  console.log(f, "usable", j.usable, "score", j.score, "gains", gain.toFixed(1), (j.unusable_reason || "").slice(0, 80));
}
const ok = out.filter((o) => o.score > 0);
if (ok.length) console.log(`\nmean score ${(ok.reduce((s, o) => s + o.score, 0) / ok.length).toFixed(1)}  mean potential ${(ok.reduce((s, o) => s + o.potential, 0) / ok.length).toFixed(1)}  (n=${ok.length})`);

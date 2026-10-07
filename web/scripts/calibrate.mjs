// Score calibration for the free analysis. Runs a set of faces with known
// target scores through the same prompt and schema as src/lib/analysis.ts and
// reports how far the model lands from each target.
//   node scripts/calibrate.mjs <set.json> [runs per face, default 1]
// set.json: [{ "file": "path.jpg", "target": 6.1, "group": "CM" }, ...]
// Needs ANTHROPIC_API_KEY (read from .env.local). Writes <set>.results.json.
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i > 0 && !process.env[line.slice(0, i)]) process.env[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, "");
}
const source = fs.readFileSync("src/lib/analysis.ts", "utf8");
const SYSTEM = source.match(/const SYSTEM = `([\s\S]*?)`;/)[1];
const SCHEMA = Function(`return (${source.match(/const SCHEMA = (\{[\s\S]*?\n\});/)[1]})`)();

const [setFile, runsArg] = process.argv.slice(2);
const runs = Number(runsArg || 1);
const set = JSON.parse(fs.readFileSync(setFile, "utf8"));
const base = path.dirname(path.resolve(setFile));
const client = new Anthropic();
const answers = "What do you want to improve most? All of it\nHow old are you? 22 to 25\nHeight 180 cm, weight 76 kg.\nHow often do you train? 3 or 4 times a week\nHow much do you sleep on a normal night? 7 to 8 hours\nWhat do you do for your skin? A few products\nYour biggest skin issue? None really\nHow do you feel about your hair? Happy with it\nHow would you describe how you dress? Decent, could be sharper\nWhat stopped you before? I start, then stop";

async function score(file) {
  const data = fs.readFileSync(path.resolve(base, file)).toString("base64");
  const media_type = /\.png$/i.test(file) ? "image/png" : "image/jpeg";
  const r = await client.beta.messages.create({
    model: "claude-opus-5-5", max_tokens: 16000, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    system: SYSTEM, output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: [{ type: "text", text: "Face photo:" }, { type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: `His answers:\n${answers}` }] }],
  });
  if (r.stop_reason === "refusal") return { refused: true };
  const j = JSON.parse(r.content.find((b) => b.type === "text").text);
  return j.usable ? { score: j.score } : { unusable: j.unusable_reason };
}

const jobs = set.flatMap((face, i) => Array.from({ length: runs }, () => i));
const out = set.map((f) => ({ ...f, scores: [], notes: [] }));
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < jobs.length) {
    const i = jobs[next++];
    try {
      const r = await score(set[i].file);
      if (r.score != null) out[i].scores.push(r.score); else out[i].notes.push(r.unusable || "refused");
    } catch (e) { out[i].notes.push("error " + String(e).slice(0, 80)); }
  }
}));

const rows = out.map((f) => ({ ...f, mean: f.scores.length ? f.scores.reduce((a, b) => a + b, 0) / f.scores.length : null }));
const ok = rows.filter((r) => r.mean != null);
const err = ok.map((r) => r.mean - r.target);
const mae = err.reduce((a, b) => a + Math.abs(b), 0) / err.length;
const bias = (lo, hi) => { const s = ok.filter((r) => r.target >= lo && r.target < hi); return s.length ? (s.reduce((a, r) => a + r.mean - r.target, 0) / s.length).toFixed(2) + ` (n=${s.length})` : "-"; };
for (const r of rows) console.log(`${String(r.target).padStart(4)}  ${r.mean == null ? "  - " : r.mean.toFixed(1).padStart(4)}  ${r.scores.join("/").padEnd(12)} ${r.group || ""} ${path.basename(r.file)} ${r.notes.join("; ").slice(0, 90)}`);
console.log(`\nMAE ${mae.toFixed(2)} on ${ok.length}/${rows.length}  bias <5.5: ${bias(0, 5.5)}  5.5-7: ${bias(5.5, 7)}  7-8.5: ${bias(7, 8.5)}  8.5+: ${bias(8.5, 11)}`);
fs.writeFileSync(setFile.replace(/\.json$/, ".results.json"), JSON.stringify(rows, null, 1));

// Pinterest IMAGE search, no login: downloads the original-size stills for queries.
//   node pinimg.mjs <outdir> "<query>" ["<query>" ...]     (7 stills per query, 900 px+)
// Writes <outdir>/pNNN.jpg and <outdir>/cands.json (query, id, size). Then build a
// labelled sheet with gridsheet.mjs and pick by eye. Used for model portraits
// ("<name> face close up portrait" gives frontal glamour shots).
import fs from "fs";
const [outDir, ...queries] = process.argv.slice(2);
if (!outDir || !queries.length) { console.log('usage: node pinimg.mjs <outdir> "<query>" ...'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });
const H = { "x-pinterest-pws-handler": "www/search/[scope].js", accept: "application/json", "user-agent": "Mozilla/5.0" };
const out = [];
for (const q of queries) {
  const data = { options: { query: q, scope: "pins", page_size: 40, rs: "typed" }, context: {} };
  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent("/search/pins/?q=" + q)}&data=${encodeURIComponent(JSON.stringify(data))}`;
  try {
    const res = (await (await fetch(url, { headers: H })).json()).resource_response?.data?.results || [];
    let c = 0;
    for (const p of res) {
      const o = p.images?.orig;
      if (!o || o.width < 900 || o.height < 900 || p.videos) continue;
      out.push({ query: q, id: p.id, url: o.url, w: o.width, h: o.height });
      if (++c >= 7) break;
    }
  } catch (e) { console.log(q, "error", String(e).slice(0, 80)); }
  await new Promise((r) => setTimeout(r, 600));
}
out.forEach((x, i) => (x.file = `p${String(i).padStart(3, "0")}.jpg`));
for (const x of out) {
  try { fs.writeFileSync(`${outDir}/${x.file}`, Buffer.from(await (await fetch(x.url, { headers: { "user-agent": "Mozilla/5.0" } })).arrayBuffer())); } catch { x.file = null; }
}
fs.writeFileSync(`${outDir}/cands.json`, JSON.stringify(out, null, 1));
console.log(out.filter((x) => x.file).length, "downloaded to", outDir);

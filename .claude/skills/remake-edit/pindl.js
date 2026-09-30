// Downloads Pinterest video pins found by pinsearch.js and keeps only clips fit
// for a remake: native vertical, at least 540 px wide, 24+ fps, 2.5+ s, and
// smooth (few duplicate frames, so no 12.5 fps GIF loops or stuttering
// re-uploads). Pinterest's m3u8 points at one fragmented MP4 (.cmfv) through
// byte ranges, and `ffmpeg -c copy` on the playlist stops after 2 s, so this
// fetches the whole .cmfv of the best variant and remuxes it.
// Usage: node pindl.js <outdir> "<query>" ["<query>" ...]
//   (needs FFMPEG=path\to\ffmpeg.exe or ffmpeg on PATH; writes <outdir>/<pin id>.mp4
//   and appends one line per kept clip to <outdir>/index.tsv)
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const [out, ...queries] = process.argv.slice(2);
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/i, "ffprobe$1");
fs.mkdirSync(out, { recursive: true });
const index = path.join(out, "index.tsv");
const seen = new Set(fs.existsSync(index) ? fs.readFileSync(index, "utf8").split("\n").map((l) => l.split("\t")[0]) : []);

async function search(q) {
  const data = { options: { query: q, scope: "videos", page_size: 50, rs: "typed" }, context: {} };
  const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent("/search/videos/?q=" + q)}&data=${encodeURIComponent(JSON.stringify(data))}`;
  const r = await fetch(url, { headers: { "x-pinterest-pws-handler": "www/search/[scope].js", accept: "application/json", "user-agent": "Mozilla/5.0" } });
  const j = await r.json();
  return (j.resource_response?.data?.results || []).flatMap((p) => {
    const vl = p.videos?.video_list || p.story_pin_data?.pages?.[0]?.blocks?.[0]?.video?.video_list;
    const v = vl && Object.values(vl).find((x) => x.url?.endsWith(".m3u8"));
    return v ? [{ id: p.id, m3u8: v.url, w: v.width, h: v.height, title: (p.grid_title || p.title || p.description || "").replace(/\s+/g, " ").slice(0, 80) }] : [];
  });
}

async function fetchText(u) { return (await fetch(u)).text(); }

async function download(pin, file) {
  const base = pin.m3u8.slice(0, pin.m3u8.lastIndexOf("/") + 1);
  const master = await fetchText(pin.m3u8);
  const variants = master.split("\n").filter((l) => l.endsWith(".m3u8") && !l.includes("audio"));
  const media = await fetchText(base + variants[variants.length - 1]);
  const cmfv = media.split("\n").find((l) => l && !l.startsWith("#"));
  const buf = Buffer.from(await (await fetch(base + cmfv)).arrayBuffer());
  fs.writeFileSync(file + ".cmfv", buf);
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", file + ".cmfv", "-c", "copy", file]);
  fs.rmSync(file + ".cmfv");
}

function check(file) {
  const [w, h, fr, dur] = execFileSync(FFPROBE, ["-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "csv=p=0", file]).toString().trim().split(/[\r\n,]+/);
  const [a, b] = fr.split("/").map(Number);
  return { w: +w, h: +h, fps: a / (b || 1), dur: +dur };
}

// mpdecimate drops near-identical frames; a high drop share means stutter or a padded GIF.
function dupShare(file, fps, dur) {
  const r = require("child_process").spawnSync(FFMPEG, ["-i", file, "-vf", "mpdecimate", "-an", "-f", "null", "-"], { encoding: "utf8" });
  const m = [...r.stderr.matchAll(/frame=\s*(\d+)/g)].pop();
  const kept = m ? +m[1] : 0;
  const total = Math.round(fps * dur);
  return total ? 1 - kept / total : 1;
}

(async () => {
  for (const q of queries) {
    let pins = [];
    try { pins = await search(q); } catch (e) { console.log(`search failed: ${q}`); continue; }
    for (const pin of pins) {
      if (seen.has(pin.id)) continue;
      seen.add(pin.id);
      if (pin.h / pin.w < 1.7 || pin.w < 540) continue; // not native vertical, or too small
      const file = path.join(out, `${pin.id}.mp4`);
      try { await download(pin, file); } catch { continue; }
      const { w, h, fps, dur } = check(file);
      const dup = dupShare(file, fps, dur);
      const ok = fps >= 24 && dur >= 2.5 && w >= 540 && h / w >= 1.7 && dup < 0.35;
      if (!ok) { fs.rmSync(file); continue; }
      const line = [pin.id, `${w}x${h}`, fps.toFixed(1), dur.toFixed(1), dup.toFixed(2), q, pin.title].join("\t");
      fs.appendFileSync(index, line + "\n");
      console.log(line);
    }
  }
})();

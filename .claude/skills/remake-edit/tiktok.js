// TikTok clips in original quality without a TikTok login (2026-10-01).
// tiktok.com redirects to a login page, so: Urlebird (a public TikTok viewer)
// lists accounts, hashtags and thumbnails; SnapTik resolves a video URL to the
// original mp4 (1080p when the creator uploaded 1080p, no watermark).
//
//   node tiktok.js tags   <dir> <tag> [tag...]      handles seen on those hashtag pages -> <dir>/handles.txt
//   node tiktok.js users  <dir> <handle> [handle...] each account's recent videos -> <dir>/index.tsv + <dir>/thumbs/<id>.jpg
//   node tiktok.js sheet  <dir>                      numbered thumbnail sheets -> <dir>/sheet<N>.jpg (needs FFMPEG)
//   node tiktok.js get    <dir> <n|handle/id> [...]  download picks (numbers from the sheet) -> <dir>/<n>_<handle>_<id>.mp4
//
// Urlebird rate-limits (HTTP 429) after ~10 quick requests: requests are spaced
// and retried with a growing pause.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const [cmd, dir, ...args] = process.argv.slice(2);
if (!cmd || !dir) { console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(0, 12).join("\n")); process.exit(1); }
fs.mkdirSync(dir, { recursive: true });
const indexFile = path.join(dir, "index.tsv");

async function urlebird(p) {
  for (let wait = 4000; wait < 120000; wait *= 2) {
    const r = await fetch("https://urlebird.com" + p, { headers: { "user-agent": UA, accept: "text/html", "accept-language": "en-US,en;q=0.9" } });
    if (r.status === 429 || r.status === 503) { await sleep(wait); continue; }
    if (!r.ok) return "";
    const t = await r.text();
    await sleep(2500);
    return t;
  }
  return "";
}

// SnapTik's anti-bot challenge, ported from its core.min.js: AES-CBC decrypt the
// token payload with SHA-256("sn4pt1k_v3r1fy2026:" + id), solve the small puzzle.
function solve(id, p) {
  const buf = Buffer.from(p, "base64");
  const key = crypto.createHash("sha256").update("sn4pt1k_v3r1fy2026:" + id).digest();
  const d = crypto.createDecipheriv("aes-256-cbc", key, buf.subarray(0, 16));
  const A = JSON.parse(Buffer.concat([d.update(buf.subarray(16)), d.final()]).toString());
  const { _e, _h } = A;
  let P;
  switch (A.t) {
    case "b": P = ((A.a ^ A.b) >> A.s) & 255; break;
    case "r": P = A.n.reduce((x, y) => x + y, 0) * 2 + 1; break;
    case "c": P = A.w.charCodeAt(A.i) * A.m; break;
    case "m": P = ((A.a + A.b) % 100) * A.c; break;
    case "n": P = A.a * A.b + A.b * A.c + A.c * A.a - A.a; break;
    default: throw new Error("unknown challenge " + A.t);
  }
  return `${id}:${P}:${_e}:${_h}`;
}

async function extract(handle, id) {
  const h = { "user-agent": UA, "x-requested-with": "XMLHttpRequest", "content-type": "application/json", origin: "https://snaptik.app", referer: "https://snaptik.app/en2" };
  const t = await (await fetch("https://snaptik.app/api/token", { method: "POST", headers: h })).json();
  const url = `https://www.tiktok.com/@${handle}/video/${id}`;
  const r = await fetch("https://snaptik.app/api/extract?url=" + encodeURIComponent(url), { headers: { ...h, "x-verify": solve(t.id, t.p) } });
  return (await r.json()).data;
}

const readIndex = () => (fs.existsSync(indexFile) ? fs.readFileSync(indexFile, "utf8").trim().split("\n").filter(Boolean).map((l) => l.split("\t")) : []);

(async () => {
  if (cmd === "tags") {
    const seen = new Set();
    for (const tag of args) {
      const html = await urlebird(`/hash/${encodeURIComponent(tag)}/`);
      for (const m of html.matchAll(/urlebird\.com\/user\/([^"'\/]+)\//g)) seen.add(m[1]);
      console.log(`#${tag}: ${seen.size} handles so far`);
    }
    fs.writeFileSync(path.join(dir, "handles.txt"), [...seen].join("\n") + "\n");
  } else if (cmd === "users") {
    const rows = readIndex();
    const have = new Set(rows.map((r) => r[2]));
    fs.mkdirSync(path.join(dir, "thumbs"), { recursive: true });
    for (const handle of args) {
      const html = await urlebird(`/user/${handle}/`);
      const m = html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org\/","@type":"ItemList".*?)<\/script>/s);
      if (!m) { console.log(`@${handle}: nothing`); continue; }
      let added = 0;
      for (const e of JSON.parse(m[1]).itemListElement) {
        const id = (e.url.match(/-(\d{15,})\/?$/) || [])[1];
        if (!id || have.has(id)) continue;
        const thumb = Array.isArray(e.thumbnailUrl) ? e.thumbnailUrl[0] : e.thumbnailUrl;
        const dur = (e.duration || "").replace(/^PT/, "").toLowerCase();
        const n = rows.length + 1;
        rows.push([String(n), handle, id, dur, (e.name || "").replace(/\s+/g, " ").slice(0, 80)]);
        have.add(id); added++;
        try { fs.writeFileSync(path.join(dir, "thumbs", `${n}.jpg`), Buffer.from(await (await fetch(thumb, { headers: { "user-agent": UA } })).arrayBuffer())); } catch {}
      }
      fs.writeFileSync(indexFile, rows.map((r) => r.join("\t")).join("\n") + "\n");
      console.log(`@${handle}: +${added} videos (${rows.length} total)`);
    }
  } else if (cmd === "add") {
    // handle/id pairs (e.g. collected in the browser on Urlebird when the PC gets
    // Cloudflare's "Just a moment" page): metadata + thumbnail through SnapTik.
    const rows = readIndex();
    const have = new Set(rows.map((r) => r[2]));
    fs.mkdirSync(path.join(dir, "thumbs"), { recursive: true });
    const list = args.length === 1 && fs.existsSync(args[0]) ? fs.readFileSync(args[0], "utf8").split(/\s+/).filter(Boolean) : args;
    for (const a of list) {
      const [handle, id] = a.split("/");
      if (!id || have.has(id)) continue;
      try {
        const d = await extract(handle, id);
        if (!d || d.type !== "video") continue;
        const n = rows.length + 1;
        rows.push([String(n), handle, id, `${d.videoDuration}s`, (d.title || "").replace(/\s+/g, " ").slice(0, 80)]);
        have.add(id);
        fs.writeFileSync(path.join(dir, "thumbs", `${n}.jpg`), Buffer.from(await (await fetch(d.thumbnail, { headers: { "user-agent": UA } })).arrayBuffer()));
        fs.writeFileSync(indexFile, rows.map((r) => r.join("\t")).join("\n") + "\n");
      } catch (e) { console.log(`${a}: ${e.message}`); }
      await sleep(300);
    }
    console.log(`${rows.length} videos in index`);
  } else if (cmd === "sheet") {
    const FFMPEG = process.env.FFMPEG || "ffmpeg";
    const rows = readIndex();
    const tmp = path.join(dir, "sheet_tmp");
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
    let k = 0;
    for (const [n] of rows) {
      const src = path.join(dir, "thumbs", `${n}.jpg`);
      if (!fs.existsSync(src)) continue;
      try {
        execFileSync(FFMPEG, ["-v", "error", "-y", "-i", src, "-vf", `scale=120:213:force_original_aspect_ratio=increase,crop=120:213,drawtext=fontfile='C\\:/Windows/Fonts/arialbd.ttf':text='${n}':fontcolor=yellow:fontsize=20:x=3:y=3:box=1:boxcolor=black`, path.join(tmp, `${String(k++).padStart(4, "0")}.png`)]);
      } catch {}
    }
    // xstack, not tile: tile over an image sequence of mixed-source PNGs dropped
    // the first ~60 tiles (2026-10-01).
    const files = fs.readdirSync(tmp).sort().map((f) => path.join(tmp, f));
    for (let s = 0; s * 96 < files.length; s++) {
      const part = files.slice(s * 96, s * 96 + 96);
      const layout = part.map((_, i) => `${(i % 16) * 120}_${Math.floor(i / 16) * 213}`).join("|");
      const filter = part.length === 1 ? "[0]null" : part.map((_, i) => `[${i}]`).join("") + `xstack=inputs=${part.length}:layout=${layout}:fill=black`;
      execFileSync(FFMPEG, ["-v", "error", "-y", ...part.flatMap((f) => ["-i", f]), "-filter_complex", filter, "-frames:v", "1", path.join(dir, `sheet${s}.jpg`)]);
      console.log(path.join(dir, `sheet${s}.jpg`));
    }
  } else if (cmd === "get") {
    const rows = readIndex();
    for (const a of args) {
      const [n, handle, id] = a.includes("/") ? ["x", ...a.split("/")] : rows.find((r) => r[0] === a) || [];
      if (!id) { console.log(`${a}: not in index`); continue; }
      try {
        const d = await extract(handle, id);
        if (!d || d.type !== "video") { console.log(`${a}: ${d ? d.type : "no data"}`); continue; }
        const out = path.join(dir, `${n}_${handle}_${id}.mp4`);
        // Prefer SnapTik's HD link: the default downloadUrl is often a 576p copy.
        let url = d.downloadUrl, hd = "";
        if (d.hdDownloadUrl) {
          try {
            // Same handshake as /api/extract: a fresh token, solved, as X-Verify.
            const th = { "user-agent": UA, "x-requested-with": "XMLHttpRequest", "content-type": "application/json", referer: "https://snaptik.app/en2" };
            const tk = await (await fetch("https://snaptik.app/api/token", { method: "POST", headers: th })).json();
            const r = await fetch("https://snaptik.app" + d.hdDownloadUrl, { headers: { ...th, "x-verify": solve(tk.id, tk.p) } });
            const ct = r.headers.get("content-type") || "";
            if (ct.includes("json")) { const j = await r.json(); const u = j.url || j.downloadUrl || j.data?.url || j.data?.downloadUrl; if (u) { url = u.startsWith("/") ? "https://snaptik.app" + u : u; hd = " HD"; } else if (process.env.DEBUG) console.log(JSON.stringify(j).slice(0, 300)); }
            else if (ct.includes("video")) { fs.writeFileSync(out, Buffer.from(await r.arrayBuffer())); console.log(`${out} (${d.videoDuration}s) HD ${d.title.slice(0, 50)}`); continue; }
          } catch {}
        }
        // curl, not fetch: rapidcdn answered Node fetch with "Invalid url" for the same link.
        execFileSync("curl", ["-sL", "--max-time", "120", "-o", out, url]);
        // The HD link sometimes returns an error page; fall back to the normal one.
        const ok = (f) => fs.existsSync(f) && fs.statSync(f).size > 50000 && fs.readFileSync(f).subarray(4, 8).toString() === "ftyp";
        if (!ok(out) && url !== d.downloadUrl) { hd = ""; execFileSync("curl", ["-sL", "--max-time", "120", "-o", out, d.downloadUrl]); }
        if (hd) console.log("  (hd)");
        console.log(`${out} (${d.videoDuration}s) ${d.title.slice(0, 50)}`);
      } catch (e) { console.log(`${a}: ${e.message}`); }
      await sleep(400);
    }
  }
})();

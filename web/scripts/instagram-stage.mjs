/**
 * Stages a batch's rendered slides for the publisher: converts each PNG in
 * content/instagram/out/<post #>/ to JPEG (Instagram's API accepts JPEG only)
 * and uploads it to the public Supabase bucket "instagram" as <post #>/<n>.jpg,
 * removing any old slides a revision left behind. Checks every public URL
 * answers before finishing, because Instagram fetches them at publish time.
 *
 *   npm run ig:stage -- batch-01 [post id ...]
 *
 * Run after ig:render and before a post is approved for publishing.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { repoRoot, supabase } from "./instagram-env.mjs";

const BUCKET = "instagram";
const contentDir = path.join(repoRoot, "content", "instagram");
const [batchArg = "batch-01", ...onlyIds] = process.argv.slice(2);
const batchFile = batchArg.endsWith(".json") ? path.resolve(batchArg) : path.join(contentDir, `${batchArg}.json`);
const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
const posts = batch.posts.filter((post) => onlyIds.length === 0 || onlyIds.includes(post.id));
const { url, headers } = supabase();

for (const post of posts) {
  const dir = path.join(contentDir, "out", post.id);
  const pngs = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)) : [];
  if (pngs.length === 0) throw new Error(`${post.id}: nothing rendered, run npm run ig:render -- ${batch.batch} ${post.id}`);
  if (pngs.length > 10) throw new Error(`${post.id}: ${pngs.length} slides, Instagram allows 10`);

  const keep = new Set();
  for (const png of pngs) {
    const name = png.replace(/\.png$/, ".jpg");
    keep.add(name);
    const jpeg = await sharp(path.join(dir, png)).flatten({ background: "#F7F7F4" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${post.id}/${name}`, {
      method: "POST",
      headers: { ...headers, "content-type": "image/jpeg", "x-upsert": "true", "cache-control": "no-cache" },
      body: jpeg,
    });
    if (!res.ok) throw new Error(`${post.id}/${name} upload failed (${res.status}): ${await res.text()}`);
  }

  const listed = await fetch(`${url}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ prefix: post.id, limit: 100 }),
  }).then((r) => r.json());
  const stale = (Array.isArray(listed) ? listed : []).map((f) => f.name).filter((name) => !keep.has(name));
  if (stale.length) {
    await fetch(`${url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ prefixes: stale.map((name) => `${post.id}/${name}`) }),
    });
  }

  for (const name of keep) {
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${post.id}/${name}`;
    const check = await fetch(publicUrl, { method: "HEAD" });
    if (!check.ok) throw new Error(`${publicUrl} is not publicly reachable (${check.status})`);
  }
  console.log(`${post.id}: ${keep.size} slides staged${stale.length ? `, ${stale.length} old removed` : ""}`);
}

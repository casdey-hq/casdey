/**
 * Uploads rendered Instagram posts to Google Drive, where Davide reviews them
 * (content-plan.md, "How posts get made, reviewed and tracked").
 *
 *   node scripts/instagram-drive-upload.mjs [batch] [post id ...]
 *   npm run ig:drive -- batch-01
 *
 * Layout, all owned by info@casdey.com:
 *   casdey Instagram / <batch>, from <first planned date> / <id> <format>, <pillar> /
 *     1.png, 2.png ... and caption.txt
 *
 * Re-running a post trashes that folder's old files and uploads the current
 * render, so a revision never leaves stale slides behind. Folder ids and links
 * go to content/instagram/out/drive.json, which `npm run ig:sync` reads to link
 * each post in the IG Content tab.
 *
 * Auth: the local `gws` CLI, signed in as info@casdey.com (`gws auth login`).
 * Not the outreach service account, because a service account has no Drive
 * storage of its own and cannot own uploaded files. The CLI's Google Cloud
 * project is still in Testing mode, so that login lapses after about 7 days
 * (found 2026-09-13: `invalid_grant`); run `gws auth login` again when it does.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const contentDir = path.join(repoRoot, "content", "instagram");
const ROOT_FOLDER = "casdey Instagram";
const FOLDER = "application/vnd.google-apps.folder";

const [batchArg = "batch-01", ...onlyIds] = process.argv.slice(2);
const batchFile = batchArg.endsWith(".json") ? path.resolve(batchArg) : path.join(contentDir, `${batchArg}.json`);
const batch = JSON.parse(fs.readFileSync(batchFile, "utf8"));
const posts = batch.posts.filter((post) => onlyIds.length === 0 || onlyIds.includes(post.id));

async function accessToken() {
  let raw;
  try {
    // --unmasked, or the export prints shortened placeholders and Google answers
    // `invalid_client` (found 2026-09-13). The values stay in this process.
    raw = execSync("gws auth export --unmasked", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    throw new Error("gws is not signed in. Run `gws auth login` and choose info@casdey.com.");
  }
  const creds = JSON.parse(raw.slice(raw.indexOf("{")));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: creds.client_id, client_secret: creds.client_secret, refresh_token: creds.refresh_token, grant_type: "refresh_token" }),
  }).then((r) => r.json());
  if (!res.access_token) {
    throw new Error(`Google refused the gws login (${res.error ?? "unknown"}). Run \`gws auth login\` again as info@casdey.com.`);
  }
  return res.access_token;
}

const token = await accessToken();
async function drive(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const body = await res.json();
  if (!res.ok) throw new Error(`Drive ${res.status}: ${body.error?.message ?? JSON.stringify(body)}`);
  return body;
}

const quote = (s) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
async function folder(name, parent) {
  const q = `name='${quote(name)}' and mimeType='${FOLDER}' and trashed=false and '${parent}' in parents`;
  const found = await drive(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`);
  if (found.files?.length) return found.files[0].id;
  const created = await drive("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER, parents: [parent] }),
  });
  return created.id;
}

async function upload(name, mimeType, bytes, parent) {
  const boundary = `casdey${Date.now()}`;
  const head = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parent] })}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const body = Buffer.concat([Buffer.from(head), bytes, Buffer.from(`\r\n--${boundary}--`)]);
  return drive("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

const mapFile = path.join(contentDir, "out", "drive.json");
const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : { posts: {}, batches: {} };
const link = (id) => `https://drive.google.com/drive/folders/${id}`;

const rootId = await folder(ROOT_FOLDER, "root");
const firstDate = batch.posts.map((p) => p.planned).sort()[0];
const batchId = await folder(`${batch.batch}, from ${firstDate}`, rootId);
map.root = link(rootId);
map.batches = { ...map.batches, [batch.batch]: link(batchId) };

for (const post of posts) {
  const slidesDir = path.join(contentDir, "out", post.id);
  const images = fs.existsSync(slidesDir)
    ? fs.readdirSync(slidesDir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))
    : [];
  if (images.length === 0) throw new Error(`${post.id}: nothing rendered yet, run npm run ig:render -- ${batch.batch} ${post.id}`);

  const postId = await folder(`${post.id} ${post.format}, ${post.pillar}`, batchId);
  const old = await drive(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${postId}' in parents and trashed=false`)}&fields=files(id)`);
  for (const file of old.files ?? []) {
    await drive(`https://www.googleapis.com/drive/v3/files/${file.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
  }
  for (const image of images) {
    await upload(image, "image/png", fs.readFileSync(path.join(slidesDir, image)), postId);
  }
  await upload("caption.txt", "text/plain", Buffer.from(post.caption ?? "", "utf8"), postId);

  map.posts[post.id] = { folderId: postId, link: link(postId) };
  console.log(`${post.id}: ${images.length} slides + caption -> ${link(postId)}`);
}

fs.writeFileSync(mapFile, JSON.stringify(map, null, 2));
console.log(`\nBatch folder: ${map.batches[batch.batch]}`);

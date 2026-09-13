/**
 * Shared bits for the Instagram scripts: web/.env.local loading (process.env
 * wins, so a cloud run can pass real env vars) and the AES-256-GCM format the
 * app's src/lib/calendar/tokens.ts uses, base64 of iv || tag || ciphertext, so
 * a token encrypted here decrypts in the app.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const webDir = path.resolve(here, "..");
export const repoRoot = path.resolve(webDir, "..");

export function env(name) {
  if (process.env[name]) return process.env[name];
  const file = path.join(webDir, ".env.local");
  if (!fs.existsSync(file)) return undefined;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match && match[1] === name) return match[2].replace(/^["']|["']$/g, "");
  }
  return undefined;
}

export function required(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} is not set (web/.env.local or the environment)`);
  return value;
}

export function encryptToken(plaintext) {
  const key = Buffer.from(required("CALENDAR_TOKEN_KEY"), "base64");
  if (key.length !== 32) throw new Error("CALENDAR_TOKEN_KEY must decode to 32 bytes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function supabase() {
  const url = required("SUPABASE_URL").replace(/\/+$/, "");
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

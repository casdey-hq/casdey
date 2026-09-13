import "server-only";

import { decryptToken, encryptToken } from "./calendar/tokens";
import { supabaseAdmin } from "./supabase";

/**
 * casdey's own Instagram account, through Instagram's official API with
 * Instagram Login (content-plan.md). Publishes approved posts and reads the
 * weekly numbers. The Meta app is "casdey publisher" (Standard Access, own
 * account only, so no app review), and the account is connected as an
 * Instagram Tester on it.
 *
 * The token is never logged: requests carry it in the query or form body, and
 * errors only ever report Meta's message.
 */

const GRAPH = "https://graph.instagram.com/v25.0";
export const INSTAGRAM_BUCKET = "instagram";
/** Tokens last 60 days; renewing weekly leaves wide margin for missed runs. */
const REFRESH_AFTER_MS = 7 * 86_400_000;

export type InstagramAccount = { igUserId: string; username: string; token: string; tokenRefreshedAt: Date };

type GraphError = { error?: { message?: string; code?: number } };

async function graph<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "GET"): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  let body: URLSearchParams | undefined;
  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  } else {
    body = new URLSearchParams(params);
  }
  const response = await fetch(url, { method, body, cache: "no-store" });
  const json = (await response.json()) as T & GraphError;
  if (!response.ok || json.error) {
    throw new Error(`Instagram ${path.split("?")[0]}: ${json.error?.message ?? response.status}`);
  }
  return json;
}

export async function loadAccount(): Promise<InstagramAccount | null> {
  const { data, error } = await supabaseAdmin()
    .from("instagram_account")
    .select("ig_user_id, username, access_token_encrypted, token_refreshed_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`instagram_account read failed: ${error.message}`);
  if (!data) return null;
  return {
    igUserId: data.ig_user_id,
    username: data.username,
    token: decryptToken(data.access_token_encrypted),
    tokenRefreshedAt: new Date(data.token_refreshed_at),
  };
}

/** Renews the 60-day token once a week and saves the renewed one. */
export async function refreshTokenIfDue(account: InstagramAccount, now: Date): Promise<InstagramAccount> {
  if (now.getTime() - account.tokenRefreshedAt.getTime() < REFRESH_AFTER_MS) return account;
  const renewed = await graph<{ access_token: string }>("refresh_access_token", {
    grant_type: "ig_refresh_token",
    access_token: account.token,
  });
  const { error } = await supabaseAdmin()
    .from("instagram_account")
    .update({ access_token_encrypted: encryptToken(renewed.access_token), token_refreshed_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("id", 1);
  if (error) throw new Error(`instagram_account token save failed: ${error.message}`);
  return { ...account, token: renewed.access_token, tokenRefreshedAt: now };
}

/** Public URLs of a post's staged slides, in slide order. */
export async function stagedSlideUrls(postId: string): Promise<string[]> {
  const storage = supabaseAdmin().storage.from(INSTAGRAM_BUCKET);
  const { data, error } = await storage.list(postId, { limit: 100 });
  if (error) throw new Error(`storage list ${postId} failed: ${error.message}`);
  return (data ?? [])
    .map((file) => file.name)
    .filter((name) => /^\d+\.jpg$/.test(name))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((name) => storage.getPublicUrl(`${postId}/${name}`).data.publicUrl);
}

export type StagedReel = { videoUrl: string; coverUrl: string | null };

/** Public URLs of a post's staged reel and cover, or null if it has none. */
export async function stagedReel(postId: string): Promise<StagedReel | null> {
  const storage = supabaseAdmin().storage.from(INSTAGRAM_BUCKET);
  const { data, error } = await storage.list(postId, { limit: 100 });
  if (error) throw new Error(`storage list ${postId} failed: ${error.message}`);
  const names = new Set((data ?? []).map((file) => file.name));
  if (!names.has("reel.mp4")) return null;
  const url = (name: string) => storage.getPublicUrl(`${postId}/${name}`).data.publicUrl;
  return { videoUrl: url("reel.mp4"), coverUrl: names.has("cover.jpg") ? url("cover.jpg") : null };
}

async function waitUntilFinished(account: InstagramAccount, containerId: string, deadline: number, pollMs = 2500): Promise<void> {
  for (;;) {
    const { status_code } = await graph<{ status_code?: string }>(containerId, { fields: "status_code", access_token: account.token });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`container ${containerId} ${status_code}`);
    if (Date.now() > deadline) throw new Error(`container ${containerId} still ${status_code ?? "unknown"} at deadline`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

async function publishContainer(account: InstagramAccount, creationId: string): Promise<string> {
  const published = await graph<{ id: string }>(`${account.igUserId}/media_publish`, { creation_id: creationId, access_token: account.token }, "POST");
  const { permalink } = await graph<{ permalink?: string }>(published.id, { fields: "permalink", access_token: account.token });
  return permalink ?? `https://www.instagram.com/${account.username}/`;
}

/**
 * Publishes a reel, shared to the feed as well as the Reels tab. Instagram
 * downloads and transcodes the video before the container is ready, which
 * takes far longer than an image, so it is polled more patiently.
 */
export async function publishReel(account: InstagramAccount, reel: StagedReel, caption: string, deadline: number): Promise<string> {
  const params: Record<string, string> = {
    media_type: "REELS",
    video_url: reel.videoUrl,
    caption,
    share_to_feed: "true",
    access_token: account.token,
  };
  if (reel.coverUrl) params.cover_url = reel.coverUrl;
  const { id } = await graph<{ id: string }>(`${account.igUserId}/media`, params, "POST");
  await waitUntilFinished(account, id, deadline, 8000);
  return publishContainer(account, id);
}

/**
 * Publishes one post: a single image, or a carousel of 2 to 10. Returns the
 * post's permalink. Slides must be public JPEG URLs.
 */
export async function publishPost(account: InstagramAccount, slideUrls: string[], caption: string, deadline: number): Promise<string> {
  if (slideUrls.length === 0) throw new Error("no slides to publish");
  if (slideUrls.length > 10) throw new Error(`${slideUrls.length} slides, Instagram allows 10`);
  const media = `${account.igUserId}/media`;

  let creationId: string;
  if (slideUrls.length === 1) {
    ({ id: creationId } = await graph<{ id: string }>(media, { image_url: slideUrls[0], caption, access_token: account.token }, "POST"));
  } else {
    const children: string[] = [];
    for (const imageUrl of slideUrls) {
      const child = await graph<{ id: string }>(media, { image_url: imageUrl, is_carousel_item: "true", access_token: account.token }, "POST");
      children.push(child.id);
    }
    ({ id: creationId } = await graph<{ id: string }>(
      media,
      { media_type: "CAROUSEL", children: children.join(","), caption, access_token: account.token },
      "POST",
    ));
  }

  await waitUntilFinished(account, creationId, deadline);
  return publishContainer(account, creationId);
}

export type WeeklyNumbers = { followers: number; reach: number | null; accountsEngaged: number | null };

/** Followers now, plus accounts reached and engaged over the last 7 days. */
export async function weeklyNumbers(account: InstagramAccount, now: Date): Promise<WeeklyNumbers> {
  const me = await graph<{ followers_count?: number }>("me", { fields: "followers_count", access_token: account.token });
  const until = Math.floor(now.getTime() / 1000);
  const since = until - 7 * 86_400;
  let reach: number | null = null;
  let accountsEngaged: number | null = null;
  try {
    const insights = await graph<{ data?: { name: string; total_value?: { value?: number } }[] }>(`${account.igUserId}/insights`, {
      metric: "reach,accounts_engaged",
      period: "day",
      metric_type: "total_value",
      since: String(since),
      until: String(until),
      access_token: account.token,
    });
    for (const metric of insights.data ?? []) {
      if (metric.name === "reach") reach = metric.total_value?.value ?? null;
      if (metric.name === "accounts_engaged") accountsEngaged = metric.total_value?.value ?? null;
    }
  } catch (error) {
    // A brand-new account can have no insights yet; followers still count.
    console.error("[instagram] insights unavailable", error instanceof Error ? error.message : error);
  }
  return { followers: me.followers_count ?? 0, reach, accountsEngaged };
}

import type { NextRequest } from "next/server";

import { appendRow, readRange, sheetsWriteToken, writeRange } from "@/lib/google-sheets";
import { loadAccount, publishPost, publishReel, refreshTokenIfDue, stagedReel, stagedSlideUrls, weeklyNumbers } from "@/lib/instagram";
import { duePosts, isReel, romeDate, weeklyRowDue } from "@/lib/instagram-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby's ceiling with Fluid compute. A reel waits on Instagram to fetch
// and transcode the video, which can take minutes.
export const maxDuration = 300;

/**
 * The daily Instagram job (content-plan.md). Scheduled for 10:30 UTC, 12:30 in
 * Italy during summer time; Vercel Hobby runs a daily cron somewhere inside that
 * hour. Separate from /api/cron/send so an Instagram outage can never touch
 * member email.
 *
 * 1. Renews the account token once a week.
 * 2. Publishes every IG Content row that Davide marked Approved and whose
 *    planned date has come, and writes back the posted date and link.
 * 3. On Saturday (Sunday as catch-up), appends the week's IG Weekly row.
 *
 * A post's Status goes to "Publishing" BEFORE Instagram is called. If the run
 * is cut off after Instagram accepted the post, the row is left Publishing and
 * never retried, so a timeout can never post the same thing twice. A genuine
 * failure sets "Failed"; putting it back to Approved retries it.
 *
 * Locally:
 *   curl -X POST localhost:3000/api/cron/instagram -H "authorization: Bearer $CRON_SECRET"
 */

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get("authorization") ?? "") === `Bearer ${secret}`;
}

/** Stop starting new posts after this, leaving time to finish one and write back. */
const START_BUDGET_MS = 120_000;
/** Give up waiting on Instagram here, with time left to mark the row Failed. */
const PUBLISH_DEADLINE_MS = 270_000;

async function run(request: NextRequest): Promise<Response> {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const started = Date.now();
  const now = new Date();
  const today = romeDate(now);
  const result: { ok: boolean; today: string; published: { id: string; link: string }[]; weekly?: unknown; errors: string[] } = {
    ok: true,
    today,
    published: [],
    errors: [],
  };
  const fail = (what: string, error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[cron] instagram ${what}`, detail);
    result.ok = false;
    result.errors.push(`${what}: ${detail}`);
  };

  let account = await loadAccount().catch((error) => {
    fail("account", error);
    return null;
  });
  if (!account) {
    if (result.ok) result.errors.push("no Instagram account connected (npm run ig:token)");
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }

  try {
    account = await refreshTokenIfDue(account, now);
  } catch (error) {
    // The current token still works for weeks; publish anyway and say so.
    fail("token refresh", error);
  }

  let sheetToken: string;
  try {
    sheetToken = await sheetsWriteToken();
  } catch (error) {
    fail("sheet auth", error);
    return Response.json(result, { status: 500 });
  }

  try {
    const rows = await readRange(sheetToken, "IG Content!A2:L2000");
    for (const post of duePosts(rows, today)) {
      if (Date.now() - started > START_BUDGET_MS) break;
      await writeRange(sheetToken, `IG Content!I${post.rowNumber}`, [["Publishing"]]);
      try {
        let link: string;
        if (isReel(post)) {
          const reel = await stagedReel(post.id);
          if (!reel) throw new Error(`no staged reel for post ${post.id} (npm run ig:stage)`);
          link = await publishReel(account, reel, post.caption, started + PUBLISH_DEADLINE_MS);
        } else {
          const slides = await stagedSlideUrls(post.id);
          if (slides.length === 0) throw new Error(`no staged slides for post ${post.id} (npm run ig:stage)`);
          link = await publishPost(account, slides, post.caption, started + PUBLISH_DEADLINE_MS);
        }
        await writeRange(sheetToken, `IG Content!I${post.rowNumber}`, [["Posted"]]);
        await writeRange(sheetToken, `IG Content!K${post.rowNumber}:L${post.rowNumber}`, [[today, link]]);
        result.published.push({ id: post.id, link });
      } catch (error) {
        await writeRange(sheetToken, `IG Content!I${post.rowNumber}`, [["Failed"]]).catch(() => undefined);
        fail(`post ${post.id}`, error);
      }
    }
  } catch (error) {
    fail("publishing", error);
  }

  try {
    const weeklyRows = await readRange(sheetToken, "IG Weekly!A2:E500");
    const sunday = weeklyRowDue(weeklyRows, today);
    if (sunday) {
      const numbers = await weeklyNumbers(account, now);
      await appendRow(sheetToken, "IG Weekly!A:E", [
        sunday,
        String(numbers.followers),
        numbers.reach === null ? "" : String(numbers.reach),
        numbers.accountsEngaged === null ? "" : String(numbers.accountsEngaged),
        "written by the publisher",
      ]);
      result.weekly = { sunday, ...numbers };
    }
  } catch (error) {
    fail("weekly numbers", error);
  }

  if (result.published.length > 0) console.log("[cron] instagram published", JSON.stringify(result.published));
  return Response.json(result, { status: result.ok ? 200 : 500 });
}

export const GET = run;
export const POST = run;

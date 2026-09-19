import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The drain loop against a fake database, for the one behaviour the send
 * window added: a gym outside its daytime is set aside without its rows being
 * claimed, and that does not stop the run from reaching other gyms' rows.
 *
 * The fake is a chainable stand-in for the Supabase query builder. It answers
 * only what drainQueue asks before a message would actually be composed, which
 * is enough here: the gym in its daytime is on a plan that cannot send, so its
 * row is claimed and then held, and nothing is ever sent.
 */

type Row = { id: string; gym_id: string };

const state = {
  queue: [] as Row[],
  gyms: {} as Record<string, { id: string; timezone: string }>,
  claimed: [] as string[],
};

function builder(table: string) {
  const st: {
    op: "select" | "update";
    id?: string;
    excluded: string[];
    limit?: number;
  } = { op: "select", excluded: [] };

  const resolve = () => {
    if (table === "campaign_messages" && st.op === "select") {
      const due = state.queue.filter(
        (row) => !state.claimed.includes(row.id) && !st.excluded.includes(row.gym_id),
      );
      return {
        data: due.slice(0, st.limit ?? due.length).map((row) => ({
          ...row,
          campaign_id: "c1",
          member_id: `m-${row.id}`,
          to_email: `${row.id}@example.com`,
          unsubscribe_token: "t",
          attempts: 0,
          step: 0,
        })),
        count: 0,
        error: null,
      };
    }
    if (table === "campaign_messages" && st.op === "update" && st.id) {
      // The claim, and later the hold, both update by id. Only the first is
      // a claim; recording it once is what the assertions need.
      if (!state.claimed.includes(st.id)) state.claimed.push(st.id);
      return { data: { id: st.id }, error: null };
    }
    if (table === "gyms" && st.id) {
      return { data: state.gyms[st.id] ?? null, error: null };
    }
    return { data: null, count: 0, error: null };
  };

  const b: Record<string, unknown> = {
    select: () => b,
    update: () => {
      st.op = "update";
      return b;
    },
    eq: (column: string, value: string) => {
      if (column === "id") st.id = value;
      return b;
    },
    not: (_column: string, _op: string, list: string) => {
      st.excluded = list.replace(/[()]/g, "").split(",");
      return b;
    },
    limit: (n: number) => {
      st.limit = n;
      return b;
    },
    maybeSingle: () => Promise.resolve(resolve()),
    then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).then(ok, bad),
  };
  for (const name of ["lte", "gte", "in", "is", "order", "insert"]) {
    b[name] = () => b;
  }
  return b;
}

vi.mock("./supabase", () => ({
  supabaseAdmin: () => ({ from: (table: string) => builder(table) }),
}));
vi.mock("./reasons", () => ({ gymReasons: async () => [] }));
vi.mock("./messaging", () => ({
  emailProvider: () => ({}),
  bookingUrl: () => "",
  unsubscribeUrl: () => "",
}));
// The gym in its daytime cannot send, so its claimed row is held rather than
// composed. That keeps the test on the loop and off the whole send path.
vi.mock("./plan", () => ({ capabilities: () => ({ canSendCampaigns: false }) }));

const { drainQueue } = await import("./sender");

// 08:30 UTC: 09:30 in Dublin, 01:30 in Los Angeles.
const MORNING_IN_DUBLIN = Date.parse("2026-09-19T08:30:00Z");

describe("drainQueue and the send window", () => {
  beforeEach(() => {
    state.claimed = [];
    state.gyms = {
      la: { id: "la", timezone: "America/Los_Angeles" },
      dub: { id: "dub", timezone: "Europe/Dublin" },
    };
  });

  it("never claims a row for a gym outside its daytime", async () => {
    state.queue = [
      { id: "la-1", gym_id: "la" },
      { id: "la-2", gym_id: "la" },
    ];
    const report = await drainQueue(25, { now: () => MORNING_IN_DUBLIN });
    expect(state.claimed).toEqual([]);
    expect(report.sent).toBe(0);
  });

  it("reaches the next gym when the first page is all one resting gym", async () => {
    // A page of two, both Los Angeles, with Dublin's row behind them. Counting
    // only claims as progress would end the run after the first page.
    state.queue = [
      { id: "la-1", gym_id: "la" },
      { id: "la-2", gym_id: "la" },
      { id: "dub-1", gym_id: "dub" },
    ];
    await drainQueue(2, { now: () => MORNING_IN_DUBLIN });
    expect(state.claimed).toEqual(["dub-1"]);
  });

  it("sends the same gym later in the day, once it is morning there", async () => {
    state.queue = [{ id: "la-1", gym_id: "la" }];
    // 16:30 UTC is 09:30 in Los Angeles.
    await drainQueue(25, { now: () => Date.parse("2026-09-19T16:30:00Z") });
    expect(state.claimed).toEqual(["la-1"]);
  });
});

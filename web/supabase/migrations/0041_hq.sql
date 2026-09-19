-- 0041: casdey's own business view, in /admin (2026-09-19, IMPROVEMENTS.md #2 and #4).
--
-- Before this, the business lived in four places that each went stale on
-- their own clock: /admin (live), the casdey HQ Google Doc and the Marketing
-- Plan Google Doc (pushed by hand), and the check-up artifact (weekly). The
-- same numbers appeared in three of them at different moments. /admin is now
-- the one place: numbers are computed live, and everything that is written
-- rather than computed lives here, so an edit shows the moment it is saved.
--
-- These tables are casdey's, not any gym's. No gym_id, and no RLS policy at
-- all: only the service role reads or writes them, from /admin (itself gated
-- to casdey's founder in src/lib/admin.ts) and from scripts/hq.mjs.
--
-- Grants are explicit. 0029 and 0031 once created tables with RLS and no
-- grants, which made two shipped features invisible (fixed by 0032), and
-- Supabase gives anon and authenticated REFERENCES/TRIGGER/TRUNCATE on new
-- tables by default, which RLS does not govern (the lesson from 0039).

begin;

-- Written text: the marketing plan, the offer, the Sunday analysis. One row
-- per key, overwritten in place, so there is only ever one current version.
create table public.hq_notes (
  key         text primary key check (key ~ '^[a-z0-9_]{1,64}$'),
  title       text not null,
  body        text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  text not null default 'davide'
);

-- What Davide does, what the AI does, and what they do together.
create table public.hq_inputs (
  id          uuid primary key default gen_random_uuid(),
  owner       text not null check (owner in ('davide', 'ai', 'together')),
  label       text not null check (length(label) between 1 and 300),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Goals, set by Davide in the Sunday review. `metric` names a figure /admin
-- can compute live, so progress is shown rather than typed; null means the
-- goal is judged by hand.
create table public.hq_goals (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (length(label) between 1 and 300),
  metric      text check (metric in ('engaged_rate_week', 'paying_gyms', 'reply_rate_week')),
  target      numeric,
  unit        text check (unit in ('percent', 'count')),
  deadline    date,
  status      text not null default 'active'
              check (status in ('active', 'hit', 'missed', 'retired')),
  note        text,
  set_at      timestamptz not null default now(),
  closed_at   timestamptz
);

-- To-dos. Three kinds share the table:
--   - added by hand (Davide in /admin, or Claude with scripts/hq.mjs);
--   - proposed by the Sunday check-up (status 'proposed' until accepted);
--   - live signals (an interested gym, an overdue test review), which are
--     computed on every page load and only get a row here once Davide acts
--     on one, keyed by `signal_key`, so a ticked signal stays ticked.
create table public.hq_todos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 300),
  detail      text,
  link        text,
  source      text not null default 'manual'
              check (source in ('manual', 'claude', 'checkup', 'signal')),
  status      text not null default 'open'
              check (status in ('proposed', 'open', 'done', 'dismissed')),
  signal_key  text unique,
  due         date,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create index hq_todos_status_idx on public.hq_todos (status, created_at desc);

-- What casdey pays each month, for the Business tab's per-gym economics and
-- break-even. Money is per month in euros, since that is what those
-- calculations are in; `basis` says what the number is when it is not a flat
-- fee (prepaid, per message, a percentage).
create table public.hq_costs (
  id               uuid primary key default gen_random_uuid(),
  service          text not null,
  purpose          text not null,
  monthly_eur      numeric not null default 0,
  basis            text,
  when_it_matters  text,
  position         integer not null default 0
);

alter table public.hq_notes  enable row level security;
alter table public.hq_inputs enable row level security;
alter table public.hq_goals  enable row level security;
alter table public.hq_todos  enable row level security;
alter table public.hq_costs  enable row level security;

revoke all on public.hq_notes, public.hq_inputs, public.hq_goals,
  public.hq_todos, public.hq_costs from anon, authenticated;
grant select, insert, update, delete on public.hq_notes, public.hq_inputs,
  public.hq_goals, public.hq_todos, public.hq_costs to service_role;

commit;

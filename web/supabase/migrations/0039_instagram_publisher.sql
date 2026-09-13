-- The Instagram publisher (content-plan.md at the repo root).
--
-- casdey's own marketing account, casdey.co, is posted to by a daily cron
-- (/api/cron/instagram) through Instagram's official API. Two things live here:
--
-- 1. instagram_account: one row, the account and its access token. The token
--    is encrypted at rest with the same AES-256-GCM helper and key as the
--    Google Calendar tokens (src/lib/calendar/tokens.ts, CALENDAR_TOKEN_KEY),
--    because it is the same kind of secret: a long-lived key that can post as
--    someone. It lasts 60 days and the cron renews it weekly, which is why it
--    is in the database rather than an environment variable, where a renewed
--    token could not be saved. RLS on, no policies, service_role only: no
--    signed-in user of the product ever reads it.
--
-- 2. The public "instagram" storage bucket. Instagram fetches each slide from a
--    public URL at publish time and accepts JPEG only, so `npm run ig:stage`
--    uploads slides here as <post #>/<n>.jpg. Nothing private goes in it: these
--    are marketing images meant to be public minutes later.

create table public.instagram_account (
  id smallint primary key default 1 check (id = 1),
  ig_user_id text not null,
  username text not null,
  access_token_encrypted text not null,
  token_refreshed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.instagram_account enable row level security;

-- Supabase's default privileges hand anon and authenticated REFERENCES,
-- TRIGGER and TRUNCATE on every new table, and RLS does not govern TRUNCATE.
-- Nothing but the service role has any business near this row.
revoke all on public.instagram_account from anon, authenticated;
grant select, insert, update, delete on public.instagram_account to service_role;

insert into storage.buckets (id, name, public)
values ('instagram', 'instagram', true)
on conflict (id) do nothing;

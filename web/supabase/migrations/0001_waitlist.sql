-- Casdey part 2: the glow-up app waitlist.
-- Server-only table: RLS on with no policies, so only the service role
-- (the /api/waitlist route) can touch it. Grants are explicit because a table
-- created this way is otherwise invisible to the service role client.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  goal text check (goal in ('body', 'face', 'style', 'discipline')),
  country text,
  source text,
  created_at timestamptz not null default now(),
  confirmation_sent_at timestamptz
);
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;
grant select, insert, update on public.waitlist to service_role;

-- Make PostgREST see the new table right away.
notify pgrst, 'reload schema';

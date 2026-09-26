-- The API lowercases emails before inserting, so a plain unique constraint on
-- email is enough, and PostgREST's on_conflict=email can target it (it cannot
-- target the lower(email) expression index from 0001).
drop index if exists public.waitlist_email_key;
alter table public.waitlist add constraint waitlist_email_lowercase check (email = lower(email));
alter table public.waitlist add constraint waitlist_email_unique unique (email);
notify pgrst, 'reload schema';

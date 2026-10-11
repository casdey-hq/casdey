-- The paid 90-day plan (2026-10-11): Stripe Checkout starts a 7-day trial,
-- the welcome page records it on the analysis row, and Davide writes the
-- plan by hand from the row's answers and levers.
alter table public.analyses add column if not exists plan_status text;
alter table public.analyses add column if not exists plan_interval text;
alter table public.analyses add column if not exists plan_started_at timestamptz;
alter table public.analyses add column if not exists stripe_session_id text;
alter table public.analyses add column if not exists stripe_customer_id text;
alter table public.analyses add column if not exists stripe_subscription_id text;
notify pgrst, 'reload schema';

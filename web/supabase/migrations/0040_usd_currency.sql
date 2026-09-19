-- 0040: US market (2026-09-19). Dollars become a currency casdey can bill in.
--
-- Three columns only accepted 'gbp' or 'eur'. The first US gym to pay would
-- have had its payment row refused by subscription_payments, and its
-- plan_currency refused by gyms, so the webhook would have failed on money that
-- had already left the gym's card. trial_penalties is unused since the
-- 2026-09-12 redesign but is widened too, so no currency column in the schema
-- disagrees with src/lib/countries.ts.
--
-- gyms keeps its pre-pivot constraint name (practices_...), renamed here to
-- match the table while it is being replaced anyway.

begin;

alter table public.gyms
  drop constraint if exists practices_plan_currency_check;
alter table public.gyms
  drop constraint if exists gyms_plan_currency_check;
alter table public.gyms
  add constraint gyms_plan_currency_check
  check (plan_currency in ('gbp', 'eur', 'usd'));

alter table public.subscription_payments
  drop constraint if exists subscription_payments_currency_check;
alter table public.subscription_payments
  add constraint subscription_payments_currency_check
  check (currency in ('gbp', 'eur', 'usd'));

alter table public.trial_penalties
  drop constraint if exists trial_penalties_currency_check;
alter table public.trial_penalties
  add constraint trial_penalties_currency_check
  check (currency in ('gbp', 'eur', 'usd'));

commit;

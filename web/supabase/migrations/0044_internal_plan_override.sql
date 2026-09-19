-- A casdey-owned gym can be granted Standard or Pro without a Stripe
-- subscription. This is deliberately a separate field from plan_tier: Stripe
-- continues to record the tier a customer pays for, while this override is an
-- operator decision that must survive every Stripe webhook.

alter table public.gyms
  add column if not exists internal_plan_tier text
    check (internal_plan_tier is null or internal_plan_tier in ('standard', 'pro'));

comment on column public.gyms.internal_plan_tier is
  'Manual Standard or Pro grant for a casdey-owned account. Takes precedence over Stripe-derived plan_tier and is set only by an operator.';

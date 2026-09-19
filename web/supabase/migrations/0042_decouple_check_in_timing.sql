-- A check-in campaign has its own timing. A gym can choose to check in after
-- the point where it calls a member lapsed, so the two audiences may overlap.
-- This replaces the old constraint that forced the check-in day to be shorter
-- than the lapse window.

alter table public.gyms
  drop constraint if exists gyms_at_risk_before_lapse;

alter table public.gyms
  drop constraint if exists gyms_at_risk_after_days_check;

alter table public.gyms
  add constraint gyms_at_risk_after_days_check
    check (at_risk_after_days between 7 and 1825);

comment on column public.gyms.at_risk_after_days is
  'Days since a still-active member last visited before they enter the check-in campaign. This timing is independent from the lapse window, so the check-in and win-back audiences may overlap.';

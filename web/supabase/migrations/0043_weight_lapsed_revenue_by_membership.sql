-- A service price alone cannot say how representative that service is. The
-- gym can optionally record how many current members are on each recurring
-- membership, so the lapsed-revenue estimate can use a weighted monthly value.
-- Null means unknown and deliberately keeps the conservative median fallback.

alter table public.services
  add column active_member_count integer
    check (active_member_count is null or active_member_count between 0 and 100000);

comment on column public.services.active_member_count is
  'Current members on this recurring membership. When every active recurring service has a count, casdey uses the counts to weight the lapsed-revenue estimate. Null means unknown and uses the median-price fallback.';

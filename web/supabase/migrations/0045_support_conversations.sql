-- In-product support threads.  The old feedback table remains for product
-- feedback; support needs a replyable, durable conversation instead.

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms(id) on delete cascade,
  author_email text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists support_conversations_recent_idx
  on public.support_conversations (last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('gym', 'support')),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_idx
  on public.support_messages (conversation_id, created_at asc);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_conversations_select on public.support_conversations;
create policy support_conversations_select on public.support_conversations
  for select to authenticated
  using (public.is_gym_user(gym_id));

drop policy if exists support_messages_select on public.support_messages;
create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.support_conversations conversation
      where conversation.id = conversation_id
        and public.is_gym_user(conversation.gym_id)
    )
  );

grant select, insert, update on public.support_conversations to service_role;
grant select, insert on public.support_messages to service_role;
grant select on public.support_conversations, public.support_messages to authenticated;

comment on table public.support_conversations is
  'One in-product support conversation per gym. Davide replies from casdey HQ.';

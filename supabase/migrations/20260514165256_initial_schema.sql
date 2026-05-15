-- ============================================================
-- Ripple Chat — Initial Schema
-- ============================================================
-- Run via Supabase CLI:
--   supabase db push
--
-- Or paste directly into the Supabase SQL editor.
--
-- Tables:
--   profiles                    — public display data linked to auth.users
--   conversations               — direct (and future group) threads
--   conversation_participants   — membership + per-user unread counts
--   messages                    — message rows with soft-delete
--
-- Design notes:
--   • RLS uses a SECURITY DEFINER helper (is_conversation_member) to
--     avoid infinite recursion when policies query their own table.
--   • last_message / last_message_at on conversations are kept in sync
--     by DB triggers rather than client-side updates.
--   • Unread counts are incremented by trigger and reset via RPC.
--   • Realtime is enabled on all three core tables.
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================
-- One row per auth user. Created automatically on sign-up.
-- username is used for the new-conversation search/picker.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Trigger: auto-insert a profile row when a user signs up.
-- display_name and username default to the email local-part;
-- the app should prompt users to update these post-signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. CONVERSATIONS
-- ============================================================

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  type            text not null default 'direct'
                    check (type in ('direct', 'group')),
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message    text,
  last_message_at timestamptz
);


-- ============================================================
-- 3. CONVERSATION PARTICIPANTS
-- ============================================================

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null default 'member'
                    check (role in ('member', 'admin')),
  unread_count    int  not null default 0,
  joined_at       timestamptz not null default now(),

  primary key (conversation_id, user_id)
);


-- ============================================================
-- 4. MESSAGES
-- ============================================================

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references public.profiles (id) on delete set null,
  content         text not null,
  created_at      timestamptz not null default now(),
  is_deleted      boolean not null default false,
  deleted_at      timestamptz default now()
);

create index if not exists messages_conversation_created
  on public.messages (conversation_id, created_at asc);


-- ============================================================
-- 5. RLS HELPER
-- ============================================================
-- Runs outside RLS (SECURITY DEFINER) to break the recursion
-- that would otherwise occur when a policy on
-- conversation_participants checks conversation_participants.

create or replace function public.is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   conversation_participants
    where  conversation_id = conv_id
      and  user_id = auth.uid()
  );
$$;


-- ============================================================
-- 6. ROW-LEVEL SECURITY
-- ============================================================

alter table public.profiles                  enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;

-- profiles
create policy "profiles: authenticated users can read all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles: users can update own row"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- conversations
create policy "conversations: visible to participants"
  on public.conversations for select
  to authenticated
  using (is_conversation_member(id));

create policy "conversations: participants can update"
  on public.conversations for update
  to authenticated
  using (is_conversation_member(id));

create policy "conversations: authenticated users can create"
  on public.conversations for insert
  to authenticated
  with check (created_by = auth.uid());

-- conversation_participants
create policy "participants: visible to conversation members"
  on public.conversation_participants for select
  to authenticated
  using (is_conversation_member(conversation_id));

create policy "participants: insert own or as admin"
  on public.conversation_participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or is_conversation_member(conversation_id)
  );

create policy "participants: update own row"
  on public.conversation_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages
create policy "messages: readable by participants"
  on public.messages for select
  to authenticated
  using (is_conversation_member(conversation_id));

create policy "messages: participants can insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and is_conversation_member(conversation_id)
  );

create policy "messages: sender can soft-delete"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());


-- ============================================================
-- 7. TRIGGER FUNCTIONS
-- ============================================================

-- 7a. Keep conversations.last_message in sync on insert
create or replace function public.sync_last_message_on_insert()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set    last_message    = new.content,
         last_message_at = new.created_at
  where  id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on public.messages;
create trigger on_message_inserted
  after insert on public.messages
  for each row execute function public.sync_last_message_on_insert();


-- 7b. Keep conversations.last_message in sync on soft-delete
-- Finds the most recent non-deleted message and falls back to
-- "Message deleted" when the thread is now empty.
create or replace function public.sync_last_message_on_delete()
returns trigger
language plpgsql
as $$
declare
  latest record;
begin
  select content, created_at
  into   latest
  from   public.messages
  where  conversation_id = new.conversation_id
    and  is_deleted = false
  order  by created_at desc
  limit  1;

  if found then
    update public.conversations
    set    last_message    = latest.content,
           last_message_at = latest.created_at
    where  id = new.conversation_id;
  else
    update public.conversations
    set    last_message    = 'Message deleted',
           last_message_at = new.deleted_at
    where  id = new.conversation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_deleted on public.messages;
create trigger on_message_deleted
  after update of is_deleted on public.messages
  for each row
  when (new.is_deleted = true)
  execute function public.sync_last_message_on_delete();


-- 7c. Increment unread_count for all participants except the sender
create or replace function public.increment_unread_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversation_participants
  set    unread_count = unread_count + 1
  where  conversation_id = new.conversation_id
    and  user_id <> new.sender_id;
  return new;
end;
$$;

drop trigger if exists aa_increment_unread_counts on public.messages;
create trigger aa_increment_unread_counts
  after insert on public.messages
  for each row execute function public.increment_unread_counts();


-- ============================================================
-- 8. HELPER RPCs
-- ============================================================

-- Returns the existing direct conversation id for two users, or null.
create or replace function public.get_direct_conversation(user_a uuid, user_b uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cp1.conversation_id
  from   public.conversation_participants cp1
  join   public.conversation_participants cp2
           on cp1.conversation_id = cp2.conversation_id
  join   public.conversations c
           on c.id = cp1.conversation_id
  where  cp1.user_id = user_a
    and  cp2.user_id = user_b
    and  c.type = 'direct'
  limit  1;
$$;

-- Resets unread_count to 0 for the given user + conversation.
-- Call this when a user opens a thread.
create or replace function public.reset_unread_count(conv_id uuid, uid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_participants
  set    unread_count = 0
  where  conversation_id = conv_id
    and  user_id = uid;
$$;


-- ============================================================
-- 9. REALTIME
-- ============================================================

alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.messages;
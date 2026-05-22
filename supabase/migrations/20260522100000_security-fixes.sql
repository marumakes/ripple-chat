-- ============================================================
-- Security fixes — closes five RLS/RPC vulnerabilities
--
-- 1. Drop conversation_participants UPDATE policy
--    (allowed self-promotion to admin by PATCHing own role column)
-- 2. Drop conversation_participants INSERT policy
--    (allowed any member to add arbitrary users, bypassing admin check)
-- 3. Drop conversations UPDATE policy + make sync triggers SECURITY DEFINER
--    (any participant could corrupt group_name, type, last_message_at, etc.)
-- 4. Add delete_message RPC + drop messages UPDATE policy
--    (sender could edit content/created_at, not just soft-delete)
-- 5. Fix reset_unread_count to use auth.uid() instead of caller-supplied uid
--    (any user could zero out any other user's unread count)
-- 6. Fix get_direct_conversation to require caller is a participant
--    (allowed probing whether any two arbitrary users have a DM)
-- ============================================================


-- ============================================================
-- 1. Drop conversation_participants UPDATE policy
-- All legitimate updates go through SECURITY DEFINER RPCs
-- (promote_to_admin, reset_unread_count) which bypass RLS.
-- ============================================================

drop policy if exists "participants: update own row"
  on public.conversation_participants;


-- ============================================================
-- 2. Drop conversation_participants INSERT policy
-- All inserts go through SECURITY DEFINER RPCs
-- (create_direct_conversation, create_group_conversation, add_group_members).
-- ============================================================

drop policy if exists "participants: insert own or as admin"
  on public.conversation_participants;


-- ============================================================
-- 3a. Drop conversations UPDATE policy
-- All legitimate updates go through SECURITY DEFINER RPCs (rename_group).
-- ============================================================

drop policy if exists "conversations: participants can update"
  on public.conversations;


-- ============================================================
-- 3b. Make last_message sync triggers SECURITY DEFINER
-- They previously relied on the now-dropped UPDATE policy.
-- Running outside RLS is correct here — triggers are internal
-- bookkeeping that no client should be able to replicate directly.
-- ============================================================

create or replace function public.sync_last_message_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set    last_message    = new.content,
         last_message_at = new.created_at
  where  id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.sync_last_message_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
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


-- ============================================================
-- 4a. Drop messages UPDATE policy
-- Allowed senders to edit content/created_at, not just soft-delete.
-- ============================================================

drop policy if exists "messages: sender can soft-delete"
  on public.messages;


-- ============================================================
-- 4b. Add delete_message RPC
-- Replaces the direct UPDATE. Only touches is_deleted and deleted_at,
-- and verifies the caller owns the message.
-- ============================================================

create or replace function public.delete_message(message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.messages
    where id = message_id and sender_id = auth.uid()
  ) then
    raise exception 'Not your message';
  end if;

  update public.messages
  set    is_deleted = true,
         deleted_at = now()
  where  id = message_id;
end;
$$;


-- ============================================================
-- 5. Fix reset_unread_count — use auth.uid(), drop uid parameter
-- ============================================================

drop function if exists public.reset_unread_count(uuid, uuid);

create or replace function public.reset_unread_count(conv_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.conversation_participants
  set    unread_count = 0
  where  conversation_id = conv_id
    and  user_id = auth.uid();
$$;


-- ============================================================
-- 6. Fix get_direct_conversation — caller must be one of the two users
-- ============================================================

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
    and  (user_a = auth.uid() or user_b = auth.uid())
  limit  1;
$$;

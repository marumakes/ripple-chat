-- ============================================================
-- Group chat support
-- ============================================================
-- Adds a group_name column to conversations and a
-- SECURITY DEFINER RPC for atomically creating a group
-- conversation with N participants.
--
-- Why SECURITY DEFINER is needed:
--   The RLS policy on conversation_participants uses
--   is_conversation_member() to check membership. When creating
--   a brand new conversation no participant row exists yet, so
--   every insert would fail the policy. Running outside RLS
--   (SECURITY DEFINER) lets us insert all rows atomically.
-- ============================================================

alter table public.conversations
  add column if not exists group_name text;


create or replace function public.create_group_conversation(
  creator_id     uuid,
  participant_ids uuid[],
  p_group_name   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
  pid     uuid;
begin
  insert into public.conversations (type, created_by, group_name)
  values ('group', creator_id, p_group_name)
  returning id into conv_id;

  -- Creator gets admin role
  insert into public.conversation_participants (conversation_id, user_id, role)
  values (conv_id, creator_id, 'admin');

  -- All other participants get member role (skip creator if included)
  foreach pid in array participant_ids loop
    if pid <> creator_id then
      insert into public.conversation_participants (conversation_id, user_id, role)
      values (conv_id, pid, 'member');
    end if;
  end loop;

  return conv_id;
end;
$$;

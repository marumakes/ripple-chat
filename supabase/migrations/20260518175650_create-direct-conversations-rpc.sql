-- Adds a SECURITY DEFINER RPC for creating direct conversations.
--
-- Why this is needed:
--   The RLS policy on conversation_participants uses
--   is_conversation_member() to check if the inserter is already
--   a participant. When creating a brand new conversation, neither
--   participant exists yet, so both inserts would fail the policy.
--
--   This function runs outside RLS (SECURITY DEFINER) and handles
--   the conversation + both participant rows atomically.
-- ============================================================

create or replace function public.create_direct_conversation(
  creator_id   uuid,
  recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  insert into public.conversations (type, created_by)
  values ('direct', creator_id)
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id, role)
  values
    (conv_id, creator_id,   'admin'),
    (conv_id, recipient_id, 'member');

  return conv_id;
end;
$$;
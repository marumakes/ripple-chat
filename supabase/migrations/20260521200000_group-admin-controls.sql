-- ============================================================
-- Group admin controls
-- ============================================================
-- RPCs for rename, kick, add members, leave, promote, delete.
-- All use SECURITY DEFINER so membership checks can run without
-- RLS blocking cross-user participant row operations.
-- ============================================================


-- Rename a group (admin only).
create or replace function public.rename_group(
  conv_id  uuid,
  new_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can rename the group';
  end if;

  update conversations
  set group_name = nullif(trim(new_name), '')
  where id = conv_id and type = 'group';
end;
$$;


-- Kick a member (admin only; cannot kick other admins or yourself).
create or replace function public.kick_member(
  conv_id   uuid,
  target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can remove members';
  end if;

  if target_id = auth.uid() then
    raise exception 'Use leave group to remove yourself';
  end if;

  if exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = target_id
      and role = 'admin'
  ) then
    raise exception 'Cannot remove another admin';
  end if;

  delete from conversation_participants
  where conversation_id = conv_id and user_id = target_id;
end;
$$;


-- Add one or more members (admin only; silently skips existing members).
create or replace function public.add_group_members(
  conv_id  uuid,
  user_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if not exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can add members';
  end if;

  foreach uid in array user_ids loop
    insert into conversation_participants (conversation_id, user_id, role)
    values (conv_id, uid, 'member')
    on conflict (conversation_id, user_id) do nothing;
  end loop;
end;
$$;


-- Promote a member to admin (admin only).
create or replace function public.promote_to_admin(
  conv_id   uuid,
  target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can promote members';
  end if;

  update conversation_participants
  set role = 'admin'
  where conversation_id = conv_id and user_id = target_id;
end;
$$;


-- Leave a group (any member).
-- Blocks the sole admin from leaving while other members remain;
-- they must promote someone first or delete the group.
-- Cleans up the conversation if the last member leaves.
create or replace function public.leave_group(
  conv_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  admin_count int;
  total_count int;
begin
  select role into caller_role
  from conversation_participants
  where conversation_id = conv_id and user_id = auth.uid();

  if caller_role is null then
    raise exception 'Not a member of this conversation';
  end if;

  select count(*) into total_count
  from conversation_participants
  where conversation_id = conv_id;

  if caller_role = 'admin' then
    select count(*) into admin_count
    from conversation_participants
    where conversation_id = conv_id and role = 'admin';

    if admin_count = 1 and total_count > 1 then
      raise exception 'You are the only admin. Promote another member before leaving, or delete the group.';
    end if;
  end if;

  delete from conversation_participants
  where conversation_id = conv_id and user_id = auth.uid();

  -- If now empty, remove the conversation.
  select count(*) into total_count
  from conversation_participants
  where conversation_id = conv_id;

  if total_count = 0 then
    delete from conversations where id = conv_id;
  end if;
end;
$$;


-- Delete a group conversation entirely (admin only).
create or replace function public.delete_group(
  conv_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from conversation_participants
    where conversation_id = conv_id
      and user_id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can delete the group';
  end if;

  delete from conversations where id = conv_id;
end;
$$;

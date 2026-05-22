-- ============================================================
-- User blocking
--
-- 1. user_blocks table + RLS
-- 2. block_user / unblock_user RPCs
-- 3. get_dm_block_status RPC (SECURITY DEFINER so blocked user
--    can discover they're blocked without reading the table)
-- 4. Restrictive INSERT policy on messages to enforce the block
-- ============================================================


-- ============================================================
-- 1. Table
-- ============================================================

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id != blocked_id)
);

alter table public.user_blocks enable row level security;

-- Users can only read blocks they created (prevents enumerating who blocked you).
create policy "blocks: read own"
  on public.user_blocks for select
  to authenticated
  using (blocker_id = auth.uid());

create policy "blocks: insert own"
  on public.user_blocks for insert
  to authenticated
  with check (blocker_id = auth.uid());

create policy "blocks: delete own"
  on public.user_blocks for delete
  to authenticated
  using (blocker_id = auth.uid());


-- ============================================================
-- 2. block_user / unblock_user RPCs
-- ============================================================

create or replace function public.block_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if target_id = auth.uid() then
    raise exception 'Cannot block yourself';
  end if;

  insert into user_blocks (blocker_id, blocked_id)
  values (auth.uid(), target_id)
  on conflict do nothing;
end;
$$;

create or replace function public.unblock_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from user_blocks
  where blocker_id = auth.uid()
    and blocked_id = target_id;
end;
$$;


-- ============================================================
-- 3. get_dm_block_status — returns both directions for a DM
--    SECURITY DEFINER so the blocked user can check their own
--    status without SELECT access to user_blocks.
-- ============================================================

create or replace function public.get_dm_block_status(conv_id uuid)
returns table(i_blocked_them bool, they_blocked_me bool)
language plpgsql
security definer
set search_path = public
as $$
declare
  other_user uuid;
begin
  select cp.user_id into other_user
  from   conversation_participants cp
  join   conversations c on c.id = cp.conversation_id
  where  cp.conversation_id = conv_id
    and  cp.user_id         != auth.uid()
    and  c.type             = 'direct'
  limit 1;

  if other_user is null then
    return query select false, false;
    return;
  end if;

  return query select
    exists(select 1 from user_blocks where blocker_id = auth.uid() and blocked_id = other_user),
    exists(select 1 from user_blocks where blocker_id = other_user  and blocked_id = auth.uid());
end;
$$;


-- ============================================================
-- 4. Restrictive policy on messages
--    Prevents sending in a DM where either party has blocked
--    the other, regardless of any permissive policies.
-- ============================================================

create policy "messages: cannot send in blocked dm"
  on public.messages
  as restrictive
  for insert
  to authenticated
  with check (
    not exists (
      select 1
      from   conversations c
      join   conversation_participants cp
               on cp.conversation_id = c.id
      where  c.id          = conversation_id
        and  c.type        = 'direct'
        and  cp.user_id   != auth.uid()
        and (
          exists (
            select 1 from user_blocks
            where blocker_id = cp.user_id and blocked_id = auth.uid()
          )
          or
          exists (
            select 1 from user_blocks
            where blocker_id = auth.uid() and blocked_id = cp.user_id
          )
        )
    )
  );

-- ============================================================
-- Group avatar support
--
-- 1. Add group_avatar_url column to conversations
-- 2. Storage policy so group admins can write to groups/<id>/avatar
-- 3. update_group_avatar RPC (admin-only, mirrors rename_group)
-- ============================================================


-- ============================================================
-- 1. Column
-- ============================================================

alter table public.conversations
  add column if not exists group_avatar_url text;


-- ============================================================
-- 2. Storage policies (reuses the existing avatars bucket)
--    Path: groups/{conversationId}/avatar
--    Only admins of that conversation may write.
-- ============================================================

create policy "avatars: group admins can upload group avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1
      from   public.conversation_participants
      where  conversation_id = (storage.foldername(name))[2]::uuid
        and  user_id         = auth.uid()
        and  role            = 'admin'
    )
  );

create policy "avatars: group admins can update group avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1
      from   public.conversation_participants
      where  conversation_id = (storage.foldername(name))[2]::uuid
        and  user_id         = auth.uid()
        and  role            = 'admin'
    )
  );

create policy "avatars: group admins can delete group avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'groups'
    and exists (
      select 1
      from   public.conversation_participants
      where  conversation_id = (storage.foldername(name))[2]::uuid
        and  user_id         = auth.uid()
        and  role            = 'admin'
    )
  );


-- ============================================================
-- 3. RPC — saves the URL to the conversations row
-- ============================================================

create or replace function public.update_group_avatar(conv_id uuid, avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from   conversation_participants
    where  conversation_id = conv_id
      and  user_id         = auth.uid()
      and  role            = 'admin'
  ) then
    raise exception 'Only admins can update the group avatar';
  end if;

  update conversations
  set    group_avatar_url = avatar_url
  where  id = conv_id;
end;
$$;

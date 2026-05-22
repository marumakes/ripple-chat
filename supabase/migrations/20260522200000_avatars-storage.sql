-- ============================================================
-- Avatar storage
-- Creates the avatars bucket and locks it down so each user
-- can only write to their own path (userId/avatar).
-- The bucket is public so avatar URLs work in <img> tags
-- without signed URLs.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB hard limit enforced by storage layer
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Upload own avatar
create policy "avatars: users can upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Replace own avatar (upsert requires update permission too)
create policy "avatars: users can update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete own avatar
create policy "avatars: users can delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — no auth required so avatar URLs render everywhere
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

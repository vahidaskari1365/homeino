-- ============================================================
-- Homeino — Avatar & Product Image Storage (buckets + RLS)
-- ============================================================
-- Production-ready Supabase Storage for user avatars and product images.
-- Buckets are public-read (so getPublicUrl works) but writes are restricted to
-- the owner's own folder: <bucket>/{user_id}/<file>. 5 MB size cap, image mimes.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',        'avatars',        true, 5242880, array['image/jpeg','image/jpg','image/png','image/webp']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/jpg','image/png','image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---- Public read ----
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- ---- avatars: owner-only writes (folder = auth.uid()) ----
drop policy if exists "avatars_owner_insert" on storage.objects;
create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---- product-images: owner-only writes (folder = auth.uid()) ----
drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects
  for update to authenticated
  using      (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

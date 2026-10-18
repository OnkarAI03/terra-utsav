-- TERRA UTSAV: storage for admin-uploaded images (team photos, mascot art, product photos).
-- The bucket is public-read so images can be served directly; only admins can write.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "site-media: admins upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and (select public.is_admin()));

create policy "site-media: admins update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and (select public.is_admin()))
  with check (bucket_id = 'site-media' and (select public.is_admin()));

create policy "site-media: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and (select public.is_admin()));

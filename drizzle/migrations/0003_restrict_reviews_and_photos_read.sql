create or replace function public.review_is_published(_booking uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b where b.id = _booking and b.status = 'cerrada');
$$;
grant execute on function public.review_is_published(uuid) to anon, authenticated;

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews read closed bookings" on public.reviews for select
  using (public.review_is_published(booking_id));

create or replace function public.is_booking_party(_booking text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bookings b
    where b.id::text = _booking and auth.uid() in (b.renter_id, b.owner_id));
$$;
revoke execute on function public.is_booking_party(text) from public, anon;
grant execute on function public.is_booking_party(text) to authenticated;

drop policy if exists "photos read" on storage.objects;
create policy "photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos read active listings" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[2] = 'listings'
    and exists (select 1 from public.listings l where l.active and storage.objects.name = any(l.photos)));
create policy "photos read booking actas" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[2] = 'actas'
    and public.is_booking_party((storage.foldername(name))[3]));
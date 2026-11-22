create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profile_private to authenticated;
grant all on public.profile_private to service_role;
alter table public.profile_private enable row level security;
create policy "private own read" on public.profile_private for select to authenticated using (auth.uid() = user_id);
create policy "private own insert" on public.profile_private for insert to authenticated with check (auth.uid() = user_id);
create policy "private own update" on public.profile_private for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.profile_private (user_id, phone)
  select id, phone from public.profiles where phone is not null
  on conflict (user_id) do nothing;
update public.profiles set phone = null where phone is not null;
comment on column public.profiles.phone is 'DEPRECATED: moved to profile_private.phone';

revoke select, update on public.profiles from anon, authenticated;
grant select (id, display_name, location, stellar_address, created_at) on public.profiles to anon, authenticated;
grant update (display_name, location, stellar_address) on public.profiles to authenticated;

create or replace function public.booking_contact_phone(_booking uuid) returns text
language sql stable security definer set search_path = public as $$
  select pp.phone
  from public.bookings b
  join public.profile_private pp
    on pp.user_id = case when b.renter_id = auth.uid() then b.owner_id else b.renter_id end
  where b.id = _booking
    and auth.uid() in (b.renter_id, b.owner_id)
    and b.status in ('aceptada','pagada','entregada','devuelta','cerrada');
$$;
revoke execute on function public.booking_contact_phone(uuid) from public, anon;
grant execute on function public.booking_contact_phone(uuid) to authenticated;
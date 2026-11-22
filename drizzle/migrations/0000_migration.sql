create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  location text,
  phone text,
  stellar_address text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('maquinaria','herramienta','ganado')),
  price_per_day numeric(14,2) not null check (price_per_day > 0),
  deposit numeric(14,2) not null default 0 check (deposit >= 0),
  location_text text not null default '',
  lat double precision,
  lng double precision,
  photos text[] not null default '{}',
  available_from date not null,
  available_to date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (available_to >= available_from)
);
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant all on public.listings to service_role;
alter table public.listings enable row level security;
create policy "listings read active or own" on public.listings for select using (active or auth.uid() = owner_id);
create policy "listings own insert" on public.listings for insert to authenticated with check (auth.uid() = owner_id);
create policy "listings own update" on public.listings for update to authenticated using (auth.uid() = owner_id);
create policy "listings own delete" on public.listings for delete to authenticated using (auth.uid() = owner_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  renter_id uuid not null references public.profiles(id),
  owner_id uuid not null references public.profiles(id),
  start_date date not null,
  end_date date not null,
  days int not null default 0,
  rental_amount numeric(14,2) not null default 0,
  deposit_amount numeric(14,2) not null default 0,
  commission_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'solicitada' check (status in ('solicitada','aceptada','pagada','entregada','devuelta','cerrada','rechazada','cancelada')),
  payment_memo text,
  payment_tx_hash text unique,
  payment_verified_at timestamptz,
  deposit_released_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
grant select, insert, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "bookings parties read" on public.bookings for select to authenticated using (auth.uid() in (renter_id, owner_id));
create policy "bookings renter insert" on public.bookings for insert to authenticated with check (auth.uid() = renter_id);
create policy "bookings parties update" on public.bookings for update to authenticated using (auth.uid() in (renter_id, owner_id));

-- Commission rate: 5% of the rental amount (deposit is not commissioned)
create or replace function public.bookings_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare l public.listings;
begin
  select * into l from public.listings where id = new.listing_id;
  if l.id is null or not l.active then raise exception 'Publicación no disponible'; end if;
  if l.owner_id = new.renter_id then raise exception 'No puedes reservar tu propia publicación'; end if;
  if new.start_date < current_date then raise exception 'La fecha de inicio ya pasó'; end if;
  if new.start_date < l.available_from or new.end_date > l.available_to then raise exception 'Fechas fuera de la disponibilidad'; end if;
  if exists (select 1 from public.bookings b where b.listing_id = new.listing_id
      and b.status in ('aceptada','pagada','entregada','devuelta','solicitada')
      and daterange(b.start_date, b.end_date, '[]') && daterange(new.start_date, new.end_date, '[]')) then
    raise exception 'Esas fechas ya están reservadas';
  end if;
  new.owner_id := l.owner_id;
  new.days := (new.end_date - new.start_date) + 1;
  new.rental_amount := round(new.days * l.price_per_day, 2);
  new.deposit_amount := l.deposit;
  new.commission_amount := round(new.rental_amount * 0.05, 2);
  new.total_amount := new.rental_amount + new.deposit_amount;
  new.status := 'solicitada';
  new.payment_memo := 'MV-' || substr(replace(new.id::text,'-',''),1,12);
  new.payment_tx_hash := null; new.payment_verified_at := null; new.deposit_released_at := null;
  return new;
end $$;
create trigger bookings_bi before insert on public.bookings for each row execute function public.bookings_before_insert();

create or replace function public.bookings_before_update() returns trigger language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return new; end if; -- service role
  -- immutable fields
  new.listing_id := old.listing_id; new.renter_id := old.renter_id; new.owner_id := old.owner_id;
  new.start_date := old.start_date; new.end_date := old.end_date; new.days := old.days;
  new.rental_amount := old.rental_amount; new.deposit_amount := old.deposit_amount;
  new.commission_amount := old.commission_amount; new.total_amount := old.total_amount; new.payment_memo := old.payment_memo;
  new.payment_tx_hash := old.payment_tx_hash; new.payment_verified_at := old.payment_verified_at;
  if new.status = old.status then return new; end if;
  if old.status = 'solicitada' and new.status in ('aceptada','rechazada') and uid = old.owner_id then return new; end if;
  if old.status in ('solicitada','aceptada') and new.status = 'cancelada' and uid = old.renter_id then return new; end if;
  if old.status = 'pagada' and new.status = 'entregada' and exists (select 1 from public.handover_records h where h.booking_id = old.id and h.kind='entrega') then return new; end if;
  if old.status = 'entregada' and new.status = 'devuelta' and exists (select 1 from public.handover_records h where h.booking_id = old.id and h.kind='devolucion') then return new; end if;
  if old.status = 'devuelta' and new.status = 'cerrada' and uid = old.owner_id then new.deposit_released_at := now(); return new; end if;
  raise exception 'Cambio de estado no permitido';
end $$;
create trigger bookings_bu before update on public.bookings for each row execute function public.bookings_before_update();

create table public.handover_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('entrega','devolucion')),
  photos text[] not null default '{}',
  notes text not null default '',
  created_by uuid not null references public.profiles(id),
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, kind)
);
grant select, insert on public.handover_records to authenticated;
grant all on public.handover_records to service_role;
alter table public.handover_records enable row level security;
create policy "handover parties read" on public.handover_records for select to authenticated using (exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.renter_id, b.owner_id)));
create policy "handover parties insert" on public.handover_records for insert to authenticated with check (auth.uid() = created_by and exists (select 1 from public.bookings b where b.id = booking_id and auth.uid() in (b.renter_id, b.owner_id) and ((kind='entrega' and b.status='pagada') or (kind='devolucion' and b.status='entregada'))));

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);
grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select using (true);
create policy "reviews party insert" on public.reviews for insert to authenticated with check (
  auth.uid() = reviewer_id and exists (select 1 from public.bookings b where b.id = booking_id and b.status = 'cerrada'
    and ((b.renter_id = auth.uid() and b.owner_id = reviewee_id) or (b.owner_id = auth.uid() and b.renter_id = reviewee_id))));

-- public, privacy-safe stats for verifiable history
create or replace function public.user_stats(_user uuid) returns table(completed int, avg_rating numeric, review_count int)
language sql stable security definer set search_path = public as $$
  select (select count(*)::int from public.bookings where status='cerrada' and _user in (renter_id, owner_id)),
         (select round(avg(rating)::numeric,1) from public.reviews where reviewee_id=_user),
         (select count(*)::int from public.reviews where reviewee_id=_user);
$$;
grant execute on function public.user_stats(uuid) to anon, authenticated;

-- booked ranges for a listing (no private data)
create or replace function public.listing_booked_ranges(_listing uuid) returns table(start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select start_date, end_date from public.bookings where listing_id=_listing and status in ('solicitada','aceptada','pagada','entregada','devuelta');
$$;
grant execute on function public.listing_booked_ranges(uuid) to anon, authenticated;
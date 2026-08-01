-- ============================================================
-- GRANT RADAR — Supabase Şeması
-- ============================================================
-- Kurulum:
--   1. supabase.com → New project (bölge: Frankfurt / EU Central önerilir)
--   2. Sol menü → SQL Editor → New query
--   3. Bu dosyanın tamamını yapıştır → Run
--   4. Settings → API → "Project URL" ve "anon public" anahtarını kopyala
--   5. Grant Radar → Kaynaklar → Senkron ayarları → yapıştır
--
-- Güvenlik notu: yalnızca "anon public" anahtarını kullan.
-- "service_role" anahtarını ASLA tarayıcı koduna koyma.
-- ============================================================

-- ---------- Profiller ----------
create table if not exists public.profiles (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'Adsız Proje',
  company_type  text,
  country       text,
  company_age   int  default 0,
  employees     int  default 0,
  revenue       numeric default 0,
  founder_age   int,
  stage         text,
  funding       text,
  sectors       text[] default '{}',
  quals         text[] default '{}',
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ---------- Takip edilen programlar ----------
create table if not exists public.tracked (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  profile_id  text not null references public.profiles(id) on delete cascade,
  grant_id    text not null,
  status      text not null default 'ilgileniyorum',
  note        text default '',
  updated_at  timestamptz not null default now(),
  unique (profile_id, grant_id)
);

-- ---------- Paylaşımlar (ortak takip) ----------
create table if not exists public.shares (
  id                uuid primary key default gen_random_uuid(),
  profile_id        text not null references public.profiles(id) on delete cascade,
  owner_id          uuid not null references auth.users(id) on delete cascade,
  shared_with_email text not null,
  permission        text not null default 'read',   -- 'read' | 'write'
  created_at        timestamptz not null default now(),
  unique (profile_id, shared_with_email)
);

-- ---------- İndeksler ----------
create index if not exists profiles_user_idx  on public.profiles (user_id);
create index if not exists tracked_user_idx   on public.tracked  (user_id);
create index if not exists tracked_profile_idx on public.tracked (profile_id);
create index if not exists shares_email_idx   on public.shares   (lower(shared_with_email));

-- ============================================================
-- ROW LEVEL SECURITY  —  bu bölüm ZORUNLU
-- RLS olmadan herkes herkesin verisini okuyabilir.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.tracked  enable row level security;
alter table public.shares   enable row level security;

-- Yardımcı: bir profil oturum açmış kullanıcıyla paylaşılmış mı?
create or replace function public.has_share_access(p_profile_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.shares s
    where s.profile_id = p_profile_id
      and lower(s.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- profiles politikaları ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    user_id = auth.uid() or public.has_share_access(id)
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (user_id = auth.uid());

-- ---------- tracked politikaları ----------
drop policy if exists tracked_select on public.tracked;
create policy tracked_select on public.tracked
  for select using (
    user_id = auth.uid() or public.has_share_access(profile_id)
  );

drop policy if exists tracked_insert on public.tracked;
create policy tracked_insert on public.tracked
  for insert with check (user_id = auth.uid());

drop policy if exists tracked_update on public.tracked;
create policy tracked_update on public.tracked
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tracked_delete on public.tracked;
create policy tracked_delete on public.tracked
  for delete using (user_id = auth.uid());

-- ---------- shares politikaları ----------
drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares
  for select using (
    owner_id = auth.uid()
    or lower(shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists shares_all on public.shares;
create policy shares_all on public.shares
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================
-- updated_at otomatik güncelleme
-- ============================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists tracked_touch on public.tracked;
create trigger tracked_touch before update on public.tracked
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Kurulum tamam.
-- Doğrulama: Table Editor'da üç tablo da "RLS enabled" görünmeli.
-- ============================================================

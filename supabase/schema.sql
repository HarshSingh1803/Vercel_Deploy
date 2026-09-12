-- GET-RISE schema
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cleaning_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  original_file_name text not null,
  original_file_size bigint not null,
  cleaned_file_size bigint,
  file_type text not null,
  metadata_removed jsonb,
  status text not null default 'completed' check (status in ('completed', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  plan_name text not null default 'Free',
  usage_count integer not null default 0,
  usage_limit integer not null default 100,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.cleaning_history enable row level security;
alter table public.user_plans enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "history_select_own" on public.cleaning_history;
create policy "history_select_own"
  on public.cleaning_history for select
  using (auth.uid() = user_id);

drop policy if exists "history_insert_own" on public.cleaning_history;
create policy "history_insert_own"
  on public.cleaning_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "history_delete_own" on public.cleaning_history;
create policy "history_delete_own"
  on public.cleaning_history for delete
  using (auth.uid() = user_id);

drop policy if exists "plans_select_own" on public.user_plans;
create policy "plans_select_own"
  on public.user_plans for select
  using (auth.uid() = user_id);

drop policy if exists "plans_insert_own" on public.user_plans;
create policy "plans_insert_own"
  on public.user_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "plans_update_own" on public.user_plans;
create policy "plans_update_own"
  on public.user_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  insert into public.user_plans (user_id, plan_name, usage_count, usage_limit)
  values (new.id, 'Free', 0, 100)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.increment_plan_usage()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_plans (user_id, plan_name, usage_count, usage_limit)
  values (auth.uid(), 'Free', 1, 100)
  on conflict (user_id)
  do update set usage_count = public.user_plans.usage_count + 1;
end;
$$;

revoke all on function public.increment_plan_usage() from public;
grant execute on function public.increment_plan_usage() to authenticated;

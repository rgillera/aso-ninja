-- Profiles — one row per auth.users row, auto-created on signup

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Trigger: auto-create profile + default workspace on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_slug   text;
  display_name     text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  workspace_slug := lower(regexp_replace(display_name, '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(new.id::text, 1, 8);

  insert into public.workspaces (name, slug)
  values (display_name || '''s Workspace', workspace_slug)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

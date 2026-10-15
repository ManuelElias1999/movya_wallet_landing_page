-- Run once in the connected Supabase project's SQL editor.
-- This table is independent of wallet accounts, contacts and signing keys.
create table if not exists public.movya_whitelist (
  email text primary key check (email = lower(btrim(email)) and char_length(email) between 3 and 254),
  language text not null check (language in ('en', 'es')),
  consent_at timestamptz not null,
  source text not null default 'landing' check (source = 'landing'),
  created_at timestamptz not null default now()
);

alter table public.movya_whitelist enable row level security;
revoke all on table public.movya_whitelist from anon, authenticated;
grant insert, select on table public.movya_whitelist to service_role;

comment on table public.movya_whitelist is
  'Movya early-access email signups. Server-only writes; no public subscriber access.';

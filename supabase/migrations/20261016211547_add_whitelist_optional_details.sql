-- Optional whitelist details. Existing email-only signups remain valid.
alter table public.movya_whitelist
  add column if not exists full_name text check (char_length(full_name) <= 120),
  add column if not exists country text check (char_length(country) <= 100),
  add column if not exists city text check (char_length(city) <= 120),
  add column if not exists phone text check (char_length(phone) <= 40);

comment on column public.movya_whitelist.full_name is 'Optional name supplied by the subscriber.';
comment on column public.movya_whitelist.country is 'Optional country supplied by the subscriber.';
comment on column public.movya_whitelist.city is 'Optional city supplied by the subscriber.';
comment on column public.movya_whitelist.phone is 'Optional phone number, stored as text to preserve country codes and formatting.';

notify pgrst, 'reload schema';

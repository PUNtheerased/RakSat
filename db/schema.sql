create extension if not exists pgcrypto;

create table if not exists owners (
  id uuid primary key,
  display_name text,
  consent_version text, consented_at timestamptz,
  line_user_id text unique,
  invite_key_id uuid,
  activated_at timestamptz,
  access_until timestamptz,
  suspended_at timestamptz,
  created_at timestamptz not null default now()
);
alter table owners add column if not exists invite_key_id uuid;
alter table owners add column if not exists activated_at timestamptz;
alter table owners add column if not exists access_until timestamptz;
alter table owners add column if not exists suspended_at timestamptz;

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  name text not null,
  species text not null check (species in ('dog','cat')),
  breed text, birth_date date, sex text, neutered boolean,
  weight_kg numeric(5,2),
  conditions text[] not null default '{}', allergies text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists pet_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  kind text not null check (kind in ('meal','water','stool','vomit','weight','medication','vaccine','symptom','note')),
  value jsonb not null default '{}', note text,
  occurred_at timestamptz not null default now(),
  source text not null default 'user' check (source in ('user','agent')),
  created_at timestamptz not null default now()
);
create index if not exists pet_events_pet_id_occurred_at_idx on pet_events (pet_id, occurred_at desc);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_owner_id_created_at_idx on messages (owner_id, created_at desc);
create index if not exists messages_pet_id_created_at_idx on messages (pet_id, created_at);

create table if not exists triage_sessions (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  owner_id uuid not null references owners(id) on delete cascade,
  input_text text not null,
  zone text not null check (zone in ('green','yellow','red')),
  llm_zone text, confidence text,
  rule_ids text[] not null default '{}',
  reasons jsonb not null default '[]', watch_for jsonb not null default '[]',
  rules_version text not null, model text,
  review_label text,
  created_at timestamptz not null default now()
);
alter table triage_sessions add column if not exists review_label text;
create index if not exists triage_sessions_owner_id_created_at_idx on triage_sessions (owner_id, created_at desc);
create index if not exists triage_sessions_zone_created_at_idx on triage_sessions (zone, created_at desc);

create table if not exists pending_actions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  kind text not null check (kind in ('log_event','create_reminder','schedule_checkin','create_referral')),
  payload jsonb not null, preview text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  resolved_at timestamptz
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  kind text not null default 'reminder' check (kind in ('reminder','checkin')),
  title text not null, body text,
  schedule_type text not null check (schedule_type in ('daily','once')),
  time_of_day text,
  next_run_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists reminders_due on reminders (next_run_at) where active;

create table if not exists reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references reminders(id) on delete cascade,
  channel text not null, status text not null check (status in ('sent','failed')),
  error text, sent_at timestamptz not null default now(), acknowledged_at timestamptz
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  endpoint text not null unique, keys jsonb not null
);

create table if not exists link_codes (
  code text primary key,
  owner_id uuid not null references owners(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  token text not null unique, summary jsonb not null,
  clinic_place_id text,
  confirmed_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists referral_views (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references referrals(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists referral_feedback (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references referrals(id) on delete cascade,
  helpful boolean not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  triage_session_id uuid references triage_sessions(id) on delete set null,
  rating smallint not null check (rating in (-1,1)), note text,
  created_at timestamptz not null default now()
);

create table if not exists invite_keys (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text,
  cohort text,
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  daily_limit int,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table owners
    add constraint owners_invite_key_id_fkey
    foreign key (invite_key_id) references invite_keys(id) on delete set null;
exception when duplicate_object then null;
end $$;

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  trigger text not null,
  answers jsonb not null default '{}',
  created_at timestamptz not null default now(),
  snoozed_count int not null default 0
);
create unique index if not exists survey_one_per_trigger on survey_responses (owner_id, trigger) where answers <> '{}'::jsonb;

create table if not exists survey_snoozes (
  owner_id uuid not null references owners(id) on delete cascade,
  trigger text not null,
  snoozed_count int not null default 0,
  snoozed_until timestamptz,
  primary key (owner_id, trigger)
);

create table if not exists admins (
  owner_id uuid primary key references owners(id) on delete cascade,
  role text not null check (role in ('admin','reviewer')),
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references owners(id),
  action text not null,
  target text,
  meta jsonb not null default '{}',
  at timestamptz not null default now()
);

create table if not exists app_config (
  key text primary key,
  value jsonb not null
);

create table if not exists llm_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references owners(id) on delete cascade,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  at timestamptz not null default now()
);
create index if not exists llm_usage_at_idx on llm_usage (at desc);
create index if not exists llm_usage_owner_id_at_idx on llm_usage (owner_id, at desc);

create table if not exists pet_clinics (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets(id) on delete cascade,
  place_id text not null,
  label text not null,
  is_primary boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  unique (pet_id, place_id)
);
create unique index if not exists pet_clinics_one_primary on pet_clinics (pet_id) where is_primary;

create table if not exists invite_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  ip text,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists invite_attempts_owner_id_at_idx on invite_attempts (owner_id, at desc);
create index if not exists invite_attempts_ip_at_idx on invite_attempts (ip, at desc);

insert into app_config(key, value) values
  ('require_invite', 'true'::jsonb),
  ('trial_days', '14'::jsonb),
  ('llm_paused', 'false'::jsonb)
on conflict (key) do nothing;

do $$ declare t text;
begin
  foreach t in array array[
    'owners','pets','pet_events','messages','triage_sessions','pending_actions','reminders',
    'reminder_deliveries','push_subscriptions','link_codes','referrals','referral_views',
    'referral_feedback','feedback','invite_keys','survey_responses','survey_snoozes',
    'admins','admin_audit_log','app_config','llm_usage','pet_clinics','invite_attempts'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create table if not exists scans (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  summary jsonb not null
);

create index if not exists scans_user_created_idx on scans (user_id, created_at desc);

create table if not exists scan_boards (
  id bigserial primary key,
  scan_id text not null references scans(id) on delete cascade,
  board_id text not null,
  board_name text not null,
  owner text not null,
  team text not null,
  last_modified timestamptz not null,
  risk_score integer not null,
  severity text not null,
  findings jsonb not null default '[]'::jsonb
);

create index if not exists scan_boards_scan_idx on scan_boards (scan_id);

create table if not exists probe_sessions (
  id text primary key,
  user_id text not null,
  created_at timestamptz not null default now()
);

alter table if exists probe_sessions
  add column if not exists user_id text;

update probe_sessions
set user_id = 'legacy-anon'
where user_id is null;

alter table if exists probe_sessions
  alter column user_id set not null;

create index if not exists probe_sessions_user_created_idx on probe_sessions (user_id, created_at desc);

create table if not exists probe_results (
  id text primary key,
  session_id text not null references probe_sessions(id) on delete cascade,
  board_url text not null,
  board_id text not null,
  status text not null,
  http_code integer not null,
  checked_at timestamptz not null
);

create index if not exists probe_results_session_idx on probe_results (session_id, checked_at asc);

create table if not exists user_settings (
  user_id text primary key,
  stale_days_threshold integer not null,
  max_editors_threshold integer not null,
  sensitive_keywords text[] not null,
  risk_checks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table if exists user_settings
  add column if not exists risk_checks jsonb not null default '{}'::jsonb;

create table if not exists oauth_states (
  id text primary key,
  created_at timestamptz not null default now()
);

create table if not exists miro_sessions (
  id text primary key,
  user_id text not null,
  access_token text not null,
  refresh_token text,
  expires_at bigint,
  created_at timestamptz not null default now()
);

create index if not exists miro_sessions_user_idx on miro_sessions (user_id, created_at desc);

create table if not exists probe_rate_limits (
  ip text primary key,
  bucket jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to service_role;

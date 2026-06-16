-- Enable UUID extension
create extension if not exists "uuid-ossp";

create table if not exists test_runs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  triggered_by text,
  cats text not null default 'all',
  status text not null default 'running' check (status in ('running','passed','failed','error','cancelled')),
  github_run_id text,
  github_run_url text,
  total_tests int default 0,
  passed_tests int default 0,
  failed_tests int default 0,
  skipped_tests int default 0,
  completed_at timestamptz,
  duration_ms int
);

create table if not exists test_results (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid references test_runs(id) on delete cascade,
  cat text not null,
  scenario_name text not null,
  status text not null check (status in ('passed','failed','skipped')),
  duration_ms int default 0,
  error_message text,
  video_url text,
  screenshot_url text,
  created_at timestamptz default now()
);

-- RLS: allow service role full access
alter table test_runs enable row level security;
alter table test_results enable row level security;

create policy "service role full access runs"
  on test_runs for all using (true) with check (true);
create policy "service role full access results"
  on test_results for all using (true) with check (true);

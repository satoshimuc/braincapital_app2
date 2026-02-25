-- ============================================
-- Brain Capital Assessment Results Table
-- Run this in your Supabase SQL Editor
-- ============================================

create table if not exists assessment_results (
  id          uuid        default gen_random_uuid() primary key,
  line_uid    text        not null,
  display_name text,
  picture_url text,
  total       integer     not null,
  health_total integer    not null,
  skills_total integer    not null,
  level       text        not null,
  level_label text,
  type        text        not null,
  categories  jsonb       not null default '{}',
  answers     jsonb       not null default '{}',
  created_at  timestamptz default now()
);

-- Index for common queries
create index if not exists idx_assessment_results_created_at
  on assessment_results (created_at desc);

create index if not exists idx_assessment_results_line_uid
  on assessment_results (line_uid);

-- ============================================
-- Row Level Security
-- ============================================

alter table assessment_results enable row level security;

-- Anyone can INSERT (assessment users via anon key)
create policy "Anyone can insert results"
  on assessment_results for insert
  with check (true);

-- Anyone can SELECT (admin page via anon key)
-- NOTE: For production, restrict SELECT to authenticated admins
create policy "Anyone can read results"
  on assessment_results for select
  using (true);

-- Anyone can DELETE (admin page clear-all)
-- NOTE: For production, restrict DELETE to authenticated admins
create policy "Anyone can delete results"
  on assessment_results for delete
  using (true);

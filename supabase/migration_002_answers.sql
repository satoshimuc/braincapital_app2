-- ============================================
-- Migration 002: Individual Answer Tracking + Session ID
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add session_id to existing assessment_results table
alter table assessment_results
  add column if not exists session_id text;

create index if not exists idx_assessment_results_session_id
  on assessment_results (session_id);

-- 2. Create assessment_answers table for per-question answer tracking
create table if not exists assessment_answers (
  id            uuid        default gen_random_uuid() primary key,
  session_id    text        not null,
  line_uid      text,
  question_id   text        not null,
  category_id   text        not null,
  value         integer     not null check (value >= 1 and value <= 5),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Indexes for common queries
create index if not exists idx_assessment_answers_session_id
  on assessment_answers (session_id);

create index if not exists idx_assessment_answers_line_uid
  on assessment_answers (line_uid);

create index if not exists idx_assessment_answers_question_id
  on assessment_answers (question_id);

-- Unique constraint: one answer per question per session
-- (upsert will update the value if the user changes their answer)
create unique index if not exists idx_assessment_answers_session_question
  on assessment_answers (session_id, question_id);

-- ============================================
-- Row Level Security
-- ============================================

alter table assessment_answers enable row level security;

-- Anyone can INSERT (assessment users via anon key)
create policy "Anyone can insert answers"
  on assessment_answers for insert
  with check (true);

-- Anyone can UPDATE (for upsert when user changes answer)
create policy "Anyone can update answers"
  on assessment_answers for update
  using (true);

-- Anyone can SELECT (admin page via anon key)
-- NOTE: For production, restrict SELECT to authenticated admins
create policy "Anyone can read answers"
  on assessment_answers for select
  using (true);

-- Anyone can DELETE (admin page clear-all)
-- NOTE: For production, restrict DELETE to authenticated admins
create policy "Anyone can delete answers"
  on assessment_answers for delete
  using (true);

-- ============================================
-- Migration 004: Organizations & org_code support
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Organizations master table
create table if not exists organizations (
  id          uuid        default gen_random_uuid() primary key,
  org_code    text        not null unique,
  org_name    text        not null,
  is_active   boolean     default true,
  created_at  timestamptz default now()
);

create index if not exists idx_organizations_org_code
  on organizations (org_code);

-- RLS
alter table organizations enable row level security;

-- Anyone can read (app needs to validate org codes)
create policy "Anyone can read organizations"
  on organizations for select
  using (true);

-- Only admins should insert/update/delete (via dashboard or SQL Editor)
-- For now, allow all to support admin.html
create policy "Anyone can insert organizations"
  on organizations for insert
  with check (true);

create policy "Anyone can update organizations"
  on organizations for update
  using (true);

create policy "Anyone can delete organizations"
  on organizations for delete
  using (true);

-- 2. Add org_code column to assessment_results
alter table assessment_results
  add column if not exists org_code text;

create index if not exists idx_assessment_results_org_code
  on assessment_results (org_code);

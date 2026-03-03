-- ============================================
-- Migration 005: Corporate Wellness (B2B)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Departments (hierarchical, per organization)
create table if not exists departments (
  id            uuid        default gen_random_uuid() primary key,
  org_code      text        not null references organizations(org_code) on delete cascade,
  parent_id     uuid        references departments(id) on delete set null,
  name          text        not null,
  sort_order    integer     default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_departments_org on departments(org_code);

-- 2. Corporate Users
create table if not exists corp_users (
  id              uuid        default gen_random_uuid() primary key,
  org_code        text        not null references organizations(org_code) on delete cascade,
  department_id   uuid        references departments(id) on delete set null,
  user_token      text        not null unique,
  display_name    text        default '匿名',
  role            text        not null default 'employee'
                              check (role in ('employee','hr_admin','occupational_health')),
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

create index if not exists idx_corp_users_token on corp_users(user_token);
create index if not exists idx_corp_users_org   on corp_users(org_code);

-- 3. Consents (two-tier)
create table if not exists consents (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references corp_users(id) on delete cascade,
  consent_type    text        not null check (consent_type in ('basic_usage','oh_sharing')),
  status          text        not null default 'pending'
                              check (status in ('pending','granted','revoked')),
  shared_scopes   jsonb       default '{}',
  granted_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz default now(),
  unique(user_id, consent_type)
);

-- 4. Weekly Check-ins
create table if not exists weekly_checkins (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references corp_users(id) on delete cascade,
  org_code        text        not null,
  department_id   uuid,
  answers         jsonb       not null default '{}',
  stress_score    numeric(3,1),
  health_score    numeric(3,1),
  total_score     numeric(3,1),
  risk_level      text        check (risk_level in ('green','yellow','red')),
  week_start      date        not null,
  created_at      timestamptz default now()
);

create index if not exists idx_weekly_checkins_user   on weekly_checkins(user_id);
create index if not exists idx_weekly_checkins_org    on weekly_checkins(org_code, week_start);
create index if not exists idx_weekly_checkins_dept   on weekly_checkins(department_id, week_start);

-- 5. Monthly Assessments (reuses consumer question set)
create table if not exists monthly_assessments (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references corp_users(id) on delete cascade,
  org_code        text        not null,
  department_id   uuid,
  answers         jsonb       not null default '{}',
  categories      jsonb       default '{}',
  total           integer,
  health_total    integer,
  skills_total    integer,
  brain_type      text,
  brain_type_name text,
  brain_type_axes jsonb       default '{}',
  risk_level      text        check (risk_level in ('green','yellow','red')),
  created_at      timestamptz default now()
);

create index if not exists idx_monthly_user on monthly_assessments(user_id);
create index if not exists idx_monthly_org  on monthly_assessments(org_code);

-- 6. Risk Signals
create table if not exists risk_signals (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references corp_users(id) on delete cascade,
  org_code        text        not null,
  source_type     text        not null check (source_type in ('weekly_checkin','monthly_assessment')),
  source_id       uuid        not null,
  risk_level      text        not null check (risk_level in ('yellow','red')),
  risk_categories text[]      not null default '{}',
  message         text,
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

create index if not exists idx_risk_signals_user on risk_signals(user_id);
create index if not exists idx_risk_signals_org  on risk_signals(org_code, risk_level);

-- 7. Audit Log (immutable)
create table if not exists audit_logs (
  id              uuid        default gen_random_uuid() primary key,
  actor_id        uuid        not null,
  actor_role      text        not null,
  action          text        not null,
  target_user_id  uuid,
  target_resource text,
  details         jsonb       default '{}',
  created_at      timestamptz default now()
);

create index if not exists idx_audit_logs_actor  on audit_logs(actor_id);
create index if not exists idx_audit_logs_target on audit_logs(target_user_id);

-- ============================================
-- Row Level Security
-- ============================================

alter table departments       enable row level security;
alter table corp_users         enable row level security;
alter table consents           enable row level security;
alter table weekly_checkins    enable row level security;
alter table monthly_assessments enable row level security;
alter table risk_signals       enable row level security;
alter table audit_logs         enable row level security;

-- Allow all via anon key (MVP; production should use Supabase Auth + fine-grained RLS)
do $$
declare
  tbl text;
begin
  for tbl in values ('departments'),('corp_users'),('consents'),
    ('weekly_checkins'),('monthly_assessments'),('risk_signals'),('audit_logs')
  loop
    execute format('create policy "anon_select_%s" on %I for select using (true)', tbl, tbl);
    execute format('create policy "anon_insert_%s" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "anon_update_%s" on %I for update using (true)', tbl, tbl);
    execute format('create policy "anon_delete_%s" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ============================================
-- Migration 008: Professional Brain Capital Personal Optimization
-- Target: Executives, athletes, investors, creators, lawyers, doctors
-- Fully private — no data sharing, single-user design
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Professional Users (self-owned account)
create table if not exists pro_users (
  id              uuid        default gen_random_uuid() primary key,
  user_token      text        not null unique,
  email           text        unique,
  display_name    text        not null,
  -- Persona config (multiple selection)
  personas        text[]      not null default '{"executive"}',
  -- Brain Type (cached from latest assessment)
  brain_type      text,
  brain_type_name text,
  brain_type_axes jsonb       default '{}',
  -- Settings
  morning_reminder_time  time    default '07:00',
  evening_reminder_time  time    default '22:00',
  timezone        text        default 'Asia/Tokyo',
  is_active       boolean     default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_pro_users_token on pro_users(user_token);

-- 2. Morning Check-in (Readiness Check, 7 items)
create table if not exists pro_morning_checkins (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        not null references pro_users(id) on delete cascade,
  checkin_date        date        not null,
  -- 7 questions
  sleep_quality       integer     not null check (sleep_quality between 1 and 5),
  sleep_hours         numeric(3,1),
  wakeup_energy       integer     not null check (wakeup_energy between 1 and 5),
  stress_level        integer     not null check (stress_level between 1 and 5),
  cognitive_load_forecast text    not null default 'normal'
                                  check (cognitive_load_forecast in ('light','normal','heavy','extreme')),
  top_task_category   text        not null default 'decision'
                                  check (top_task_category in ('decision','creation','analysis','negotiation','presentation','match','other')),
  overall_condition   integer     not null check (overall_condition between 1 and 5),
  -- Computed
  morning_readiness   numeric(3,1),
  signal_level        text        check (signal_level in ('green','yellow','red')),
  created_at          timestamptz default now(),
  unique(user_id, checkin_date)
);

create index if not exists idx_pro_morning_user on pro_morning_checkins(user_id, checkin_date);

-- 3. Evening Check-in (Review Check, 7 items)
create table if not exists pro_evening_checkins (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        not null references pro_users(id) on delete cascade,
  checkin_date        date        not null,
  -- 7 questions
  cognitive_performance integer   not null check (cognitive_performance between 1 and 5),
  focus_peak_time     text        not null default 'morning'
                                  check (focus_peak_time in ('morning','afternoon','evening','night','scattered')),
  judgment_quality    integer     check (judgment_quality between 1 and 5),
  energy_remaining    integer     not null check (energy_remaining between 1 and 5),
  recovery_actions    text[]      not null default '{}',
  substance_intake    text        not null default 'none'
                                  check (substance_intake in ('none','light','heavy')),
  tomorrow_motivation integer     not null check (tomorrow_motivation between 1 and 5),
  -- Computed
  evening_review      numeric(3,1),
  created_at          timestamptz default now(),
  unique(user_id, checkin_date)
);

create index if not exists idx_pro_evening_user on pro_evening_checkins(user_id, checkin_date);

-- 4. Events (important events for peaking support)
create table if not exists pro_events (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  event_name      text        not null,
  event_type      text        not null default 'decision'
                              check (event_type in ('decision','match','presentation','negotiation','creation','deadline','exam','other')),
  event_date      date        not null,
  event_time      time,
  importance      integer     default 3 check (importance between 1 and 5),
  notes           text,
  is_completed    boolean     default false,
  created_at      timestamptz default now()
);

create index if not exists idx_pro_events_user on pro_events(user_id, event_date);

-- 5. Event Logs (before/after important events)
create table if not exists pro_event_logs (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  event_id        uuid        references pro_events(id) on delete set null,
  phase           text        not null check (phase in ('before','after')),
  log_date        date        not null,
  -- Before fields
  pre_condition       integer check (pre_condition between 1 and 5),
  pre_focus           integer check (pre_focus between 1 and 5),
  pre_pressure        integer check (pre_pressure between 1 and 5),
  pre_preparation     text[]  default '{}',
  -- After fields
  post_performance    integer check (post_performance between 1 and 5),
  post_judgment       integer check (post_judgment between 1 and 5),
  post_reflection     text[]  default '{}',
  -- Shared
  event_type          text,
  notes               text,
  created_at          timestamptz default now()
);

create index if not exists idx_pro_event_logs_user on pro_event_logs(user_id, log_date);

-- 6. Monthly Assessments
create table if not exists pro_monthly_assessments (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  assessment_month date       not null,
  answers         jsonb       not null default '{}',
  categories      jsonb       default '{}',
  total           integer,
  health_total    integer,
  skills_total    integer,
  level           text,
  type            text,
  brain_type      text,
  brain_type_name text,
  brain_type_axes jsonb       default '{}',
  created_at      timestamptz default now()
);

create index if not exists idx_pro_assessments_user on pro_monthly_assessments(user_id, assessment_month);

-- 7. Performance Correlations (auto-generated insights)
create table if not exists pro_performance_correlations (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  correlation_type text       not null check (correlation_type in ('best_condition','warning_pattern','trend')),
  condition_text  text        not null,
  result_text     text        not null,
  data_points     integer     default 0,
  confidence      numeric(3,2) default 0,
  details         jsonb       default '{}',
  is_active       boolean     default true,
  generated_at    timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_pro_correlations_user on pro_performance_correlations(user_id);

-- 8. Weekly Reports (auto-generated)
create table if not exists pro_weekly_reports (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  week_start      date        not null,
  summary_text    text,
  best_day        jsonb       default '{}',
  worst_day       jsonb       default '{}',
  avg_readiness   numeric(3,1),
  avg_performance numeric(3,1),
  recommendations text[],
  details         jsonb       default '{}',
  created_at      timestamptz default now(),
  unique(user_id, week_start)
);

-- 9. Monthly Reports (auto-generated)
create table if not exists pro_monthly_reports (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  report_month    date        not null,
  summary_text    text,
  brain_capital_trend jsonb   default '{}',
  habit_changes   jsonb       default '{}',
  recommendations text[],
  details         jsonb       default '{}',
  created_at      timestamptz default now(),
  unique(user_id, report_month)
);

-- 10. Risk Signals (self-alerts)
create table if not exists pro_risk_signals (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  risk_type       text        not null check (risk_type in ('burnout','sleep_debt','cognitive_decline','no_recovery')),
  risk_level      text        not null check (risk_level in ('yellow','red')),
  message         text        not null,
  recommendation  text,
  details         jsonb       default '{}',
  is_dismissed    boolean     default false,
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

create index if not exists idx_pro_risks_user on pro_risk_signals(user_id);

-- 11. Drill Menus (professional-grade Life Kinetics)
create table if not exists pro_drill_menus (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  description     text,
  category        text        not null check (category in ('spatial','dual_task','breathing','decision_speed','creative','recovery')),
  difficulty      text        not null default 'medium' check (difficulty in ('easy','medium','hard','expert')),
  duration_min    integer     default 3,
  target_personas text[]      default '{}',
  target_brain_types text[]   default '{}',
  target_conditions  text[]   default '{}',
  video_url       text,
  icon            text        default '🧠',
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

-- 12. Drill Completions
create table if not exists pro_drill_completions (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  drill_id        uuid        not null references pro_drill_menus(id) on delete cascade,
  completed_date  date        not null,
  rating          integer     check (rating between 1 and 5),
  created_at      timestamptz default now()
);

create index if not exists idx_pro_drills_user on pro_drill_completions(user_id, completed_date);

-- 13. Recommendations (intervention proposals)
create table if not exists pro_recommendations (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  rec_type        text        not null check (rec_type in ('drill','sleep','recovery','cognitive_load','routine','nutrition')),
  title           text        not null,
  description     text,
  is_completed    boolean     default false,
  rec_date        date        not null,
  created_at      timestamptz default now()
);

-- 14. Peaking Protocols (event-linked daily recommendations)
create table if not exists pro_peaking_protocols (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references pro_users(id) on delete cascade,
  event_id        uuid        not null references pro_events(id) on delete cascade,
  days_before     integer     not null,
  protocol_date   date        not null,
  sleep_rec       text,
  nutrition_rec   text,
  exercise_rec    text,
  routine_rec     text,
  drill_rec       text,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists idx_pro_peaking_event on pro_peaking_protocols(event_id, protocol_date);

-- ============================================
-- Row Level Security
-- ============================================
alter table pro_users                    enable row level security;
alter table pro_morning_checkins         enable row level security;
alter table pro_evening_checkins         enable row level security;
alter table pro_events                   enable row level security;
alter table pro_event_logs               enable row level security;
alter table pro_monthly_assessments      enable row level security;
alter table pro_performance_correlations enable row level security;
alter table pro_weekly_reports           enable row level security;
alter table pro_monthly_reports          enable row level security;
alter table pro_risk_signals             enable row level security;
alter table pro_drill_menus              enable row level security;
alter table pro_drill_completions        enable row level security;
alter table pro_recommendations          enable row level security;
alter table pro_peaking_protocols        enable row level security;

do $$
declare
  tbl text;
begin
  for tbl in values ('pro_users'),('pro_morning_checkins'),('pro_evening_checkins'),
    ('pro_events'),('pro_event_logs'),('pro_monthly_assessments'),
    ('pro_performance_correlations'),('pro_weekly_reports'),('pro_monthly_reports'),
    ('pro_risk_signals'),('pro_drill_menus'),('pro_drill_completions'),
    ('pro_recommendations'),('pro_peaking_protocols')
  loop
    execute format('create policy "anon_select_%s" on %I for select using (true)', tbl, tbl);
    execute format('create policy "anon_insert_%s" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "anon_update_%s" on %I for update using (true)', tbl, tbl);
    execute format('create policy "anon_delete_%s" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ============================================
-- Seed: Professional Drill Menus
-- ============================================
insert into pro_drill_menus (title, description, category, difficulty, duration_min, target_personas, target_conditions, target_brain_types, icon) values
  ('クロスボール・ジャグル',
   '左右の手で異なるリズムでボールをジャグリング。二重課題処理で前頭葉を活性化。',
   'dual_task', 'medium', 3,
   '{"executive","athlete","investor"}',
   '{"low_focus","low_judgment"}',
   '{"S","A"}', '🤹'),

  ('逆ストループ・チャレンジ',
   '色名が異なる色で表示される文字を読む。認知的干渉制御を鍛え、判断スピードを向上。',
   'decision_speed', 'hard', 3,
   '{"executive","athlete","investor","lawyer"}',
   '{"low_focus","low_judgment"}',
   '{"A","L"}', '🎯'),

  ('4-7-8 呼吸法',
   '4秒吸って7秒止めて8秒で吐く。副交感神経を活性化し、高ストレス状態をリセット。',
   'breathing', 'easy', 2,
   '{"executive","investor","lawyer","doctor"}',
   '{"high_stress","low_sleep","pre_event"}',
   '{}', '🌬️'),

  ('空間記憶ウォーク',
   '部屋の中の物を10個覚えてから目を閉じ、順番に指差す。空間認知と記憶の統合。',
   'spatial', 'medium', 3,
   '{"athlete","creator","executive"}',
   '{"low_focus","low_energy"}',
   '{"S","N"}', '🗺️'),

  ('マインドフル・スキャン',
   '頭から足先まで1分ずつ注意を移動。身体感覚への意識を高め、自己モニタリング力を強化。',
   'recovery', 'easy', 5,
   '{"executive","investor","doctor","lawyer"}',
   '{"high_stress","burnout_risk","low_sleep"}',
   '{}', '🧘'),

  ('ランダム計算ステップ',
   '歩きながらランダムな2桁の足し算。身体運動×認知負荷のデュアルタスクで脳を覚醒。',
   'dual_task', 'hard', 3,
   '{"athlete","executive","investor"}',
   '{"low_energy","low_focus"}',
   '{"A","L"}', '🔢'),

  ('フリーアソシエーション・ライティング',
   '3分間、テーマなしで書き続ける。内なる思考を外在化し、創造的結合を促進。',
   'creative', 'easy', 3,
   '{"creator","executive"}',
   '{"low_motivation","creative_block"}',
   '{"N","H","E"}', '✍️'),

  ('バランスボード判断',
   'バランスボード上でクイズに回答。身体バランス×認知判断の究極デュアルタスク。',
   'dual_task', 'expert', 5,
   '{"athlete","executive"}',
   '{"low_focus","pre_event"}',
   '{"S","A","P"}', '🏄'),

  ('ビジュアル・パターン記憶',
   '複雑なパターンを10秒見て再現。視覚情報処理と短期記憶を同時に鍛える。',
   'spatial', 'hard', 3,
   '{"athlete","investor","creator"}',
   '{"low_focus","low_judgment"}',
   '{"S","N"}', '👁️'),

  ('プレッシャー呼吸＋二重課題',
   '呼吸を制御しながら暗算を行う。高プレッシャー下での冷静さ×複雑処理能力を強化。',
   'dual_task', 'expert', 4,
   '{"athlete","investor","lawyer"}',
   '{"pre_event","high_stress"}',
   '{"A","L","P"}', '🧊'),

  ('グラウンディング5-4-3-2-1',
   '五感で5つ見える・4つ触れる・3つ聞こえる・2つ匂う・1つ味わう。不安をリセット。',
   'recovery', 'easy', 2,
   '{"executive","investor","lawyer","doctor"}',
   '{"high_stress","pre_event","burnout_risk"}',
   '{}', '🌿'),

  ('リバース・プランニング',
   '目標を設定し、逆算で今日のアクションを導出。前頭前野の計画機能を活性化。',
   'decision_speed', 'medium', 3,
   '{"executive","creator","investor"}',
   '{"low_motivation","low_energy"}',
   '{"L","P"}', '📋');

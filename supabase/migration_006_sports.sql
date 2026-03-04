-- ============================================
-- Migration 006: Sports Brain Capital Monitoring
-- Target: Regional soccer clubs (J-League aspirants)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Clubs (tenant)
create table if not exists clubs (
  id            uuid        default gen_random_uuid() primary key,
  club_code     text        not null unique,
  club_name     text        not null,
  sport         text        not null default 'football',
  is_active     boolean     default true,
  created_at    timestamptz default now()
);

-- 2. Teams (per club: Top, U-18, Women, etc.)
create table if not exists teams (
  id            uuid        default gen_random_uuid() primary key,
  club_code     text        not null references clubs(club_code) on delete cascade,
  team_name     text        not null,
  sort_order    integer     default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_teams_club on teams(club_code);

-- 3. Sports Users (players, coaches, trainers, admins)
create table if not exists sports_users (
  id              uuid        default gen_random_uuid() primary key,
  club_code       text        not null references clubs(club_code) on delete cascade,
  team_id         uuid        references teams(id) on delete set null,
  user_token      text        not null unique,
  display_name    text        not null default '匿名',
  squad_number    integer,
  position        text,
  role            text        not null default 'player'
                              check (role in ('player','coach','trainer','admin')),
  share_with_coach boolean    default false,
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

create index if not exists idx_sports_users_token on sports_users(user_token);
create index if not exists idx_sports_users_club  on sports_users(club_code);
create index if not exists idx_sports_users_team  on sports_users(team_id);

-- 4. Daily Check-ins (pre-training/match, 7 questions, ~2min)
create table if not exists daily_checkins (
  id                uuid        default gen_random_uuid() primary key,
  user_id           uuid        not null references sports_users(id) on delete cascade,
  club_code         text        not null,
  team_id           uuid,
  checkin_date      date        not null,
  answers           jsonb       not null default '{}',
  -- Body Readiness (4 questions avg)
  body_readiness    numeric(3,1),
  sleep_quality     integer,       -- individual scores for risk detection
  fatigue           integer,
  pain_level        integer,
  nutrition         integer,
  pain_location     text,          -- nullable free text
  -- Brain Readiness (3 questions avg)
  brain_readiness   numeric(3,1),
  stress_mood       integer,
  focus_outlook     integer,
  motivation        integer,
  -- Combined
  total_readiness   numeric(3,1),
  signal_level      text        check (signal_level in ('green','yellow','red')),
  one_word          text,          -- optional one-liner from player
  created_at        timestamptz default now(),
  unique(user_id, checkin_date)
);

create index if not exists idx_daily_checkins_user on daily_checkins(user_id, checkin_date);
create index if not exists idx_daily_checkins_club on daily_checkins(club_code, checkin_date);
create index if not exists idx_daily_checkins_team on daily_checkins(team_id, checkin_date);

-- 5. Matches (master)
create table if not exists matches (
  id              uuid        default gen_random_uuid() primary key,
  club_code       text        not null references clubs(club_code) on delete cascade,
  team_id         uuid        references teams(id) on delete set null,
  match_date      date        not null,
  opponent        text        not null,
  is_home         boolean     default true,
  competition     text,          -- e.g. リーグ戦, カップ戦, TRM
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists idx_matches_club on matches(club_code, match_date);

-- 6. Match Reports (post-match, 5 questions, ~3min)
create table if not exists match_reports (
  id                uuid        default gen_random_uuid() primary key,
  user_id           uuid        not null references sports_users(id) on delete cascade,
  match_id          uuid        not null references matches(id) on delete cascade,
  club_code         text        not null,
  team_id           uuid,
  answers           jsonb       not null default '{}',
  rpe               integer     check (rpe between 1 and 10),
  decision_sharpness integer   check (decision_sharpness between 1 and 5),
  focus_sustained   integer     check (focus_sustained between 1 and 5),
  mental_fatigue    integer     check (mental_fatigue between 1 and 5),
  physical_fatigue  integer     check (physical_fatigue between 1 and 5),
  signal_level      text        check (signal_level in ('green','yellow','red')),
  created_at        timestamptz default now(),
  unique(user_id, match_id)
);

create index if not exists idx_match_reports_user  on match_reports(user_id);
create index if not exists idx_match_reports_match on match_reports(match_id);

-- 7. Monthly Assessments (full Brain Capital, ~15min)
create table if not exists sports_monthly_assessments (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references sports_users(id) on delete cascade,
  club_code       text        not null,
  team_id         uuid,
  answers         jsonb       not null default '{}',
  categories      jsonb       default '{}',
  total           integer,
  health_total    integer,
  skills_total    integer,
  brain_type      text,
  brain_type_name text,
  brain_type_axes jsonb       default '{}',
  signal_level    text        check (signal_level in ('green','yellow','red')),
  assessment_month date       not null,   -- first day of month
  created_at      timestamptz default now()
);

create index if not exists idx_sports_monthly_user on sports_monthly_assessments(user_id);
create index if not exists idx_sports_monthly_club on sports_monthly_assessments(club_code);

-- 8. Risk Signals
create table if not exists sports_risk_signals (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references sports_users(id) on delete cascade,
  club_code       text        not null,
  team_id         uuid,
  source_type     text        not null check (source_type in ('daily_checkin','match_report','monthly_assessment','trend')),
  source_id       uuid,
  risk_level      text        not null check (risk_level in ('yellow','red')),
  risk_categories text[]      not null default '{}',
  message         text,
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

create index if not exists idx_sports_risk_user on sports_risk_signals(user_id);
create index if not exists idx_sports_risk_club on sports_risk_signals(club_code, risk_level);

-- 9. Training Menus (Life Kinetics master data)
create table if not exists training_menus (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  description     text,
  category        text        not null check (category in ('visual_decision','group_fun','breathing_cognitive','coordination','reaction','spatial')),
  intensity       text        not null default 'medium' check (intensity in ('low','medium','high')),
  duration_min    integer     default 10,
  video_url       text,
  target_tags     text[]      not null default '{}',    -- e.g. {'low_focus','low_motivation','high_fatigue'}
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

-- 10. Recommendations (proposal history)
create table if not exists sports_recommendations (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        not null references sports_users(id) on delete cascade,
  club_code       text        not null,
  menu_id         uuid        references training_menus(id) on delete set null,
  recommendation_date date    not null,
  reason          text,
  created_at      timestamptz default now()
);

create index if not exists idx_sports_rec_user on sports_recommendations(user_id, recommendation_date);

-- 11. Audit Log (trainer/coach data access)
create table if not exists sports_audit_logs (
  id              uuid        default gen_random_uuid() primary key,
  actor_id        uuid        not null,
  actor_role      text        not null,
  action          text        not null,
  target_user_id  uuid,
  target_resource text,
  details         jsonb       default '{}',
  created_at      timestamptz default now()
);

create index if not exists idx_sports_audit_actor  on sports_audit_logs(actor_id);
create index if not exists idx_sports_audit_target on sports_audit_logs(target_user_id);

-- ============================================
-- Row Level Security
-- ============================================
alter table clubs                       enable row level security;
alter table teams                       enable row level security;
alter table sports_users                enable row level security;
alter table daily_checkins              enable row level security;
alter table matches                     enable row level security;
alter table match_reports               enable row level security;
alter table sports_monthly_assessments  enable row level security;
alter table sports_risk_signals         enable row level security;
alter table training_menus              enable row level security;
alter table sports_recommendations      enable row level security;
alter table sports_audit_logs           enable row level security;

-- Allow all via anon key (MVP; production should use Supabase Auth + fine-grained RLS)
do $$
declare
  tbl text;
begin
  for tbl in values ('clubs'),('teams'),('sports_users'),('daily_checkins'),
    ('matches'),('match_reports'),('sports_monthly_assessments'),
    ('sports_risk_signals'),('training_menus'),('sports_recommendations'),
    ('sports_audit_logs')
  loop
    execute format('create policy "anon_select_%s" on %I for select using (true)', tbl, tbl);
    execute format('create policy "anon_insert_%s" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "anon_update_%s" on %I for update using (true)', tbl, tbl);
    execute format('create policy "anon_delete_%s" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ============================================
-- Seed: Default Life Kinetics Training Menus
-- ============================================
insert into training_menus (title, description, category, intensity, duration_min, target_tags) values
  ('ボール2個パス＆キャッチ', '2人1組で異なる色のボールを同時に投げ合い、指定された手でキャッチ。視覚判断と反応速度を鍛える。', 'visual_decision', 'medium', 8, '{"low_focus","low_decision"}'),
  ('カラーコーンタッチ', 'ランダムに色を指示し、対応するコーンにタッチ。色と方向の判断を瞬時に行う。', 'reaction', 'medium', 6, '{"low_focus","low_reaction"}'),
  ('ミラードリブル', 'ペアの動きを鏡のように真似しながらドリブル。空間認知と協調性を高める。', 'coordination', 'medium', 10, '{"low_focus","low_coordination"}'),
  ('ナンバーズゲーム', '走りながら計算問題に答える。認知負荷＋有酸素で脳を活性化。', 'group_fun', 'high', 12, '{"low_motivation","low_energy"}'),
  ('ブレス＆バランス', '片足立ちで呼吸法を行いながら、指示された方向を指す。低強度で認知と呼吸を統合。', 'breathing_cognitive', 'low', 5, '{"high_fatigue","high_stress","low_sleep"}'),
  ('3色ビブスロンド', '3色のビブスでロンド。ボール保持者の色で味方が変わるルール。判断と切替を鍛える。', 'visual_decision', 'high', 15, '{"low_decision","low_focus"}'),
  ('リズムステップ＆コール', 'ラダーをリズムよく踏みながら、指示された言葉を叫ぶ。二重課題で脳を刺激。', 'coordination', 'medium', 8, '{"low_motivation","low_energy"}'),
  ('ブラインドパス', '目を閉じた状態で味方の声を頼りにパス。聴覚と空間認知を強化。', 'spatial', 'low', 8, '{"low_focus","low_communication"}'),
  ('じゃんけんダッシュ', 'じゃんけんの結果で走る方向が変わる。楽しみながら反応速度を鍛える。', 'group_fun', 'medium', 6, '{"low_motivation","low_energy","high_stress"}'),
  ('4マスシャッフル', '4つのマスを指示通りに移動。パターンが変わるたびに脳がリセットされ、適応力が鍛えられる。', 'reaction', 'medium', 8, '{"low_focus","low_reaction","low_decision"}');

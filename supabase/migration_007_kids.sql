-- ============================================
-- Migration 007: Kids/Teens Brain Capital Learning Support
-- Target: Elementary (8-12) to High School (15-18)
-- Channels: Cram schools, after-school, home
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Kid Organizations (塾/習い事/家庭 = tenant)
create table if not exists kid_orgs (
  id            uuid        default gen_random_uuid() primary key,
  org_code      text        not null unique,
  org_name      text        not null,
  org_type      text        not null default 'juku'
                            check (org_type in ('juku','school','afterschool','home')),
  is_active     boolean     default true,
  created_at    timestamptz default now()
);

-- 2. Groups (クラス、学年)
create table if not exists kid_groups (
  id            uuid        default gen_random_uuid() primary key,
  org_code      text        not null references kid_orgs(org_code) on delete cascade,
  group_name    text        not null,
  sort_order    integer     default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_kid_groups_org on kid_groups(org_code);

-- 3. Children
create table if not exists children (
  id              uuid        default gen_random_uuid() primary key,
  org_code        text        not null references kid_orgs(org_code) on delete cascade,
  group_id        uuid        references kid_groups(id) on delete set null,
  child_token     text        not null unique,
  display_name    text        not null,
  age_group       text        not null default 'kids'
                              check (age_group in ('kids','teens')),
  birth_year      integer,
  share_with_parent boolean   default true,
  streak_count    integer     default 0,
  last_checkin    date,
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

create index if not exists idx_children_token on children(child_token);
create index if not exists idx_children_org   on children(org_code);

-- 4. Parents
create table if not exists parents (
  id              uuid        default gen_random_uuid() primary key,
  parent_token    text        not null unique,
  display_name    text        not null default '保護者',
  email           text,
  created_at      timestamptz default now()
);

create index if not exists idx_parents_token on parents(parent_token);

-- 5. Parent-Child relationship (1:N)
create table if not exists parent_children (
  id              uuid        default gen_random_uuid() primary key,
  parent_id       uuid        not null references parents(id) on delete cascade,
  child_id        uuid        not null references children(id) on delete cascade,
  created_at      timestamptz default now(),
  unique(parent_id, child_id)
);

-- 6. Instructors
create table if not exists kid_instructors (
  id              uuid        default gen_random_uuid() primary key,
  org_code        text        not null references kid_orgs(org_code) on delete cascade,
  instructor_token text       not null unique,
  display_name    text        not null,
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

create index if not exists idx_kid_instructors_token on kid_instructors(instructor_token);

-- 7. Consents (保護者同意, legally required for minors)
create table if not exists kid_consents (
  id              uuid        default gen_random_uuid() primary key,
  parent_id       uuid        not null references parents(id) on delete cascade,
  child_id        uuid        not null references children(id) on delete cascade,
  consent_type    text        not null default 'usage'
                              check (consent_type in ('usage','data_sharing')),
  status          text        not null default 'pending'
                              check (status in ('pending','granted','revoked')),
  granted_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz default now(),
  unique(parent_id, child_id, consent_type)
);

-- 8. Daily Check-ins (kids: 3Q/3-level, teens: 5Q/5-level)
create table if not exists kid_daily_checkins (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  org_code        text        not null,
  group_id        uuid,
  age_group       text        not null,
  checkin_date    date        not null,
  answers         jsonb       not null default '{}',
  readiness_score numeric(3,1),
  signal_level    text        check (signal_level in ('green','yellow','red')),
  -- Individual scores (kids: 1-3, teens: 1-5)
  sleep_score     integer,
  mood_score      integer,
  motivation_score integer,
  fatigue_score   integer,     -- teens only
  focus_score     integer,     -- teens only
  created_at      timestamptz default now(),
  unique(child_id, checkin_date)
);

create index if not exists idx_kid_checkins_child on kid_daily_checkins(child_id, checkin_date);
create index if not exists idx_kid_checkins_org   on kid_daily_checkins(org_code, checkin_date);

-- 9. Weekly Reflections (not scored, for self-reflection)
create table if not exists kid_weekly_reflections (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  org_code        text        not null,
  week_start      date        not null,
  best_thing      text,          -- 今週いちばん楽しかったこと (選択)
  hardest_thing   text,          -- 今週いちばん大変だったこと (選択)
  next_week_goal  text,          -- 来週やってみたいこと (自由)
  created_at      timestamptz default now(),
  unique(child_id, week_start)
);

-- 10. Monthly Assessments
create table if not exists kid_monthly_assessments (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  org_code        text        not null,
  age_group       text        not null,
  answers         jsonb       not null default '{}',
  categories      jsonb       default '{}',
  total           integer,
  brain_type      text,
  brain_type_name text,
  brain_type_axes jsonb       default '{}',
  assessment_month date       not null,
  created_at      timestamptz default now()
);

-- 11. Risk Signals
create table if not exists kid_risk_signals (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  org_code        text        not null,
  source_type     text        not null check (source_type in ('daily_checkin','trend','monthly_assessment')),
  source_id       uuid,
  risk_level      text        not null check (risk_level in ('yellow','red')),
  risk_categories text[]      not null default '{}',
  message_child   text,        -- safe, gentle message for child
  message_parent  text,        -- abstract hint for parent
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

create index if not exists idx_kid_risk_child on kid_risk_signals(child_id);

-- 12. Drill Menus (age-appropriate Life Kinetics)
create table if not exists kid_drill_menus (
  id              uuid        default gen_random_uuid() primary key,
  title           text        not null,
  description     text,
  category        text        not null check (category in ('visual','coordination','breathing','challenge','group_fun')),
  difficulty      text        not null default 'easy' check (difficulty in ('easy','medium','hard')),
  target_age      text        not null default 'all' check (target_age in ('kids','teens','all')),
  duration_min    integer     default 2,
  video_url       text,
  target_tags     text[]      not null default '{}',
  stamp_icon      text        default '⭐',
  is_active       boolean     default true,
  created_at      timestamptz default now()
);

-- 13. Drill Completions
create table if not exists kid_drill_completions (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  drill_id        uuid        not null references kid_drill_menus(id) on delete cascade,
  completed_date  date        not null,
  created_at      timestamptz default now()
);

create index if not exists idx_kid_drills_child on kid_drill_completions(child_id, completed_date);

-- 14. Badges
create table if not exists kid_badges (
  id              uuid        default gen_random_uuid() primary key,
  badge_key       text        not null unique,
  title           text        not null,
  description     text,
  icon            text        not null default '🏅',
  condition_type  text        not null check (condition_type in ('streak','drill_count','checkin_count','brain_type','first_action')),
  condition_value integer     default 1,
  is_active       boolean     default true
);

-- 15. Child Badges (earned)
create table if not exists kid_child_badges (
  id              uuid        default gen_random_uuid() primary key,
  child_id        uuid        not null references children(id) on delete cascade,
  badge_id        uuid        not null references kid_badges(id) on delete cascade,
  earned_at       timestamptz default now(),
  unique(child_id, badge_id)
);

-- 16. Parent Weekly Summary (generated text + tips)
create table if not exists kid_parent_summaries (
  id              uuid        default gen_random_uuid() primary key,
  parent_id       uuid        not null references parents(id) on delete cascade,
  child_id        uuid        not null references children(id) on delete cascade,
  week_start      date        not null,
  summary_text    text,
  tip_text        text,
  signal_notice   text,        -- abstract alert if risk detected
  created_at      timestamptz default now(),
  unique(parent_id, child_id, week_start)
);

-- 17. Audit Log
create table if not exists kid_audit_logs (
  id              uuid        default gen_random_uuid() primary key,
  actor_id        uuid        not null,
  actor_role      text        not null,
  action          text        not null,
  target_child_id uuid,
  target_resource text,
  details         jsonb       default '{}',
  created_at      timestamptz default now()
);

-- ============================================
-- Row Level Security
-- ============================================
alter table kid_orgs                enable row level security;
alter table kid_groups              enable row level security;
alter table children                enable row level security;
alter table parents                 enable row level security;
alter table parent_children         enable row level security;
alter table kid_instructors         enable row level security;
alter table kid_consents            enable row level security;
alter table kid_daily_checkins      enable row level security;
alter table kid_weekly_reflections  enable row level security;
alter table kid_monthly_assessments enable row level security;
alter table kid_risk_signals        enable row level security;
alter table kid_drill_menus         enable row level security;
alter table kid_drill_completions   enable row level security;
alter table kid_badges              enable row level security;
alter table kid_child_badges        enable row level security;
alter table kid_parent_summaries    enable row level security;
alter table kid_audit_logs          enable row level security;

do $$
declare
  tbl text;
begin
  for tbl in values ('kid_orgs'),('kid_groups'),('children'),('parents'),
    ('parent_children'),('kid_instructors'),('kid_consents'),
    ('kid_daily_checkins'),('kid_weekly_reflections'),('kid_monthly_assessments'),
    ('kid_risk_signals'),('kid_drill_menus'),('kid_drill_completions'),
    ('kid_badges'),('kid_child_badges'),('kid_parent_summaries'),('kid_audit_logs')
  loop
    execute format('create policy "anon_select_%s" on %I for select using (true)', tbl, tbl);
    execute format('create policy "anon_insert_%s" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "anon_update_%s" on %I for update using (true)', tbl, tbl);
    execute format('create policy "anon_delete_%s" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ============================================
-- Seed: Badges
-- ============================================
insert into kid_badges (badge_key, title, description, icon, condition_type, condition_value) values
  ('streak_3',    '3日れんぞく！',     '3日つづけてチェックインしたよ', '🔥', 'streak', 3),
  ('streak_7',    '1しゅうかん！',      '7日つづけてチェックイン！すごい！', '🌟', 'streak', 7),
  ('streak_30',   '1かげつ！',         '30日つづけた！きみはすごい！', '👑', 'streak', 30),
  ('drill_5',     'ドリル5かい',       'ドリルを5回やったよ', '💪', 'drill_count', 5),
  ('drill_20',    'ドリルマスター',     'ドリルを20回クリア！', '🧠', 'drill_count', 20),
  ('checkin_10',  'チェックイン10かい', '10回チェックインしたよ', '📝', 'checkin_count', 10),
  ('brain_type',  'のうタイプはっけん', '自分のBrain Typeがわかったよ', '🔬', 'brain_type', 1),
  ('first_drill', 'はじめてのドリル',   'はじめてドリルをやったよ！', '🎉', 'first_action', 1);

-- ============================================
-- Seed: Drill Menus (kids-friendly Life Kinetics)
-- ============================================
insert into kid_drill_menus (title, description, category, difficulty, target_age, duration_min, target_tags, stamp_icon) values
  ('おてだまキャッチ', 'おてだまを右手でなげて、左手でキャッチ！10回できるかな？', 'coordination', 'easy', 'all', 2, '{"low_focus","low_motivation"}', '🤹'),
  ('いろいろタッチ', '「あか！」といわれたら赤いものにタッチ。色がかわるたびにはしろう！', 'visual', 'easy', 'kids', 2, '{"low_focus","low_mood"}', '🎨'),
  ('かたあしバランス', 'かたあしで立って、目をとじて10びょう。できたら手もうごかしてみよう！', 'breathing', 'easy', 'all', 1, '{"high_fatigue","low_sleep"}', '🧘'),
  ('グーチョキパー体そう', 'あしでグーチョキパーをしながら、手では反対のグーチョキパー！', 'coordination', 'medium', 'all', 2, '{"low_focus","low_motivation"}', '✌️'),
  ('ボールはさみリレー', '友だちとボールをはさんではこぼう！落としたらスタートから！', 'group_fun', 'easy', 'kids', 3, '{"low_motivation","low_mood"}', '⚽'),
  ('のびのびブレス', '大きくのびて〜、ゆっくりおなかから息をはいて〜。3回やってみよう', 'breathing', 'easy', 'all', 1, '{"high_fatigue","low_sleep","low_mood"}', '🌬️'),
  ('逆手チャレンジ', 'ふだん使わない手で文字を書いてみよう。むずかしいけど脳が活性化！', 'challenge', 'medium', 'teens', 3, '{"low_focus","low_motivation"}', '✍️'),
  ('数字ステップ', 'ランダムに言われた数字のマスにすばやく移動！計算しながらうごこう', 'visual', 'medium', 'teens', 3, '{"low_focus"}', '🔢'),
  ('じゃんけんジャンプ', 'じゃんけんして、勝ったら前にジャンプ！負けたら後ろ！', 'group_fun', 'easy', 'all', 2, '{"low_motivation","low_mood","high_fatigue"}', '🏃'),
  ('ミラームーブ', 'ペアの人のうごきをかがみのようにマネしよう。左右がぎゃくになるよ！', 'coordination', 'hard', 'teens', 3, '{"low_focus","low_motivation"}', '🪞');

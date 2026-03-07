-- Migration 009: Senior Brain Wellness vertical
-- Target: 60+ seniors, families, care staff, org admins (municipalities, care providers)
-- Positive framing: "脳の元気度" not "認知症予防"

-- ============================================================
-- 1. Organizations (自治体/介護事業者/コミュニティ)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL DEFAULT 'municipality'
    CHECK (org_type IN ('municipality','care_provider','community','corporate_retiree','other')),
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  privacy_policy_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. Groups (教室, サークル, 地区)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES senior_organizations(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  group_type TEXT DEFAULT 'class'
    CHECK (group_type IN ('class','circle','district','facility','other')),
  min_anonymity_k INT DEFAULT 5,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. Seniors (本人)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_token TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  birth_year INT,
  gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  org_id UUID REFERENCES senior_organizations(id),
  group_id UUID REFERENCES senior_groups(id),
  answer_mode TEXT DEFAULT '3scale' CHECK (answer_mode IN ('3scale','5scale')),
  font_size TEXT DEFAULT 'large' CHECK (font_size IN ('large','xlarge','xxlarge')),
  line_user_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. Family / Supporters (家族/支援者)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_token TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  line_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Link: senior <-> family (1:N)
CREATE TABLE IF NOT EXISTS senior_family_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES senior_family_members(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'child'
    CHECK (relationship IN ('spouse','child','sibling','grandchild','friend','other')),
  sharing_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id, family_id)
);

-- ============================================================
-- 5. Care Staff (専門職)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_care_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_token TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'care_manager'
    CHECK (role IN ('care_manager','social_worker','doctor','nurse','therapist','other')),
  org_id UUID REFERENCES senior_organizations(id),
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Consent (同意管理)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN ('service_use','care_staff_sharing','family_sharing','org_aggregate')),
  consent_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (consent_status IN ('pending','granted','revoked')),
  target_id UUID, -- care_staff id or family id if applicable
  scope JSONB DEFAULT '{}',
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Consent review flags (認知機能低下が疑われる場合)
CREATE TABLE IF NOT EXISTS senior_consent_review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  flagged_by_type TEXT NOT NULL CHECK (flagged_by_type IN ('care_staff','family')),
  flagged_by_id UUID NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. Daily Check-in
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  answer_mode TEXT NOT NULL DEFAULT '3scale',

  -- 3-scale questions (1=bad, 2=ok, 3=good) or 5-scale (1-5)
  sleep_quality INT,
  mood INT,
  went_outside INT,
  social_interaction INT,
  forgetfulness INT, -- inverted: higher=less forgetful=better

  -- 5-scale additional questions
  body_condition INT,
  activity_motivation INT,

  -- Computed
  brain_wellness_score NUMERIC(3,1),
  signal_level TEXT DEFAULT 'green' CHECK (signal_level IN ('green','yellow','red')),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id, checkin_date)
);

-- ============================================================
-- 8. Monthly Assessment
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_monthly_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  assessment_month TEXT NOT NULL, -- 'YYYY-MM'
  answer_mode TEXT NOT NULL DEFAULT '3scale',

  -- Category scores (1-5 normalized)
  sleep_nutrition_score NUMERIC(3,1),
  exercise_score NUMERIC(3,1),
  health_management_score NUMERIC(3,1),
  curiosity_score NUMERIC(3,1),
  communication_score NUMERIC(3,1),
  planning_score NUMERIC(3,1),
  hobby_engagement_score NUMERIC(3,1),
  social_participation_score NUMERIC(3,1),
  community_score NUMERIC(3,1),
  role_sense_score NUMERIC(3,1),

  overall_score NUMERIC(3,1),
  responses JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id, assessment_month)
);

-- ============================================================
-- 9. Brain Type (4軸)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_brain_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  axis_sn INT CHECK (axis_sn BETWEEN 1 AND 5),
  axis_ah INT CHECK (axis_ah BETWEEN 1 AND 5),
  axis_le INT CHECK (axis_le BETWEEN 1 AND 5),
  axis_pf INT CHECK (axis_pf BETWEEN 1 AND 5),
  type_code TEXT,
  type_name_jp TEXT, -- e.g. 'じっくり観察タイプ'
  type_description TEXT,
  diagnosed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id)
);

-- ============================================================
-- 10. Risk Signals (赤信号)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  risk_type TEXT NOT NULL
    CHECK (risk_type IN ('social_isolation','persistent_low_mood','sleep_disruption','forgetfulness_spike','motivation_loss')),
  risk_level TEXT NOT NULL DEFAULT 'yellow' CHECK (risk_level IN ('yellow','red')),
  message TEXT NOT NULL,
  recommendation TEXT,
  family_notification_text TEXT,
  care_staff_details TEXT,
  is_dismissed BOOLEAN DEFAULT FALSE,
  family_notified BOOLEAN DEFAULT FALSE,
  care_staff_notified BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. Drill Menu (ライフキネティック・かんたんドリル)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_drill_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🧠',
  category TEXT NOT NULL
    CHECK (category IN ('social','motivation','memory','challenge','body','breathing','coordination')),
  difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy','normal','challenge')),
  duration_min INT DEFAULT 2,
  video_url TEXT,
  has_subtitles BOOLEAN DEFAULT TRUE,
  instructions TEXT, -- large text step-by-step
  target_conditions TEXT[] DEFAULT '{}',
  target_brain_types TEXT[] DEFAULT '{}',
  pair_mode BOOLEAN DEFAULT FALSE, -- 誰かと一緒にやるドリル
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. Drill Completions
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_drill_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  drill_id UUID NOT NULL REFERENCES senior_drill_menus(id),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 13. Calendar Stamps
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_calendar_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  stamp_date DATE NOT NULL,
  stamp_type TEXT NOT NULL CHECK (stamp_type IN ('checkin','drill','assessment')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id, stamp_date, stamp_type)
);

-- ============================================================
-- 14. Family Weekly Summary (声かけカード)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_family_weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id UUID NOT NULL REFERENCES senior_users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES senior_family_members(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  trend_text TEXT, -- 抽象的傾向テキスト（生データなし）
  voice_card_text TEXT, -- 声かけカードテキスト
  checkin_count INT DEFAULT 0,
  drill_count INT DEFAULT 0,
  has_risk_signal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(senior_id, family_id, week_start)
);

-- ============================================================
-- 15. Audit Log (アクセスログ)
-- ============================================================
CREATE TABLE IF NOT EXISTS senior_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessor_type TEXT NOT NULL CHECK (accessor_type IN ('senior','family','care_staff','org_admin')),
  accessor_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_senior_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Seed: Default drill menus
-- ============================================================
INSERT INTO senior_drill_menus (title, description, icon, category, difficulty, duration_min, instructions, target_conditions, pair_mode, sort_order)
VALUES
  ('手拍子リズム', '手拍子でリズムを刻みながら、1から10まで声に出して数えましょう。慣れたら3の倍数で手拍子を止めてみましょう。', '👏', 'coordination', 'easy', 1,
   '1. 椅子に座って背筋を伸ばします\n2. 手拍子をしながら1から10まで数えます\n3. 慣れたら3の倍数（3,6,9）で手を叩かずに止めます\n4. できたら逆から数えてみましょう',
   ARRAY['low_motivation','any'], FALSE, 1),

  ('ゆびおり体操', '両手の指を1本ずつ折って数を数えます。右手と左手で違う数を折ってみましょう。', '✋', 'coordination', 'easy', 2,
   '1. 両手を前に出します\n2. 右手で1から5まで指を折ります\n3. 左手で5から1まで指を折ります\n4. 両手同時にやってみましょう',
   ARRAY['any'], FALSE, 2),

  ('散歩しりとり', 'お散歩しながら、目に入ったものでしりとりをしましょう。一人でも、誰かと一緒でも楽しめます。', '🚶', 'memory', 'easy', 3,
   '1. 外に出て歩き始めます\n2. 目に入ったものの名前を声に出します\n3. その最後の文字から始まるものを探します\n4. 5分間続けてみましょう',
   ARRAY['low_social','forgetful'], TRUE, 3),

  ('じゃんけん体操', '画面に出る手を見て、「勝つ手」か「負ける手」を出す脳トレです。最初はゆっくり、慣れたらテンポアップ！', '✊', 'challenge', 'normal', 2,
   '1. 画面に「グー」「チョキ」「パー」が出ます\n2. 最初は「勝つ手」を出してください\n3. 慣れたら「負ける手」を出してください\n4. テンポが上がっていきます',
   ARRAY['any'], FALSE, 4),

  ('ペア de 数え歌', 'お二人で向かい合って、交互に数を数えます。3の倍数で手を叩き、5の倍数で「パン」と声を出しましょう。', '👫', 'social', 'normal', 3,
   '1. 二人で向かい合います\n2. 交互に1から数えます\n3. 3の倍数のときは手を叩きます\n4. 5の倍数のときは「パン」と言います',
   ARRAY['low_social'], TRUE, 5),

  ('深呼吸リラックス', 'ゆっくり深呼吸をして、心と体をリラックスさせましょう。4秒吸って、7秒止めて、8秒吐きます。', '🌬️', 'breathing', 'easy', 2,
   '1. 楽な姿勢で座ります\n2. 鼻から4秒かけて吸います\n3. 7秒間息を止めます\n4. 口から8秒かけてゆっくり吐きます\n5. 3回くり返しましょう',
   ARRAY['low_mood','sleep_poor'], FALSE, 6),

  ('利き手チェンジ', '普段と反対の手で簡単な動作をしてみましょう。お箸を持つ、字を書く、ボールを投げるなど。', '🤚', 'challenge', 'challenge', 3,
   '1. 反対の手で名前を書いてみましょう\n2. 反対の手でコップを持ってみましょう\n3. うまくできなくても大丈夫です\n4. 脳が新しい動きを学んでいる証拠です',
   ARRAY['high_energy'], FALSE, 7),

  ('思い出しトレーニング', 'きのうの夕ごはんを思い出してみましょう。何を食べた？誰と食べた？テレビは何を見た？', '💭', 'memory', 'easy', 2,
   '1. 目を閉じます\n2. きのうの夕ごはんを思い出します\n3. メニューを声に出して言います\n4. その前後に何をしたか思い出します',
   ARRAY['forgetful'], FALSE, 8),

  ('足踏みカウント', '椅子に座ったまま足踏みをしながら、100から7ずつ引き算をしましょう。', '🦶', 'coordination', 'normal', 2,
   '1. 椅子に座って背筋を伸ばします\n2. その場で足踏みを始めます\n3. 100から7を引いていきます（100, 93, 86...）\n4. ゆっくりで大丈夫です',
   ARRAY['any'], FALSE, 9),

  ('季節の歌', '季節の歌を歌いながら、手で拍子をとりましょう。歌を思い出すことも、立派な脳トレです。', '🎵', 'social', 'easy', 2,
   '1. 今の季節に合った歌を思い出しましょう\n2. 歌いながら手拍子をしましょう\n3. 2番の歌詞も思い出してみましょう\n4. 誰かと一緒ならもっと楽しいです',
   ARRAY['low_social','low_motivation'], TRUE, 10);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE senior_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_family_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_care_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_consent_review_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_monthly_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_brain_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_drill_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_drill_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_calendar_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_family_weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE senior_audit_logs ENABLE ROW LEVEL SECURITY;

-- Anon key policies (token-based auth at app level)
CREATE POLICY senior_organizations_all ON senior_organizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_groups_all ON senior_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_users_all ON senior_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_family_members_all ON senior_family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_family_links_all ON senior_family_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_care_staff_all ON senior_care_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_consents_all ON senior_consents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_consent_review_flags_all ON senior_consent_review_flags FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_daily_checkins_all ON senior_daily_checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_monthly_assessments_all ON senior_monthly_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_brain_types_all ON senior_brain_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_risk_signals_all ON senior_risk_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_drill_menus_all ON senior_drill_menus FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_drill_completions_all ON senior_drill_completions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_calendar_stamps_all ON senior_calendar_stamps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_family_weekly_summaries_all ON senior_family_weekly_summaries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY senior_audit_logs_all ON senior_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_senior_checkins_date ON senior_daily_checkins(senior_id, checkin_date);
CREATE INDEX idx_senior_risk_signals_active ON senior_risk_signals(senior_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_senior_calendar_stamps ON senior_calendar_stamps(senior_id, stamp_date);
CREATE INDEX idx_senior_family_links_senior ON senior_family_links(senior_id);
CREATE INDEX idx_senior_audit_logs_target ON senior_audit_logs(target_senior_id, created_at);
CREATE INDEX idx_senior_drill_completions ON senior_drill_completions(senior_id, completed_date);
CREATE INDEX idx_senior_users_org ON senior_users(org_id);
CREATE INDEX idx_senior_users_group ON senior_users(group_id);

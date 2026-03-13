# UNLOCK Brain Capital App — 開発ドキュメント

## プロジェクト概要

**UNLOCK Brain Capital** は、神経科学に基づいた「脳の資産（Brain Capital）」セルフ診断アプリ。
78問の質問で Brain Health（脳の健康）、Brain Skills（脳のスキル）、Brain Type（脳タイプ）の3軸を測定し、150点満点のスコアと16タイプの脳タイプを判定する。

- **URL**: Vercelでホスティング
- **スタック**: Vanilla JS（フレームワークなし）+ Supabase（PostgreSQL）+ Vercel Serverless
- **ビルドプロセス**: なし（静的HTML/JS/CSS）
- **認証**: LINE LIFF + トークンベース（垂直ごと）
- **決済**: なし（完全無料）

---

## ディレクトリ構成

```
braincapital_app2/
├── api/
│   └── mcp.js                    # ChatGPT Apps用MCPサーバー（Vercel Serverless）
├── chatgpt-app/
│   ├── SETUP.md                  # ChatGPT Apps セットアップガイド
│   ├── privacy.html              # プライバシーポリシー（ChatGPT用）
│   └── widget.html               # MCPウィジェット（5問チェック画面）
├── corporate/                    # 法人向け健康経営バーティカル
│   ├── css/
│   │   ├── corporate.css         # 従業員用CSS (130行)
│   │   ├── hr.css                # HR管理画面CSS (72行)
│   │   └── oh.css                # 産業医画面CSS (80行)
│   ├── js/
│   │   ├── app.js                # 従業員チェックイン・月次診断 (564行)
│   │   ├── hr.js                 # HR管理ダッシュボード (529行)
│   │   └── oh.js                 # 産業医ダッシュボード (454行)
│   ├── index.html                # 従業員向け画面
│   ├── hr.html                   # HR管理画面
│   └── oh.html                   # 産業医画面
├── css/
│   └── style.css                 # メインアプリCSS (2222行)
├── js/
│   ├── app.js                    # メインアプリ ロジック (2244行) ★最重要ファイル
│   └── supabase-config.js        # Supabase/LINE LIFF設定
├── kids/                         # 子ども向けバーティカル（8-18歳）
│   ├── css/kids.css              # (160行)
│   ├── js/
│   │   ├── app.js                # 子どもチェックイン・診断 (666行)
│   │   ├── instructor.js         # 指導者ダッシュボード (228行)
│   │   └── parent.js             # 保護者ダッシュボード (235行)
│   ├── index.html                # 子ども向け画面
│   ├── instructor.html           # 指導者画面
│   └── parent.html               # 保護者画面
├── lp/
│   ├── index.html                # ランディングページ
│   └── style.css                 # LP用CSS (563行)
├── pro/                          # プロフェッショナル向けバーティカル
│   ├── css/pro.css               # (309行)
│   ├── js/app.js                 # 朝夕チェックイン・イベント管理 (1279行)
│   └── index.html                # プロ向け画面
├── senior/                       # シニア向けバーティカル（60歳以上）
│   ├── css/senior.css            # (876行)
│   ├── js/app.js                 # シニアチェックイン・脳の元気度 (1156行)
│   ├── index.html                # シニア向け画面
│   ├── family.html               # 家族ダッシュボード
│   ├── care.html                 # ケアスタッフ画面
│   └── org.html                  # 組織管理画面
├── sports/                       # スポーツ向けバーティカル
│   ├── css/
│   │   ├── sports.css            # 選手用CSS (192行)
│   │   ├── coach.css             # コーチ用CSS (22行)
│   │   └── trainer.css           # トレーナー用CSS (38行)
│   ├── js/
│   │   ├── app.js                # 選手チェックイン・試合後レポート (669行)
│   │   ├── coach.js              # コーチダッシュボード (430行)
│   │   └── trainer.js            # トレーナーダッシュボード (448行)
│   ├── index.html                # 選手向け画面
│   ├── coach.html                # コーチ画面
│   └── trainer.html              # トレーナー画面
├── supabase/                     # データベースマイグレーション
│   ├── migration.sql             # v1: assessment_results テーブル
│   ├── migration_002_answers.sql # v2: 回答個別記録
│   ├── migration_003_brain_type.sql # v3: 脳タイプカラム追加
│   ├── migration_004_organizations.sql # v4: 組織コード
│   ├── migration_005_corporate.sql # v5: 法人向けスキーマ
│   ├── migration_006_sports.sql  # v6: スポーツ向けスキーマ
│   ├── migration_007_kids.sql    # v7: 子ども向けスキーマ
│   ├── migration_008_pro.sql     # v8: プロ向けスキーマ
│   └── migration_009_senior.sql  # v9: シニア向けスキーマ
├── admin.html                    # 管理者ダッシュボード（結果一覧・統計）
├── index.html                    # メイン診断アプリ ★最重要ファイル
├── package.json                  # npm設定
├── package-lock.json
└── vercel.json                   # Vercelデプロイ設定
```

---

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Vanilla HTML/JS/CSS（フレームワークなし） |
| バックエンド | Vercel Serverless Functions (Node.js ESM) |
| データベース | Supabase (PostgreSQL) — クライアントサイドからREST API直接呼出 |
| 認証 | LINE LIFF SDK（メインアプリ）、トークンベース（各バーティカル） |
| AI連携 | MCP (Model Context Protocol) サーバー for ChatGPT Apps |
| ホスティング | Vercel（静的ファイル + Serverless） |
| CDN | Supabase JS SDK (CDN)、LINE LIFF SDK (CDN)、Chart.js (CDN) |

### 外部サービス依存

| サービス | 用途 | 設定場所 |
|----------|------|----------|
| **Supabase** | PostgreSQLデータベース + REST API | `js/supabase-config.js` |
| **LINE LIFF** | ユーザー認証・プロフィール取得 | `js/supabase-config.js` |
| **Vercel** | ホスティング + Serverless | `vercel.json` |
| **ChatGPT Apps** | MCP経由の5問チェック | `api/mcp.js` |

---

## package.json

```json
{
  "name": "braincapital-chatgpt-app",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "UNLOCK Brain Capital monitoring app for Apps in ChatGPT",
  "dependencies": {
    "@modelcontextprotocol/ext-apps": "^1.0.1",
    "@modelcontextprotocol/sdk": "^1.20.2",
    "mcp-handler": "^1.0.7",
    "zod": "^3.25.76"
  }
}
```

---

## vercel.json 設定

```json
{
  "functions": {
    "api/mcp.js": {
      "includeFiles": "chatgpt-app/widget.html"
    }
  },
  "rewrites": [
    { "source": "/app", "destination": "/index.html" },
    { "source": "/admin", "destination": "/admin.html" },
    { "source": "/corporate", "destination": "/corporate/index.html" },
    { "source": "/corporate/hr", "destination": "/corporate/hr.html" },
    { "source": "/corporate/oh", "destination": "/corporate/oh.html" },
    { "source": "/sports", "destination": "/sports/index.html" },
    { "source": "/sports/coach", "destination": "/sports/coach.html" },
    { "source": "/sports/trainer", "destination": "/sports/trainer.html" },
    { "source": "/kids", "destination": "/kids/index.html" },
    { "source": "/kids/parent", "destination": "/kids/parent.html" },
    { "source": "/kids/instructor", "destination": "/kids/instructor.html" },
    { "source": "/pro", "destination": "/pro/index.html" },
    { "source": "/senior", "destination": "/senior/index.html" },
    { "source": "/senior/family", "destination": "/senior/family.html" },
    { "source": "/senior/care", "destination": "/senior/care.html" },
    { "source": "/senior/org", "destination": "/senior/org.html" },
    { "source": "/chatgpt/privacy", "destination": "/chatgpt-app/privacy.html" },
    { "source": "/", "destination": "/lp/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors *" }
      ]
    }
  ]
}
```

**ルーティング構成:**
- `/` → ランディングページ (`lp/index.html`)
- `/app` → メイン診断アプリ (`index.html`)
- `/admin` → 管理画面 (`admin.html`)
- `/corporate`, `/corporate/hr`, `/corporate/oh` → 法人向け
- `/sports`, `/sports/coach`, `/sports/trainer` → スポーツ向け
- `/kids`, `/kids/parent`, `/kids/instructor` → 子ども向け
- `/pro` → プロ向け
- `/senior`, `/senior/family`, `/senior/care`, `/senior/org` → シニア向け

---

## 環境設定（js/supabase-config.js）

```javascript
var SUPABASE_URL = 'https://kffeqhnbpedixdvbdcug.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_...';  // Supabase anonymous key
var LIFF_ID = '2009225805-gmfSXvqU';           // LINE LIFF ID
var ADMIN_PASSWORD_HASH = '50f65bd5...';        // SHA-256 of admin password (default: "unlock2025")
```

このファイルは各バーティカルのHTMLから `<script src="/js/supabase-config.js">` で読み込まれる。

---

## メインアプリ（index.html + js/app.js）

### 診断フロー

```
ランディング → モード選択 → 質問回答（スライダー1-5） → スコア計算 → 結果表示
```

### 3つの診断モード

| モード | 質問数 | 所要時間 | 内容 |
|--------|--------|----------|------|
| 脳タイプ検定 | 48問 | ~15分 | Brain Type判定のみ |
| 脳資本測定 | 30問 | ~10分 | Brain Health + Brain Skills |
| 両方まとめて（推奨） | 78問 | ~25分 | フル診断 |

### 診断カテゴリ（10カテゴリ + 4軸）

**Part 1: Brain Health（5カテゴリ × 6問 = 30点満点）**

| ID | カテゴリ | 説明 |
|----|----------|------|
| A | 睡眠と回復 | グリンパティックシステム、睡眠の質 |
| B | 運動と身体活動 | BDNF、海馬の体積維持 |
| C | ストレスとメンタルヘルス | コルチゾール、前頭前皮質の機能 |
| D | 栄養と脳の燃料 | 脳はエネルギーの20%を消費 |
| E | 休息とリカバリー | デフォルトモードネットワーク（DMN） |

**Part 2: Brain Skills（5カテゴリ × 6問 = 30点満点）**

| ID | カテゴリ | 説明 |
|----|----------|------|
| F | 認知力 | 批判的思考、論理的推論、問題解決 |
| G | 創造性 | AIが生成できない「問い」を立てる力 |
| H | 対人関係力 | 共感、コミュニケーション、チームワーク |
| I | セルフリーダーシップ | レジリエンス、自律性 |
| J | テクノロジーリテラシー | AIを道具として使いこなす力 |

**Part 3: Brain Type（4軸 × 12問 = 16タイプ）**

| ID | 軸 | 両極 |
|----|-----|------|
| K | 知覚スタイル | Sensor (S) ↔ iNtuitor (N) |
| L | 処理スタイル | Analyzer (A) ↔ Holistic (H) |
| M | 判断スタイル | Logical (L) ↔ Empathic (E) |
| N | 行動スタイル | Planner (P) ↔ Flexer (F) |

→ 4軸の組み合わせで16タイプ（例: SALP、NHEF等）

### スコア体系

**総合スコア（150点満点）**
- Brain Health: 30点（6問 × 5点 × 5カテゴリ ÷ 5 = 各カテゴリ6点満点 → 合計30点）
- Brain Skills: 30点（同上）
- Brain Type: スコアなし（タイプ判定のみ）
- 合計: Health + Skills = 最大150点（正規化後）

**レベル判定**

| レベル | ラベル | 説明 |
|--------|--------|------|
| S | Elite | 脳の資産が十分に蓄積されている |
| A | Strong | 良好な状態。弱い領域を特定し強化 |
| B | Developing | 伸びしろが大きい |
| C | At Risk | 脳の資本が消耗。Brain Health立て直し最優先 |
| D | Critical | 早急な対策が必要 |

**バランスタイプ（Health vs Skills）**

| タイプ | 条件 | ラベル |
|--------|------|--------|
| S | Health ≥ 70% & Skills ≥ 70% | 理想型 |
| A | Health ≥ 70% & Skills < 70% | 土台充実型 |
| B | Health < 70% & Skills ≥ 70% | スキル偏重型 |
| D | Health < 70% & Skills < 70% | 要改善型 |

### i18n（多言語対応）

`js/app.js` 内に `i18n` オブジェクトで日本語/英語の翻訳を定義。
`?lang=en` クエリパラメータで言語切替。デフォルトは日本語。

### Supabaseへの保存

結果は `assessment_results` テーブルに保存:
```javascript
{
  line_uid, display_name, picture_url,
  total, health_total, skills_total,
  level, level_label,
  brain_type, brain_type_name, brain_type_axes,
  type: balanceType,
  categories: { A: {score, max, pct}, B: {...}, ... },
  answers: { q1: 4, q2: 3, ... },
  session_id, org_code
}
```

### LINE連携

- LIFF SDK でユーザーID・表示名・プロフィール画像を取得
- 結果画面からLINE共有ボタンでシェア
- `?org=XXXX` で組織コード指定

---

## バーティカル別概要

### Corporate（法人向け）

**対象**: 企業の従業員、HR部門、産業医
**機能**:
- 従業員: 週次チェックイン（5問）、月次フル診断
- HR: 部門別スコア推移、リスクシグナル一覧、組織統計
- 産業医: 個人詳細（同意済のみ）、リスク管理

**テーブル**: `departments`, `corp_users`, `consents`, `weekly_checkins`, `monthly_assessments`, `risk_signals`, `audit_logs`

### Sports（スポーツ向け）

**対象**: 地域サッカークラブの選手、コーチ、トレーナー
**機能**:
- 選手: 日次チェックイン（身体+脳コンディション）、試合後レポート
- コーチ: チーム一覧、選手コンディション確認
- トレーナー: ライフキネティクス訓練メニュー推奨

**テーブル**: `clubs`, `teams`, `sports_users`, `daily_checkins`, `matches`, `match_reports`, `training_menus`, `sports_recommendations` 等

### Kids（子ども向け）

**対象**: 8-18歳の子ども、保護者、塾/教室の指導者
**機能**:
- 子ども: 日次チェックイン（絵文字UI）、週次振り返り、バッジ獲得
- 保護者: 子どもの状態サマリー、リスク通知
- 指導者: クラス全体の傾向把握

**テーブル**: `kid_orgs`, `children`, `parents`, `parent_children`, `kid_daily_checkins`, `kid_weekly_reflections`, `kid_badges` 等

### Pro（プロフェッショナル向け）

**対象**: エグゼクティブ、アスリート、投資家、クリエイター等
**機能**:
- 朝チェックイン（睡眠・ストレス・認知負荷予測）
- 夕チェックイン（パフォーマンス振替り・回復行動）
- イベント管理（意思決定・プレゼン等の前後ログ）
- ピーキングプロトコル（重要イベントに向けた準備）
- 週次/月次レポート、パフォーマンス相関分析

**テーブル**: `pro_users`, `pro_morning_checkins`, `pro_evening_checkins`, `pro_events`, `pro_event_logs`, `pro_peaking_protocols` 等

### Senior（シニア向け）

**対象**: 60歳以上のシニア、家族、ケアスタッフ、自治体
**機能**:
- シニア: 日次チェックイン（3段階 or 5段階、大きいフォント）、脳の元気度スコア
- 家族: 週次サマリー、声かけカード、リスク通知
- ケアスタッフ: 個人詳細（同意済のみ）、リスク管理
- 組織管理: 施設/地区ごとの集計

**テーブル**: `senior_organizations`, `senior_users`, `senior_family_members`, `senior_daily_checkins`, `senior_monthly_assessments`, `senior_brain_types`, `senior_drill_menus` 等

---

## MCP サーバー（api/mcp.js）

ChatGPT Apps 内で動作する5問チェックイン機能。

### ツール定義

| ツール | 用途 |
|--------|------|
| `start_brain_check` | 5問チェック用ウィジェットを表示 |
| `submit_brain_check` | 回答を送信しスコア算出・Supabase保存 |
| `get_brain_check_history` | 過去の結果を取得 |

### スコア計算（5問版）

5カテゴリ × 1問ずつ（1-5点）→ 合計5-25点

| レベル | 点数範囲 |
|--------|----------|
| S (Elite) | 23-25 |
| A (Strong) | 19-22 |
| B (Developing) | 14-18 |
| C (At Risk) | 9-13 |
| D (Critical) | 5-8 |

---

## データベーススキーマ

### マイグレーションファイル一覧

全マイグレーションは `supabase/` ディレクトリにあり、Supabase SQLエディタで順番に実行する。

| ファイル | 内容 |
|----------|------|
| `migration.sql` | コアテーブル `assessment_results` |
| `migration_002_answers.sql` | 個別回答記録 `assessment_answers` |
| `migration_003_brain_type.sql` | 脳タイプカラム追加 |
| `migration_004_organizations.sql` | 組織テーブル `organizations` |
| `migration_005_corporate.sql` | 法人向け全テーブル |
| `migration_006_sports.sql` | スポーツ向け全テーブル（+訓練メニューシード） |
| `migration_007_kids.sql` | 子ども向け全テーブル（+バッジシード） |
| `migration_008_pro.sql` | プロ向け全テーブル（+ドリルシード） |
| `migration_009_senior.sql` | シニア向け全テーブル（+ドリルシード） |

### コアテーブル: assessment_results

```sql
CREATE TABLE assessment_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  line_uid TEXT,
  display_name TEXT,
  picture_url TEXT,
  total INTEGER,
  health_total INTEGER,
  skills_total INTEGER,
  level TEXT,          -- S/A/B/C/D
  level_label TEXT,    -- Elite/Strong/Developing/At Risk/Critical
  type TEXT,           -- バランスタイプ S/A/B/D
  brain_type TEXT,     -- 4文字コード (例: SALP)
  brain_type_name TEXT,
  brain_type_axes JSONB,
  categories JSONB,    -- {A: {score, max, pct}, B: {...}, ...}
  answers JSONB,       -- {q1: 4, q2: 3, ...}
  org_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLSポリシー

全テーブルでRLS有効、ただし `anon` キーで全操作許可（MVP段階）:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON table_name FOR ALL USING (true) WITH CHECK (true);
```

---

## 開発・デプロイ手順

### ローカル開発

```bash
# 依存インストール（MCPサーバー用のみ）
npm install

# ローカルサーバー起動（任意のHTTPサーバー）
npx serve .
# or
python3 -m http.server 8000
```

フロントエンドはビルドプロセスなし。HTMLファイルを直接ブラウザで開くか、ローカルHTTPサーバーで配信。

### Vercelデプロイ

```bash
# Vercel CLIでデプロイ
npx vercel

# 本番デプロイ
npx vercel --prod
```

GitHubリポジトリをVercelに接続すれば `main` ブランチへのpushで自動デプロイ。

### Supabaseセットアップ

1. Supabaseプロジェクトを作成
2. `supabase/migration.sql` から `migration_009_senior.sql` まで順番にSQLエディタで実行
3. `js/supabase-config.js` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を更新

### LINE LIFF セットアップ

1. LINE Developers Console でLIFFアプリを作成
2. LIFF IDを `js/supabase-config.js` の `LIFF_ID` に設定
3. エンドポイントURLをVercelのURLに設定

### ChatGPT Apps セットアップ

詳細は `chatgpt-app/SETUP.md` を参照。
1. ChatGPTのDeveloper Modeを有効化
2. MCP Connectorを追加: `https://<your-domain>/api/mcp`
3. Connector名: "UNLOCK Brain Capital チェック"

---

## コーディング規約

### 全般
- **フレームワークなし**: Vanilla JS/HTML/CSSで統一。React等は使わない
- **ESM**: `api/` 配下はES Modules（`type: "module"`）
- **CDN**: 外部ライブラリはCDN経由で読み込み（npm installしない）
  - `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js">`
  - `<script src="https://cdn.jsdelivr.net/npm/chart.js">`
  - `<script src="https://static.line-scdn.net/liff/edge/2/sdk.js">`
- **グローバル変数**: `var` で宣言（supabase-config.js の値は各HTMLで利用）

### ファイル命名
- 各バーティカルは独自ディレクトリ: `/{vertical}/index.html`, `/{vertical}/js/app.js`, `/{vertical}/css/{vertical}.css`
- 管理系画面: `hr.html`, `coach.html`, `parent.html` 等は同バーティカルディレクトリ内

### CSS
- メインアプリは `/css/style.css`（2222行の統合CSS）
- 各バーティカルは独自CSS（メインCSSは読まない）
- ダークテーマベース（`#0a0a0a` 背景、アクセントカラー `#00ff88`）

### DB操作
- クライアントサイドから直接Supabase REST API呼出
- サーバーサイドDBアクセスはMCPサーバー（`api/mcp.js`）のみ
- テーブルごとにRLS有効（現状はMVPのため全許可）

---

## ランディングページ（lp/index.html）

### コピーライティング

- **メインタグライン**: 「あなたの脳に、いくらの価値があるか知っていますか？」
- **サブ**: 「あなたの脳の資産価値を、たった5分で可視化する」
- **リード**: 「金融資産なら残高を見れば分かる。でも脳の資産は、測らなければ見えない。」
- **CTA**: 「無料で診断する」（約5分 / 登録不要）
- **フッター**: 「Brain Capital — 脳が、最大の資産になる時代。」

### セクション構成
1. Hero（タグライン + CTA）
2. THE PROBLEM（不調の4つのサイン）
3. WHAT IS BRAIN CAPITAL（3軸の説明）
4. WHAT YOU GET（診断で手に入る5つのもの）
5. HOW IT WORKS（3ステップ）
6. BACKED BY SCIENCE（数値データ: 20%, 40%, 2030）
7. Final CTA
8. Footer

---

## Git履歴（主要コミット）

```
770d72f fix: use mcp-handler adapter for Vercel serverless compatibility
25bcb4c fix: use type:module in package.json instead of .mjs extension
0038892 feat: rebuild ChatGPT integration as Apps in ChatGPT (MCP-based)
53fce3c feat: add voice start button to assessment landing page
4e2ff6d feat: add voice input mode to main Brain Capital assessment
6c560e9 feat: add voice input mode to senior check-in
9d49cb0 feat: add senior Brain Wellness vertical
ae68012 feat: add pro vertical
a49d79a feat: add kids/teens Brain Capital learning support vertical
b431abf スポーツ向けBrain Capitalモニタリング機能を追加
97735d8 法人向け健康経営（Corporate Wellness）機能を追加
a047907 法人向け組織コード機能を追加
```

---

## 統計

| 種別 | ファイル数 | 合計行数 |
|------|-----------|----------|
| JavaScript | 14 | ~9,261行 |
| CSS | 11 | ~4,664行 |
| HTML | 19 | — |
| SQL | 9 | ~1,636行 |

---

## 新しいセッションでの作業開始手順

1. リポジトリをクローン
2. `npm install`（MCPサーバー依存のみ）
3. このドキュメント（CLAUDE.md）を読んで全体像を把握
4. 変更対象のファイルを特定して編集
5. `npx serve .` でローカル確認
6. コミット & プッシュ → Vercelで自動デプロイ

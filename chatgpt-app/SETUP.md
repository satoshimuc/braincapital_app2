# Apps in ChatGPT セットアップガイド

## UNLOCK Brain Capital チェック（ChatGPT版）

### 概要
ChatGPT内で5つの質問に答えるだけで、脳の健康状態をセルフチェックできるアプリです。

### セットアップ手順

#### 1. Vercelへのデプロイ
このリポジトリをVercelにデプロイすると、以下のAPIエンドポイントが自動で有効になります：

- `GET /api/brain-check` - 質問項目の取得
- `POST /api/brain-check` - 回答送信＆結果取得
- `GET /api/brain-check-history` - 過去の結果取得

#### 2. ChatGPTでGPTを作成

1. [ChatGPT](https://chatgpt.com) にアクセス
2. 左サイドバーの「Explore GPTs」→「Create a GPT」
3. **Configure** タブで以下を設定：

**Name:** UNLOCK Brain Capital チェック

**Description:** 5つの質問で脳の健康状態をセルフチェック。睡眠・運動・ストレス・栄養・休息の5カテゴリで脳資本スコアを算出します。

**Instructions:** `instructions.md` の内容をコピー＆ペースト

**Conversation starters:**
- 🧠 Brainチェックを始める
- 📊 過去の結果を見る
- ❓ Brain Capitalとは？

#### 3. Actionsの設定

1. **Configure** → **Actions** → **Create new action**
2. **Authentication:** None
3. **Schema:** `openapi.yaml` の内容をコピー＆ペースト
4. **Server URL** を実際のVercelデプロイURLに変更（例：`https://your-app.vercel.app`）

#### 4. プライバシーポリシー

GPT設定の **Additional Settings** で以下のURLを設定：
```
https://your-app.vercel.app/chatgpt/privacy
```

### ファイル構成

```
chatgpt-app/
├── SETUP.md           # このファイル
├── openapi.yaml       # ChatGPT Actions用のOpenAPI仕様
├── instructions.md    # GPTの指示書（システムプロンプト）
└── privacy.html       # プライバシーポリシーページ

api/
├── brain-check.js          # 質問取得＆回答送信API
└── brain-check-history.js  # 過去結果取得API
```

### スコアリング

| レベル | スコア範囲 | ラベル |
|--------|-----------|--------|
| S | 22-25 | エリート |
| A | 18-21 | 良好 |
| B | 13-17 | 発展途上 |
| C | 8-12 | 要注意 |
| D | 5-7 | 要改善 |

### 5つの質問カテゴリ

1. **睡眠と回復** - 十分な睡眠と朝のすっきり感
2. **運動と身体活動** - 定期的な運動と頭のクリアさ
3. **ストレスとメンタルヘルス** - ストレスコントロールと意欲
4. **栄養と脳の燃料** - 脳に良い食事と水分補給
5. **休息とリカバリー** - 意識的な休憩と脳のオフタイム

### データ保存先
既存のSupabase `assessment_results` テーブルに保存されます。
ChatGPT経由のデータは `org_code` が `chatgpt:` プレフィックスで識別可能です。

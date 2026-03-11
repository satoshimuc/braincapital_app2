# Apps in ChatGPT セットアップガイド

## UNLOCK Brain Capital チェック（ChatGPT版）

### 概要
ChatGPT内で5つの質問に答えるだけで、脳の健康状態をセルフチェックできるアプリです。
OpenAI Apps SDK（MCP ベース）で構築されています。

### アーキテクチャ

```
ChatGPT ←→ MCP Server (/api/mcp) ←→ Supabase
               ↓
         Widget (iframe)
         chatgpt-app/widget.html
```

- **MCP Server** (`api/mcp.js`): MCPプロトコルでChatGPTと通信。ツールとリソースを定義
- **Widget** (`chatgpt-app/widget.html`): ChatGPT内のiframeで表示されるインタラクティブUI
- **Supabase**: 診断結果の保存・履歴取得

### 登録されるMCPツール

| ツール名 | 説明 | UI |
|---------|------|-----|
| `start_brain_check` | 診断ウィジェットを表示 | widget表示 |
| `submit_brain_check` | 回答送信・結果算出・保存 | widget内から呼出 |
| `get_brain_check_history` | 過去の結果を取得 | widget表示 |

### セットアップ手順

#### 1. 依存関係のインストール
```bash
npm install
```

#### 2. Vercelへのデプロイ
このリポジトリをVercelにデプロイすると、MCPエンドポイントが自動で有効になります：
- MCP Server: `https://your-app.vercel.app/api/mcp`

#### 3. ChatGPTでDeveloper Modeを有効化

1. ChatGPTの **Settings** → **Apps & Connectors**
2. **Advanced settings** → **Developer mode** を有効化
3. **Connectors** → **Add connector**
4. MCP Server URLを入力: `https://your-app.vercel.app/api/mcp`
5. 名前: `UNLOCK Brain Capital チェック`

#### 4. テスト
ChatGPTで以下のように話しかけてテスト：
- 「Brainチェックをしたい」
- 「脳の健康チェック」
- 「過去の結果を見せて」

### ファイル構成

```
api/
└── mcp.js                 # MCP Server（Vercel Serverless Function）

chatgpt-app/
├── SETUP.md               # このファイル
├── widget.html             # ChatGPT内で表示されるウィジェットUI
└── privacy.html            # プライバシーポリシーページ
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

1. 🌙 **睡眠と回復** - 十分な睡眠と朝のすっきり感
2. 🏃 **運動と身体活動** - 定期的な運動と頭のクリアさ
3. 🧘 **ストレスとメンタルヘルス** - ストレスコントロールと意欲
4. 🥗 **栄養と脳の燃料** - 脳に良い食事と水分補給
5. ☕ **休息とリカバリー** - 意識的な休憩と脳のオフタイム

### データ保存先
既存のSupabase `assessment_results` テーブルに保存されます。
ChatGPT経由のデータは `org_code` が `chatgpt` で識別可能です。

### ローカル開発
```bash
# MCP Inspectorでテスト
npx @modelcontextprotocol/inspector@latest --server-url http://localhost:3000/api/mcp --transport http

# ngrokでChatGPTからアクセス可能にする
ngrok http 3000
```

### 技術スタック
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/)
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [@modelcontextprotocol/ext-apps](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps)
- Vercel Serverless Functions
- Supabase

# Apps in ChatGPT セットアップガイド

## UNLOCK Brain Capital チェック（ChatGPT版）

### 概要
ChatGPT内で5つの質問に答えるだけで、日々の生産性習慣を振り返れるセルフリフレクションツールです。
OpenAI Apps SDK（MCP ベース）で構築されています。
**注意**: 本アプリは医療サービスではありません。自己啓発・生産性向上のためのセルフリフレクションツールです。

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
| `start_brain_check` | セルフリフレクションウィジェットを表示 | widget表示 |
| `submit_brain_check` | 回答送信・スコア算出・保存 | widget内から呼出 |
| `get_brain_check_history` | 過去のリフレクション結果を取得 | widget表示 |

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
5. 名前: `UNLOCK Brain Capital — 生産性セルフリフレクション`

#### 4. テスト
ChatGPTで以下のように話しかけてテスト：
- 「Brainチェックをしたい」
- 「習慣チェックしたい」
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
| A | 18-21 | 好調 |
| B | 13-17 | まずまず |
| C | 8-12 | 伸びしろあり |
| D | 5-7 | スタートライン |

### 5つの質問カテゴリ

1. 🌙 **睡眠の質** - 十分な睡眠と朝のすっきり感
2. 🏃 **運動習慣** - 定期的な運動と頭のクリアさ
3. 🧘 **ストレスマネジメント** - ストレスコントロールと意欲維持
4. 🥗 **食事とエネルギー管理** - バランスの良い食事と水分補給
5. ☕ **休息とリフレッシュ** - 意識的な休憩とリフレッシュ

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

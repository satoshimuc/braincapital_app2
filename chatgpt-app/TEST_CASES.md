# UNLOCK Brain Capital — Test Cases for Apps in ChatGPT Review

## App Overview

**App Name**: UNLOCK Brain Capital
**Category**: Productivity / Self-Improvement
**Description**: A 5-question self-reflection tool that helps users review daily productivity habits (sleep, exercise, stress management, diet, rest). This is a personal development tool — NOT a healthcare, medical, or diagnostic service.

---

## Test Cases

### Test Case 1

| Field | Value |
|-------|-------|
| **Scenario** | 日々の生産性習慣をセルフリフレクションする |
| **User prompt** | Brainチェックをしたい |
| **Tool triggered** | start_brain_check |
| **Expected output** | 5つの質問で日々の生産性習慣を振り返るセルフリフレクションウィジェットが表示される |

### Test Case 2

| Field | Value |
|-------|-------|
| **Scenario** | 英語でセルフリフレクションを開始する |
| **User prompt** | I want to check my Brain Capital |
| **Tool triggered** | start_brain_check |
| **Expected output** | 5つの質問で日々の生産性習慣を振り返るセルフリフレクションウィジェットが表示される |

### Test Case 3

| Field | Value |
|-------|-------|
| **Scenario** | 習慣チェックをしたいとリクエストする |
| **User prompt** | 今日の習慣チェックをしたい |
| **Tool triggered** | start_brain_check |
| **Expected output** | 睡眠の質・運動習慣・ストレスマネジメント・食事とエネルギー管理・休息とリフレッシュの5項目を1〜5で自己評価するウィジェットが表示される |

### Test Case 4

| Field | Value |
|-------|-------|
| **Scenario** | ウィジェットで5問すべてに回答して結果を受け取る |
| **User prompt** | （ウィジェット内で5問に回答し送信ボタンを押す） |
| **Tool triggered** | submit_brain_check |
| **Expected output** | 合計スコア（5〜25点）とレベル（S/A/B/C/D）が表示され、スコアの低い項目には生産性向上のための一般的なライフスタイルTipsが提示される |

### Test Case 5

| Field | Value |
|-------|-------|
| **Scenario** | 過去のセルフリフレクション結果を確認する |
| **User prompt** | 過去の結果を見せて |
| **Tool triggered** | get_brain_check_history |
| **Expected output** | 過去のセルフリフレクション結果（日付・スコア・レベル）の一覧と、前回比のトレンド（improving/stable/declining）が表示される |

### Test Case 6

| Field | Value |
|-------|-------|
| **Scenario** | 英語で履歴をリクエストする |
| **User prompt** | Show me my past Brain Capital results |
| **Tool triggered** | get_brain_check_history |
| **Expected output** | 過去のセルフリフレクション結果の一覧とトレンドが表示される。データがない場合は初回利用であることが伝えられる |

### Test Case 7

| Field | Value |
|-------|-------|
| **Scenario** | 自分のコンディションを振り返りたい |
| **User prompt** | 今の自分のコンディションを確認したい |
| **Tool triggered** | start_brain_check |
| **Expected output** | 5つの質問で日々の生産性習慣を振り返るセルフリフレクションウィジェットが表示される |

---

## Negative Test Cases

### Negative Test Case 1

| Field | Value |
|-------|-------|
| **Scenario** | 医療的なアドバイスを求める（頭痛の相談） |
| **User prompt** | 最近頭痛がひどいのですが、どうすればいいですか？ |

### Negative Test Case 2

| Field | Value |
|-------|-------|
| **Scenario** | 病気の診断を求める（メンタルヘルスの相談） |
| **User prompt** | 最近眠れないし気分が落ち込みます。うつ病でしょうか？ |

### Negative Test Case 3

| Field | Value |
|-------|-------|
| **Scenario** | 薬や治療法について質問する |
| **User prompt** | 集中力を高めるサプリや薬はありますか？ |

### Negative Test Case 4

| Field | Value |
|-------|-------|
| **Scenario** | 一般的な健康診断について質問する |
| **User prompt** | 健康診断の結果でγ-GTPが高いと言われました。大丈夫ですか？ |

### Negative Test Case 5

| Field | Value |
|-------|-------|
| **Scenario** | ダイエットや体重管理のアドバイスを求める |
| **User prompt** | 痩せたいのですが、おすすめのダイエット方法を教えてください |

---

## Notes for Reviewers

- This app is a **productivity self-reflection tool**, analogous to habit trackers, daily journals, or Pomodoro timers
- It does **NOT** provide medical diagnosis, treatment recommendations, or health assessments
- All suggestions are general lifestyle tips (e.g., "take 10-minute walks", "take breaks every 90 minutes")
- No personally identifiable information (PII) or protected health information (PHI) is collected
- The negative test cases demonstrate that the app should NOT be triggered for medical/health inquiries

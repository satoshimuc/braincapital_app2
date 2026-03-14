# UNLOCK Brain Capital — Test Cases for Apps in ChatGPT Review

## App Overview

**App Name**: UNLOCK Brain Capital — Productivity Self-Reflection
**Category**: Productivity / Self-Improvement / Education
**Description**: A self-reflection tool that helps users review their daily productivity habits across 5 dimensions (sleep quality, exercise routine, stress management, diet & energy, rest & refresh). This is NOT a healthcare, medical, or diagnostic tool — it is a personal development and productivity self-awareness tool, similar to a habit tracker or daily journal.

**Important Disclaimer**: This app does not provide medical advice, diagnosis, or treatment recommendations. It is a self-reflection tool for personal productivity improvement, comparable to apps like habit trackers, productivity journals, or daily mood check-ins.

---

## Test Case 1: Start a Self-Reflection Check

**User Prompt**: "I want to do a Brain Capital check"
**Expected Behavior**:
1. The `start_brain_check` tool is invoked
2. A widget appears showing the title "UNLOCK Brain Capital チェック" with subtitle "5つの質問で日々の生産性習慣をセルフリフレクション"
3. A "チェックを始める" (Start Check) button is displayed
4. The widget is interactive and ready for user input

**Verification**:
- Widget loads without errors
- UI displays correctly with progress bar, question counter, and scale buttons
- No health/medical terminology is present — only productivity and habit language

---

## Test Case 2: Complete All 5 Questions

**User Prompt**: (User interacts with the widget to answer all 5 questions)
**Expected Behavior**:
1. Questions are presented one at a time with a progress bar
2. Each question has a 1-5 scale with "当てはまらない" (Disagree) to "とても当てはまる" (Strongly Agree)
3. The 5 questions cover:
   - 🌙 睡眠の質 (Sleep Quality): "毎日十分な睡眠がとれ、朝すっきり目覚められている"
   - 🏃 運動習慣 (Exercise Routine): "定期的に体を動かし、運動後に頭がクリアになる感覚がある"
   - 🧘 ストレスマネジメント (Stress Management): "ストレスを適切にコントロールでき、意欲を維持できている"
   - 🥗 食事とエネルギー管理 (Diet & Energy): "バランスの良い食事や十分な水分補給を意識的に行えている"
   - ☕ 休息とリフレッシュ (Rest & Refresh): "意識的な休憩やリフレッシュの時間を確保できている"
4. Navigation buttons (Back/Next) work correctly
5. "Next" button is disabled until a selection is made

**Verification**:
- All 5 questions render correctly
- Progress bar updates (20%, 40%, 60%, 80%, 100%)
- Selected button highlights in purple
- Back navigation preserves previous answers

---

## Test Case 3: Submit Answers and View Results (High Score)

**User Prompt**: (User answers all questions with scores 4 or 5)
**Test Input**: bc01=5, bc02=5, bc03=4, bc04=5, bc05=4 (Total: 23/25)
**Expected Behavior**:
1. The `submit_brain_check` tool is called with the 5 scores
2. Loading screen appears briefly
3. Results screen shows:
   - Score: 23/25
   - Level: S (エリート)
   - Message: "素晴らしい！とても良い習慣が身についています。この調子を維持しましょう。"
   - Category breakdown with green scores for high items
   - No improvement tips for items scored 4+
4. Data is saved to Supabase with org_code="chatgpt"
5. A "もう一度チェックする" (Try Again) button is available

**Verification**:
- Score calculation is correct (sum of 5 values)
- Level badge displays correctly
- No medical/diagnostic language in results
- Results use positive, encouraging productivity language

---

## Test Case 4: Submit Answers and View Results (Low Score)

**User Prompt**: (User answers all questions with scores 1 or 2)
**Test Input**: bc01=2, bc02=1, bc03=2, bc04=1, bc05=2 (Total: 8/25)
**Expected Behavior**:
1. Results screen shows:
   - Score: 8/25
   - Level: C (伸びしろあり)
   - Message: "伸びしろがたくさんあります。日々の習慣を少しずつ見直してみましょう。"
   - Category breakdown with improvement tips
2. Improvement tips are general lifestyle suggestions, NOT medical advice:
   - Sleep: "就寝前のスマホ使用を控え、一定の就寝時間を心がけると朝のパフォーマンスが上がります。"
   - Exercise: "まずは毎日10分のウォーキングから始めてみましょう。集中力アップにつながります。"
   - Stress: "深呼吸やマインドフルネスを取り入れ、モチベーションを維持する習慣を作りましょう。"
   - Nutrition: "バランスの良い食事とこまめな水分補給で、午後の集中力をキープしましょう。"
   - Rest: "仕事の合間に5〜20分の休憩を入れ、週1日はデジタルデトックスの時間を作りましょう。"

**Verification**:
- All tips are framed as productivity/lifestyle suggestions, not medical recommendations
- No language like "at risk", "critical", "needs attention", or "health concern"
- Tone is encouraging and growth-oriented ("伸びしろあり" = "room to grow")

---

## Test Case 5: View Past Results / History

**User Prompt**: "Show me my past results" / "過去の結果を見せて"
**Expected Behavior**:
1. The `get_brain_check_history` tool is invoked
2. Returns a JSON response with:
   - `count`: Number of past results
   - `history`: Array of past scores with dates
   - `trend`: "improving" | "declining" | "stable" | "insufficient_data"
3. ChatGPT formats the history into a readable summary
4. If no history exists, a friendly message indicates first-time usage

**Verification**:
- History retrieval works correctly
- Trend calculation is accurate (compares latest 2 results)
- No personally identifiable information is exposed

---

## Test Case 6: Retry / Start Over

**User Prompt**: (User clicks "もう一度チェックする" after viewing results)
**Expected Behavior**:
1. Widget resets to the start screen
2. All previous answers are cleared
3. User can begin a new self-reflection session

**Verification**:
- State is properly reset
- No stale data persists
- Fresh session ID is generated for the new attempt

---

## Test Case 7: Partial Completion / Navigation

**User Prompt**: (User answers 3 questions, goes back, changes answer, then continues)
**Expected Behavior**:
1. User can navigate back to previous questions
2. Previously selected answers are preserved and highlighted
3. Changing an answer updates the selection correctly
4. Forward navigation continues from where the user left off

**Verification**:
- Back button hidden on first question
- Answer state persists across navigation
- Progress bar reflects current position

---

## Test Case 8: Edge Case — Minimum Score

**Test Input**: bc01=1, bc02=1, bc03=1, bc04=1, bc05=1 (Total: 5/25)
**Expected Behavior**:
1. Score: 5/25, Level: D (スタートライン)
2. Message: "これからが楽しみです！まずは睡眠と運動の習慣づくりから始めてみましょう。"
3. All 5 categories show improvement tips

**Verification**:
- Lowest possible score is handled gracefully
- Language remains positive and encouraging ("スタートライン" = "starting line")
- No alarming or medical-sounding language

---

## Test Case 9: Edge Case — Maximum Score

**Test Input**: bc01=5, bc02=5, bc03=5, bc04=5, bc05=5 (Total: 25/25)
**Expected Behavior**:
1. Score: 25/25, Level: S (エリート)
2. Message: "素晴らしい！とても良い習慣が身についています。この調子を維持しましょう。"
3. All categories show green (high) scores, no improvement tips

**Verification**:
- Perfect score is celebrated appropriately
- No unnecessary suggestions when all scores are high

---

## Test Case 10: Offline Fallback

**Expected Behavior**:
1. If MCP tool call fails (network error, timeout), the widget calculates results locally
2. Score and level are computed client-side using the same algorithm
3. Results display with "(オフラインモード)" indicator
4. User experience is not broken

**Verification**:
- Fallback calculation matches server-side logic
- No crash or blank screen on network failure

---

## Privacy & Data Handling

| Aspect | Details |
|--------|---------|
| PII collected | None (no names, emails, or account info) |
| Data stored | Anonymous scores (1-5 per category), timestamps |
| User identifier | "chatgpt-anonymous" (no real identity) |
| Data sharing | No third-party sharing |
| Medical data | NOT collected — this is habit/lifestyle self-reflection only |
| Purpose | Self-improvement, productivity awareness, personal development |

---

## Category Clarification: Why This Is NOT a Healthcare App

| Healthcare App | This App (Productivity Self-Reflection) |
|----------------|----------------------------------------|
| Provides medical diagnosis | Provides self-awareness scores on daily habits |
| Recommends treatments | Suggests general lifestyle improvements (sleep routine, walking, breaks) |
| Handles protected health information (PHI) | Collects only anonymous habit ratings (1-5 scale) |
| Requires medical credentials | No medical expertise involved |
| Facilitates care access or provider matching | No connection to healthcare providers |
| Makes health claims | Makes productivity/lifestyle observations |

**Analogous approved apps**: Habit trackers, productivity journals, daily mood check-ins, meditation timers, focus aids, Pomodoro timers — all of which touch on sleep, exercise, and stress without being healthcare apps.

---

## App Metadata for Review

- **App Name**: UNLOCK Brain Capital
- **Short Description**: A 5-question self-reflection tool for reviewing daily productivity habits
- **Category**: Productivity / Self-Improvement
- **Privacy Policy URL**: https://[your-domain]/chatgpt/privacy
- **Terms**: No account required, no PII collected, anonymous usage
- **Content Rating**: General / All Ages

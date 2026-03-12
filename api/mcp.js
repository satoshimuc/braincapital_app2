// MCP Server for UNLOCK Brain Capital Check - Apps in ChatGPT
// Endpoint: /api/mcp

import { createMcpHandler } from "mcp-handler";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Supabase config ──
const SUPABASE_URL = "https://kffeqhnbpedixdvbdcug.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8JFRzGtYwecNmI59Jlm84g_v6bHR0CU";

// ── Brain Check Data ──
const BRAIN_CHECK_ITEMS = [
  { id: "BC-01", category: "sleep",     label: "睡眠と回復",             question: "毎日十分な睡眠がとれ、朝すっきり目覚められている" },
  { id: "BC-02", category: "exercise",  label: "運動と身体活動",         question: "定期的に体を動かし、運動後に頭がクリアになる感覚がある" },
  { id: "BC-03", category: "stress",    label: "ストレスとメンタルヘルス", question: "ストレスを適切にコントロールでき、意欲を維持できている" },
  { id: "BC-04", category: "nutrition", label: "栄養と脳の燃料",         question: "脳に良い食事や十分な水分補給を意識的に行えている" },
  { id: "BC-05", category: "rest",      label: "休息とリカバリー",       question: "意識的な休憩や脳のオフタイムを確保できている" },
];

function getLevel(total) {
  if (total >= 22) return { level: "S", label: "エリート" };
  if (total >= 18) return { level: "A", label: "良好" };
  if (total >= 13) return { level: "B", label: "発展途上" };
  if (total >= 8)  return { level: "C", label: "要注意" };
  return { level: "D", label: "要改善" };
}

function getAdvice(category, score) {
  if (score >= 4) return null;
  const advice = {
    sleep:     "睡眠の質を高めるため、就寝前のスマホ使用を控え、一定の就寝時間を心がけましょう。",
    exercise:  "週150分以上の運動を目標に、まずは毎日10分のウォーキングから始めてみましょう。",
    stress:    "深呼吸やマインドフルネスを取り入れ、ストレスを溜め込まない習慣を作りましょう。",
    nutrition: "魚・ナッツ・野菜・果物を意識的に摂り、こまめな水分補給を心がけましょう。",
    rest:      "仕事の合間に5〜20分の休憩を入れ、週1日はデジタルデトックスの時間を作りましょう。",
  };
  return advice[category] || null;
}

function getResultMessage(level) {
  const messages = {
    S: "素晴らしい！脳の健康状態は非常に良好です。この状態を維持しましょう。",
    A: "良い状態です！いくつかの領域をさらに強化することで、より高いパフォーマンスが期待できます。",
    B: "まずまずの状態ですが、改善の余地があります。弱い領域から取り組んでみましょう。",
    C: "注意が必要です。生活習慣の見直しを始めましょう。小さな改善から始めることが大切です。",
    D: "早急な改善が必要です。まずは睡眠と運動から見直してみましょう。",
  };
  return messages[level] || messages.B;
}

async function saveToSupabase(data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/assessment_results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} ${errorText}`);
  }
  return response.json();
}

async function fetchHistory(userId) {
  const url = `${SUPABASE_URL}/rest/v1/assessment_results?line_uid=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=10`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase error: ${response.status}`);
  return response.json();
}

// ── Widget HTML (loaded once) ──
let widgetHtml;
function getWidgetHtml() {
  if (!widgetHtml) {
    const widgetPath = join(__dirname, "..", "chatgpt-app", "widget.html");
    widgetHtml = readFileSync(widgetPath, "utf-8");
  }
  return widgetHtml;
}

// ── Vercel Route Handler via mcp-handler ──
const handler = createMcpHandler(
  (server) => {
    // Register widget resource
    registerAppResource(
      server,
      "Brain Capital Check Widget",
      "ui://brain-capital/check.html",
      {
        description: "Brain Capital セルフチェック ウィジェット",
      },
      async () => ({
        contents: [
          {
            uri: "ui://brain-capital/check.html",
            mimeType: RESOURCE_MIME_TYPE,
            text: getWidgetHtml(),
            _meta: {
              ui: {
                csp: {
                  connectDomains: ["https://kffeqhnbpedixdvbdcug.supabase.co"],
                },
              },
            },
          },
        ],
      })
    );

    // Tool: Start Brain Check
    registerAppTool(
      server,
      "start_brain_check",
      {
        title: "Brain Capital チェック開始",
        description: "5つの質問で脳の健康状態をセルフチェックするウィジェットを表示します。ユーザーが「脳チェック」「Brainチェック」「診断」「脳の健康」などと言ったときに使用してください。",
        _meta: {
          ui: {
            resourceUri: "ui://brain-capital/check.html",
          },
        },
      },
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                action: "start_check",
                items: BRAIN_CHECK_ITEMS,
                scale: {
                  min: 1,
                  max: 5,
                  labels: {
                    1: "まったく当てはまらない",
                    2: "あまり当てはまらない",
                    3: "どちらともいえない",
                    4: "やや当てはまる",
                    5: "とても当てはまる",
                  },
                },
              }),
            },
          ],
        };
      }
    );

    // Tool: Submit Brain Check answers
    registerAppTool(
      server,
      "submit_brain_check",
      {
        title: "Brain Capital チェック送信",
        description: "5項目の回答を送信してスコアを算出・保存します。ウィジェットから呼び出されます。",
        inputSchema: {
          bc01: z.number().min(1).max(5).describe("睡眠と回復のスコア"),
          bc02: z.number().min(1).max(5).describe("運動と身体活動のスコア"),
          bc03: z.number().min(1).max(5).describe("ストレスとメンタルヘルスのスコア"),
          bc04: z.number().min(1).max(5).describe("栄養と脳の燃料のスコア"),
          bc05: z.number().min(1).max(5).describe("休息とリカバリーのスコア"),
        },
        _meta: {
          ui: {
            resourceUri: "ui://brain-capital/check.html",
            visibility: ["app"],
          },
        },
      },
      async ({ bc01, bc02, bc03, bc04, bc05 }) => {
        const answers = { "BC-01": bc01, "BC-02": bc02, "BC-03": bc03, "BC-04": bc04, "BC-05": bc05 };
        const total = bc01 + bc02 + bc03 + bc04 + bc05;
        const { level, label } = getLevel(total);
        const percentage = Math.round((total / 25) * 100);

        const categories = BRAIN_CHECK_ITEMS.map((item) => {
          const score = answers[item.id];
          return {
            id: item.id,
            category: item.category,
            label: item.label,
            score,
            advice: getAdvice(item.category, score),
          };
        });

        const strengths = categories.filter((c) => c.score >= 4).map((c) => c.label);
        const weaknesses = categories.filter((c) => c.score <= 2).map((c) => c.label);

        const sessionId = `chatgpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          await saveToSupabase({
            session_id: sessionId,
            line_uid: "chatgpt-anonymous",
            display_name: "ChatGPT User",
            total,
            health_total: total,
            skills_total: 0,
            level,
            level_label: label,
            type: level,
            categories: Object.fromEntries(categories.map((c) => [c.category, c.score])),
            answers,
            org_code: "chatgpt",
          });
        } catch (e) {
          console.error("Supabase save error:", e);
        }

        return {
          content: [{ type: "text", text: JSON.stringify({
            sessionId, total, maxScore: 25, percentage, level, levelLabel: label,
            categories, strengths, weaknesses, message: getResultMessage(level),
          }) }],
        };
      }
    );

    // Tool: Get history
    registerAppTool(
      server,
      "get_brain_check_history",
      {
        title: "過去の結果を取得",
        description: "過去のBrain Capitalチェック結果を取得します。ユーザーが「過去の結果」「履歴」「トレンド」と言ったときに使用してください。",
        inputSchema: {
          user_id: z.string().optional().describe("ユーザーID（省略時はchatgpt-anonymous）"),
        },
        _meta: {
          ui: {
            resourceUri: "ui://brain-capital/check.html",
          },
        },
      },
      async ({ user_id }) => {
        const userId = user_id || "chatgpt-anonymous";
        try {
          const records = await fetchHistory(userId);
          const history = records.map((r) => ({
            date: r.created_at,
            total: r.total,
            level: r.level,
            levelLabel: r.level_label,
            categories: r.categories,
          }));

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  count: history.length,
                  history,
                  trend:
                    history.length >= 2
                      ? history[0].total > history[1].total
                        ? "improving"
                        : history[0].total < history[1].total
                        ? "declining"
                        : "stable"
                      : "insufficient_data",
                }),
              },
            ],
          };
        } catch (e) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: e.message }) }],
          };
        }
      }
    );
  },
  {
    name: "UNLOCK Brain Capital チェック",
    version: "1.0.0",
  },
  {
    basePath: "/api",
    verboseLogs: true,
  }
);

// ── Adapter: Vercel Serverless (req, res) → Web API (Request → Response) ──
export default async function vercelHandler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // Build Web API Request from Vercel req
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }

    const init = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "DELETE") {
      init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const webRequest = new Request(url, init);
    const webResponse = await handler(webRequest);

    // Write Web API Response back to Vercel res
    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Stream the response body
    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(value);
        }
      };
      await pump();
    } else {
      const text = await webResponse.text();
      res.end(text);
    }
  } catch (error) {
    console.error("MCP handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  }
}

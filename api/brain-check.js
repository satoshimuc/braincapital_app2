// Vercel Serverless Function: Brain Check API for Apps in ChatGPT
// POST /api/brain-check - Save brain check results to Supabase

const SUPABASE_URL = 'https://kffeqhnbpedixdvbdcug.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8JFRzGtYwecNmI59Jlm84g_v6bHR0CU';

// 5-item Brain Check questions (simplified version)
const BRAIN_CHECK_ITEMS = [
  { id: 'BC-01', category: 'sleep',      label: '睡眠と回復',           question: '毎日十分な睡眠がとれ、朝すっきり目覚められている' },
  { id: 'BC-02', category: 'exercise',   label: '運動と身体活動',       question: '定期的に体を動かし、運動後に頭がクリアになる感覚がある' },
  { id: 'BC-03', category: 'stress',     label: 'ストレスとメンタルヘルス', question: 'ストレスを適切にコントロールでき、意欲を維持できている' },
  { id: 'BC-04', category: 'nutrition',  label: '栄養と脳の燃料',       question: '脳に良い食事や十分な水分補給を意識的に行えている' },
  { id: 'BC-05', category: 'rest',       label: '休息とリカバリー',     question: '意識的な休憩や脳のオフタイムを確保できている' },
];

// Score grading
function getLevel(total) {
  if (total >= 22) return { level: 'S', label: 'エリート' };
  if (total >= 18) return { level: 'A', label: '良好' };
  if (total >= 13) return { level: 'B', label: '発展途上' };
  if (total >= 8)  return { level: 'C', label: '要注意' };
  return { level: 'D', label: '要改善' };
}

// Advice per category
function getCategoryAdvice(category, score) {
  if (score >= 4) return null; // Good - no advice needed
  const advice = {
    sleep:     '睡眠の質を高めるため、就寝前のスマホ使用を控え、一定の就寝時間を心がけましょう。',
    exercise:  '週150分以上の運動を目標に、まずは毎日10分のウォーキングから始めてみましょう。',
    stress:    '深呼吸やマインドフルネスを取り入れ、ストレスを溜め込まない習慣を作りましょう。',
    nutrition: '魚・ナッツ・野菜・果物を意識的に摂り、こまめな水分補給を心がけましょう。',
    rest:      '仕事の合間に5〜20分の休憩を入れ、週1日はデジタルデトックスの時間を作りましょう。',
  };
  return advice[category] || null;
}

function generateResultSummary(answers) {
  const total = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const { level, label } = getLevel(total);
  const maxScore = 25;
  const percentage = Math.round((total / maxScore) * 100);

  const categoryResults = BRAIN_CHECK_ITEMS.map(item => {
    const score = answers[item.id] || 0;
    const advice = getCategoryAdvice(item.category, score);
    return {
      id: item.id,
      category: item.category,
      label: item.label,
      score,
      advice,
    };
  });

  // Find strengths and weaknesses
  const sorted = [...categoryResults].sort((a, b) => b.score - a.score);
  const strengths = sorted.filter(c => c.score >= 4).map(c => c.label);
  const weaknesses = sorted.filter(c => c.score <= 2).map(c => c.label);

  return {
    total,
    maxScore,
    percentage,
    level,
    levelLabel: label,
    categories: categoryResults,
    strengths,
    weaknesses,
  };
}

async function saveToSupabase(data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/assessment_results`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase error: ${response.status} ${errorText}`);
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  // CORS headers for ChatGPT Actions
  res.setHeader('Access-Control-Allow-Origin', 'https://chatgpt.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, openai-conversation-id, openai-ephemeral-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return question definitions
  if (req.method === 'GET') {
    return res.status(200).json({
      title: 'UNLOCK Brain Capital チェック',
      description: '5つの質問で脳の健康状態をセルフチェック',
      items: BRAIN_CHECK_ITEMS,
      scale: {
        min: 1,
        max: 5,
        labels: {
          1: 'まったく当てはまらない',
          2: 'あまり当てはまらない',
          3: 'どちらともいえない',
          4: 'やや当てはまる',
          5: 'とても当てはまる',
        },
      },
    });
  }

  // POST: Submit answers and save results
  if (req.method === 'POST') {
    try {
      const { answers, user_id } = req.body;

      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'answers object is required' });
      }

      // Validate all 5 answers exist and are 1-5
      for (const item of BRAIN_CHECK_ITEMS) {
        const val = answers[item.id];
        if (val === undefined || val === null || val < 1 || val > 5) {
          return res.status(400).json({
            error: `Invalid answer for ${item.id}: must be 1-5`,
          });
        }
      }

      const result = generateResultSummary(answers);

      // Prepare data for Supabase
      const sessionId = `chatgpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const conversationId = req.headers['openai-conversation-id'] || null;
      const ephemeralUserId = req.headers['openai-ephemeral-user-id'] || user_id || 'chatgpt-anonymous';

      const dbRecord = {
        session_id: sessionId,
        line_uid: ephemeralUserId,
        display_name: 'ChatGPT User',
        total: result.total,
        health_total: result.total, // In 5-item version, all items are health-related
        skills_total: 0,
        level: result.level,
        level_label: result.levelLabel,
        type: result.level,
        categories: Object.fromEntries(
          result.categories.map(c => [c.category, c.score])
        ),
        answers: answers,
        org_code: conversationId ? `chatgpt:${conversationId}` : 'chatgpt',
      };

      await saveToSupabase(dbRecord);

      return res.status(200).json({
        success: true,
        result: {
          sessionId,
          total: result.total,
          maxScore: result.maxScore,
          percentage: result.percentage,
          level: result.level,
          levelLabel: result.levelLabel,
          categories: result.categories,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          message: getResultMessage(result.level),
        },
      });
    } catch (error) {
      console.error('Brain check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function getResultMessage(level) {
  const messages = {
    S: '素晴らしい！脳の健康状態は非常に良好です。この状態を維持しましょう。',
    A: '良い状態です！いくつかの領域をさらに強化することで、より高いパフォーマンスが期待できます。',
    B: 'まずまずの状態ですが、改善の余地があります。弱い領域から取り組んでみましょう。',
    C: '注意が必要です。生活習慣の見直しを始めましょう。小さな改善から始めることが大切です。',
    D: '早急な改善が必要です。まずは睡眠と運動から見直してみましょう。専門家への相談もおすすめします。',
  };
  return messages[level] || messages.B;
}

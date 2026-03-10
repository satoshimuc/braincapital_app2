// Vercel Serverless Function: Brain Check History API
// GET /api/brain-check-history?user_id=xxx - Retrieve past results

const SUPABASE_URL = 'https://kffeqhnbpedixdvbdcug.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8JFRzGtYwecNmI59Jlm84g_v6bHR0CU';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://chatgpt.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, openai-conversation-id, openai-ephemeral-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.user_id
      || req.headers['openai-ephemeral-user-id']
      || null;

    if (!userId) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Fetch last 10 results for this user
    const url = `${SUPABASE_URL}/rest/v1/assessment_results?line_uid=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=10`;

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const records = await response.json();

    const history = records.map(r => ({
      date: r.created_at,
      total: r.total,
      level: r.level,
      levelLabel: r.level_label,
      categories: r.categories,
    }));

    return res.status(200).json({
      count: history.length,
      history,
      trend: history.length >= 2
        ? (history[0].total > history[1].total ? 'improving' : history[0].total < history[1].total ? 'declining' : 'stable')
        : 'insufficient_data',
    });
  } catch (error) {
    console.error('History error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

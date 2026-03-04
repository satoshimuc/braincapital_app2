/* ================================================
   UNLOCK — Parent Dashboard
   Weekly text summary only. No raw data, no scores.
   ================================================ */
'use strict';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentParent = null;
let childrenList = [];
let selectedChild = null;
let orgCode = null;

/* ---------- Engagement Tips Bank ---------- */
const TIPS = [
  { title: 'いっしょに深呼吸', text: '寝る前に親子で3回、ゆっくり深呼吸。リラックス効果があります。' },
  { title: 'きょうの「いちばん」', text: '夕食時に「きょういちばん楽しかったこと」を聞いてみましょう。' },
  { title: 'からだをうごかそう', text: '10分でOK。一緒に散歩やストレッチをすると脳も活性化します。' },
  { title: 'ほめポイント探し', text: 'プロセスをほめましょう。「がんばったね」より「続けたのがすごい」。' },
  { title: 'デジタルデトックス', text: '寝る1時間前にスクリーンをオフ。睡眠の質がぐっと上がります。' },
  { title: 'やりたいことリスト', text: '週末に「やりたいこと」を3つ書き出して、1つだけ実行してみましょう。' }
];

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const params = new URLSearchParams(location.search);
  orgCode = params.get('org');

  // Check stored token
  const storedToken = localStorage.getItem('parent_token');
  if (storedToken) {
    const parent = await authenticate(storedToken);
    if (parent) { currentParent = parent; await loadDashboard(); return; }
  }

  document.getElementById('btn-auth').addEventListener('click', async () => {
    const token = document.getElementById('auth-token').value.trim();
    const errEl = document.getElementById('auth-error');
    if (!token) { errEl.textContent = 'トークンを入力してください'; errEl.style.display = 'block'; return; }

    const parent = await authenticate(token);
    if (!parent) { errEl.textContent = 'トークンが見つかりません'; errEl.style.display = 'block'; return; }

    localStorage.setItem('parent_token', token);
    currentParent = parent;
    await loadDashboard();
  });
}

async function authenticate(token) {
  const { data } = await sb.from('parents').select('*').eq('parent_token', token).maybeSingle();
  return data;
}

/* ---------- Load Dashboard ---------- */
async function loadDashboard() {
  showScreen('screen-dashboard');

  // Get children linked to this parent
  const { data: links } = await sb.from('parent_children').select('child_id, children(*)').eq('parent_id', currentParent.id);
  childrenList = (links || []).map(l => l.children).filter(c => c && c.is_active);

  if (childrenList.length === 0) {
    document.querySelector('.dash-container').innerHTML = '<div class="loading">お子さまが登録されていません。管理者にお問い合わせください。</div>';
    return;
  }

  // Child selector
  if (childrenList.length > 1) {
    const sel = document.getElementById('child-select');
    sel.innerHTML = childrenList.map(c => `<option value="${c.id}">${c.display_name}</option>`).join('');
    document.getElementById('child-selector').style.display = '';
    sel.addEventListener('change', () => { selectedChild = childrenList.find(c => c.id === sel.value); renderForChild(); });
  }

  selectedChild = childrenList[0];

  // Org name
  if (orgCode) {
    const { data: org } = await sb.from('kid_orgs').select('org_name').eq('org_code', orgCode).maybeSingle();
    if (org) document.getElementById('topbar-org').textContent = org.org_name;
  }

  await renderForChild();
}

/* ---------- Render for selected child ---------- */
async function renderForChild() {
  const child = selectedChild;

  // Summary cards (abstract, no scores)
  const { count: totalCheckins } = await sb.from('kid_daily_checkins').select('id', { count: 'exact', head: true }).eq('child_id', child.id);
  const { count: totalDrills } = await sb.from('kid_drill_completions').select('id', { count: 'exact', head: true }).eq('child_id', child.id);

  document.getElementById('summary-cards').innerHTML = `
    <div class="summary-card"><div class="summary-value">${child.streak_count || 0}</div><div class="summary-label">連続日数</div></div>
    <div class="summary-card"><div class="summary-value">${totalCheckins || 0}</div><div class="summary-label">チェックイン回数</div></div>
    <div class="summary-card"><div class="summary-value">${totalDrills || 0}</div><div class="summary-label">ドリル完了</div></div>
  `;

  // Signal notice (abstract, no raw data)
  await renderSignalNotice(child);

  // Weekly summaries
  await renderWeeklySummaries(child);

  // Tips
  renderTips();
}

/* ---------- Signal Notice (abstract) ---------- */
async function renderSignalNotice(child) {
  const container = document.getElementById('signal-notice');
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: signals } = await sb.from('kid_risk_signals').select('*')
    .eq('child_id', child.id)
    .gte('created_at', weekAgo.toISOString())
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(3);

  if (!signals || signals.length === 0) {
    container.innerHTML = `
      <div class="card" style="border-left:3px solid var(--green);">
        <div class="card-desc" style="color:var(--green);font-weight:600;">この1週間、お子さまのコンディションは安定しています。</div>
      </div>`;
    return;
  }

  // Show abstract parent message only (never raw data)
  const latestRed = signals.find(s => s.risk_level === 'red');
  const msg = latestRed ? latestRed.message_parent : signals[0].message_parent;
  const color = latestRed ? 'var(--accent)' : 'var(--yellow)';

  container.innerHTML = `
    <div class="card" style="border-left:3px solid ${color};">
      <div class="card-desc" style="font-weight:500;">${msg || 'お子さまのコンディションがやや低めの日がありました。'}</div>
      <div class="card-desc" style="margin-top:8px;font-size:12px;color:var(--gray-400);">※ 具体的なスコアは表示されません。お子さまとの会話のきっかけにしてください。</div>
    </div>`;
}

/* ---------- Weekly Summaries ---------- */
async function renderWeeklySummaries(child) {
  const container = document.getElementById('weekly-list');

  // Get saved summaries
  const { data: summaries } = await sb.from('kid_parent_summaries').select('*')
    .eq('child_id', child.id).eq('parent_id', currentParent.id)
    .order('week_start', { ascending: false }).limit(4);

  if (summaries && summaries.length > 0) {
    container.innerHTML = summaries.map(s => `
      <div class="weekly-card">
        <div class="weekly-card-week">${s.week_start} 〜</div>
        <div class="weekly-card-summary">${s.summary_text || 'まとめ準備中です。'}</div>
        ${s.tip_text ? `<div class="weekly-card-tip"><strong>おうちでのヒント</strong>${s.tip_text}</div>` : ''}
        ${s.signal_notice ? `<div style="margin-top:8px;font-size:12px;color:var(--accent);">${s.signal_notice}</div>` : ''}
      </div>
    `).join('');
    return;
  }

  // Generate summary from checkin data (abstract text only)
  const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const { data: checkins } = await sb.from('kid_daily_checkins').select('checkin_date, signal_level')
    .eq('child_id', child.id)
    .gte('checkin_date', fourWeeksAgo.toISOString().slice(0, 10))
    .order('checkin_date');

  if (!checkins || checkins.length === 0) {
    container.innerHTML = '<div class="loading">まだチェックインデータがありません。</div>';
    return;
  }

  // Group by week and generate abstract summary
  const weeks = groupByWeek(checkins);
  container.innerHTML = Object.entries(weeks).reverse().slice(0, 4).map(([weekStart, entries]) => {
    const greenCount = entries.filter(e => e.signal_level === 'green').length;
    const total = entries.length;
    const rate = Math.round(greenCount / total * 100);

    let summaryText;
    if (rate >= 80) summaryText = `この週は ${total} 回チェックインがあり、全体的にとても良い調子でした。`;
    else if (rate >= 50) summaryText = `この週は ${total} 回チェックインがあり、おおむね安定した1週間でした。`;
    else summaryText = `この週は ${total} 回チェックインがあり、少し波がある1週間でした。ゆっくり休む時間を大切にしてあげてください。`;

    return `
      <div class="weekly-card">
        <div class="weekly-card-week">${weekStart} 〜</div>
        <div class="weekly-card-summary">${summaryText}</div>
        <div class="weekly-card-tip"><strong>おうちでのヒント</strong>${TIPS[simpleHash(weekStart) % TIPS.length].text}</div>
      </div>`;
  }).join('');
}

/* ---------- Tips ---------- */
function renderTips() {
  const container = document.getElementById('tips-area');
  const today = new Date().toISOString().slice(0, 10);
  const idx = simpleHash(today) % TIPS.length;
  const tip = TIPS[idx];
  const tip2 = TIPS[(idx + 1) % TIPS.length];

  container.innerHTML = `
    <div class="card"><div class="card-title">${tip.title}</div><div class="card-desc">${tip.text}</div></div>
    <div class="card"><div class="card-title">${tip2.title}</div><div class="card-desc">${tip2.text}</div></div>`;
}

/* ---------- Helpers ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function groupByWeek(checkins) {
  const weeks = {};
  checkins.forEach(c => {
    const d = new Date(c.checkin_date);
    const day = d.getDay();
    const monday = new Date(d); monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) weeks[key] = [];
    weeks[key].push(c);
  });
  return weeks;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

/* ================================================
   UNLOCK — Instructor Dashboard
   Anonymous group aggregation only.
   No individual child data visible.
   ================================================ */
'use strict';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentInstructor = null;
let orgCode = null;
let groups = [];
let selectedGroupId = null;

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const params = new URLSearchParams(location.search);
  orgCode = params.get('org');

  const storedToken = localStorage.getItem('instructor_token_' + (orgCode || ''));
  if (storedToken) {
    const inst = await authenticate(storedToken);
    if (inst) { currentInstructor = inst; await loadDashboard(); return; }
  }

  document.getElementById('btn-auth').addEventListener('click', async () => {
    const token = document.getElementById('auth-token').value.trim();
    const errEl = document.getElementById('auth-error');
    if (!token) { errEl.textContent = 'トークンを入力してください'; errEl.style.display = 'block'; return; }

    const inst = await authenticate(token);
    if (!inst) { errEl.textContent = 'トークンが見つかりません'; errEl.style.display = 'block'; return; }

    localStorage.setItem('instructor_token_' + (orgCode || ''), token);
    currentInstructor = inst;
    await loadDashboard();
  });
}

async function authenticate(token) {
  const q = sb.from('kid_instructors').select('*').eq('instructor_token', token).eq('is_active', true);
  if (orgCode) q.eq('org_code', orgCode);
  const { data } = await q.maybeSingle();
  return data;
}

/* ---------- Load Dashboard ---------- */
async function loadDashboard() {
  showScreen('screen-dashboard');
  orgCode = orgCode || currentInstructor.org_code;

  // Org name
  const { data: org } = await sb.from('kid_orgs').select('org_name').eq('org_code', orgCode).maybeSingle();
  if (org) document.getElementById('topbar-org').textContent = org.org_name;

  // Load groups
  const { data: grps } = await sb.from('kid_groups').select('*').eq('org_code', orgCode).order('sort_order');
  groups = grps || [];
  const groupFilter = document.getElementById('group-filter');
  groupFilter.innerHTML = '<option value="">全グループ</option>' + groups.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
  groupFilter.addEventListener('change', () => { selectedGroupId = groupFilter.value || null; renderDashboard(); });

  await renderDashboard();
}

/* ---------- Render Dashboard ---------- */
async function renderDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  // Get today's checkins for org (anonymous)
  let checkinQuery = sb.from('kid_daily_checkins').select('signal_level, readiness_score, sleep_score, mood_score, motivation_score, fatigue_score, focus_score, age_group')
    .eq('org_code', orgCode).eq('checkin_date', today);
  if (selectedGroupId) checkinQuery = checkinQuery.eq('group_id', selectedGroupId);
  const { data: todayCheckins } = await checkinQuery;

  // Get total children count
  let childQuery = sb.from('children').select('id', { count: 'exact', head: true }).eq('org_code', orgCode).eq('is_active', true);
  if (selectedGroupId) childQuery = childQuery.eq('group_id', selectedGroupId);
  const { count: totalChildren } = await childQuery;

  const checkinCount = (todayCheckins || []).length;
  const inputRate = totalChildren > 0 ? Math.round(checkinCount / totalChildren * 100) : 0;

  // Summary cards
  document.getElementById('summary-cards').innerHTML = `
    <div class="summary-card"><div class="summary-value">${totalChildren || 0}</div><div class="summary-label">登録児童数</div></div>
    <div class="summary-card"><div class="summary-value">${checkinCount}</div><div class="summary-label">今日のチェックイン</div></div>
    <div class="summary-card"><div class="summary-value">${inputRate}%</div><div class="summary-label">入力率</div></div>
  `;

  // Distribution (anonymous)
  renderDistribution(todayCheckins || []);

  // Weekly input rate
  await renderWeeklyRate(totalChildren || 0);

  // Drill recommendation
  await renderDrillRecommendation(todayCheckins || []);
}

/* ---------- Signal Distribution (anonymous bar) ---------- */
function renderDistribution(checkins) {
  const container = document.getElementById('distribution-card');
  if (checkins.length === 0) { container.innerHTML = '<div class="loading">今日のデータはまだありません</div>'; return; }

  const green = checkins.filter(c => c.signal_level === 'green').length;
  const yellow = checkins.filter(c => c.signal_level === 'yellow').length;
  const red = checkins.filter(c => c.signal_level === 'red').length;
  const total = checkins.length;

  container.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;height:32px;border-radius:8px;overflow:hidden;margin-bottom:8px;">
        ${green > 0 ? `<div style="flex:${green};background:var(--green);"></div>` : ''}
        ${yellow > 0 ? `<div style="flex:${yellow};background:var(--yellow);"></div>` : ''}
        ${red > 0 ? `<div style="flex:${red};background:var(--accent);"></div>` : ''}
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray-500);">
        <span>好調 ${green}名 (${Math.round(green/total*100)}%)</span>
        <span>ふつう ${yellow}名 (${Math.round(yellow/total*100)}%)</span>
        <span>おやすみ ${red}名 (${Math.round(red/total*100)}%)</span>
      </div>
    </div>
    <div style="font-size:12px;color:var(--gray-400);">※ 個人は特定されません。グループ全体の傾向です。</div>
  `;
}

/* ---------- Weekly Input Rate ---------- */
async function renderWeeklyRate(totalChildren) {
  const container = document.getElementById('input-rate-card');
  if (totalChildren === 0) { container.innerHTML = '<div class="loading">児童が登録されていません</div>'; return; }

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Get checkin counts per day
  const { data } = await sb.from('kid_daily_checkins')
    .select('checkin_date')
    .eq('org_code', orgCode)
    .gte('checkin_date', days[0])
    .lte('checkin_date', days[6]);

  const countByDate = {};
  (data || []).forEach(c => { countByDate[c.checkin_date] = (countByDate[c.checkin_date] || 0) + 1; });

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  container.innerHTML = `
    <div style="display:flex;gap:4px;align-items:flex-end;height:80px;margin-bottom:8px;">
      ${days.map(d => {
        const count = countByDate[d] || 0;
        const pct = Math.min(100, Math.round(count / totalChildren * 100));
        const dayOfWeek = dayNames[new Date(d).getDay()];
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;">
          <div style="width:100%;background:var(--accent);border-radius:4px 4px 0 0;height:${Math.max(4, pct * 0.7)}px;transition:.3s;"></div>
          <div style="font-size:10px;color:var(--gray-400);margin-top:4px;">${dayOfWeek}</div>
          <div style="font-size:10px;color:var(--gray-500);font-weight:600;">${pct}%</div>
        </div>`;
      }).join('')}
    </div>
    <div style="font-size:12px;color:var(--gray-400);">過去7日間の入力率推移</div>
  `;
}

/* ---------- Drill Recommendation ---------- */
async function renderDrillRecommendation(checkins) {
  const container = document.getElementById('drill-recommendation');
  if (checkins.length === 0) { container.innerHTML = '<div class="card"><div class="loading">データがまだありません</div></div>'; return; }

  // Analyze weak areas (anonymous aggregate)
  const tags = [];
  checkins.forEach(c => {
    const maxScore = c.age_group === 'teens' ? 5 : 3;
    const threshold = c.age_group === 'teens' ? 2.5 : 1.5;
    if (c.sleep_score && c.sleep_score <= threshold) tags.push('low_sleep');
    if (c.mood_score && c.mood_score <= threshold) tags.push('low_mood');
    if (c.motivation_score && c.motivation_score <= threshold) tags.push('low_motivation');
    if (c.focus_score && c.focus_score <= threshold) tags.push('low_focus');
    if (c.fatigue_score && c.fatigue_score <= threshold) tags.push('high_fatigue');
  });

  // Count tag frequencies
  const tagCounts = {};
  tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  if (topTags.length === 0) {
    container.innerHTML = '<div class="card"><div class="card-desc">全体的に好調です。自由にドリルを選んでみましょう！</div></div>';
    return;
  }

  // Find matching drills
  const { data: drills } = await sb.from('kid_drill_menus').select('*').eq('is_active', true);
  const scored = (drills || []).map(d => {
    const matchCount = (d.target_tags || []).filter(t => topTags.includes(t)).length;
    return { ...d, matchCount };
  }).filter(d => d.matchCount > 0).sort((a, b) => b.matchCount - a.matchCount).slice(0, 2);

  if (scored.length === 0) {
    container.innerHTML = '<div class="card"><div class="card-desc">おすすめドリルが見つかりませんでした。</div></div>';
    return;
  }

  container.innerHTML = scored.map(d => `
    <div class="drill-card">
      <div class="drill-card-icon">${d.stamp_icon}</div>
      <div class="drill-card-title">${d.title}</div>
      <div class="drill-card-meta">${d.duration_min}分 ・ ${categoryLabel(d.category)}</div>
      <div class="drill-card-desc">${d.description || ''}</div>
    </div>
  `).join('');
}

function categoryLabel(cat) {
  const m = { visual: 'ビジュアル', coordination: 'コーディネーション', breathing: 'ブレス', challenge: 'チャレンジ', group_fun: 'みんなであそぼう' };
  return m[cat] || cat;
}

/* ---------- Helpers ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

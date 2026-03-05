/* ================================================
   UNLOCK — Professional Brain Capital
   Self-optimization tool for cognitive performance.
   Fully private. No data sharing.
   ================================================ */
'use strict';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============ State ============ */
let currentUser = null;
let todayMorning = null;
let todayEvening = null;
let allDrills = [];
let upcomingEvents = [];

/* ============ Morning Questions (7) ============ */
const MORNING_Q = [
  { key: 'sleep_quality', type: 'rating', text: '睡眠の質', low: '最悪', high: '最高' },
  { key: 'sleep_hours', type: 'number', text: '睡眠時間（時間）', placeholder: '7.5' },
  { key: 'wakeup_energy', type: 'rating', text: '起床時のエネルギー', low: 'ゼロ', high: '最高' },
  { key: 'stress_level', type: 'rating', text: 'ストレスレベル', low: '非常に高い', high: '非常に低い' },
  { key: 'cognitive_load_forecast', type: 'select', text: '今日の認知負荷の見込み',
    options: [
      { value: 'light', label: '軽い' },
      { value: 'normal', label: '普通' },
      { value: 'heavy', label: '重い' },
      { value: 'extreme', label: '極めて重い' }
    ]},
  { key: 'top_task_category', type: 'select', text: '今日の最重要タスク',
    options: [
      { value: 'decision', label: '意思決定' },
      { value: 'creation', label: '創造' },
      { value: 'analysis', label: '分析' },
      { value: 'negotiation', label: '交渉' },
      { value: 'presentation', label: '発表' },
      { value: 'match', label: '対局' },
      { value: 'other', label: 'その他' }
    ]},
  { key: 'overall_condition', type: 'rating', text: 'コンディション総合', low: '最悪', high: '最高' }
];

/* ============ Evening Questions (7) ============ */
const EVENING_Q = [
  { key: 'cognitive_performance', type: 'rating', text: '今日の認知パフォーマンス', low: '最悪', high: '最高' },
  { key: 'focus_peak_time', type: 'select', text: '集中が持続した時間帯',
    options: [
      { value: 'morning', label: '午前' },
      { value: 'afternoon', label: '午後' },
      { value: 'evening', label: '夕方' },
      { value: 'night', label: '夜' },
      { value: 'scattered', label: 'まばら' }
    ]},
  { key: 'judgment_quality', type: 'rating', text: '判断の質（重要な判断があった場合）', low: '鈍かった', high: '鋭かった' },
  { key: 'energy_remaining', type: 'rating', text: 'エネルギーの残量', low: '空っぽ', high: 'まだ余裕' },
  { key: 'recovery_actions', type: 'multi', text: '今日の回復行動（複数選択可）',
    options: [
      { value: 'exercise', label: '運動' },
      { value: 'meditation', label: '瞑想' },
      { value: 'walk', label: '散歩' },
      { value: 'nap', label: '昼寝' },
      { value: 'none', label: 'なし' }
    ]},
  { key: 'substance_intake', type: 'select', text: '飲酒/カフェイン',
    options: [
      { value: 'none', label: 'なし' },
      { value: 'light', label: '少量' },
      { value: 'heavy', label: '多め' }
    ]},
  { key: 'tomorrow_motivation', type: 'rating', text: '明日への意欲', low: 'ゼロ', high: '最高' }
];

/* ============ Event type labels ============ */
const EVENT_TYPES = {
  decision: '意思決定', match: '対局', presentation: 'プレゼン',
  negotiation: '交渉', creation: '創作', deadline: '締切',
  exam: '試験', other: 'その他'
};

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const token = localStorage.getItem('pro_token');
  if (token) {
    const { data } = await sb.from('pro_users').select('*').eq('user_token', token).eq('is_active', true).maybeSingle();
    if (data) { currentUser = data; await showApp(); return; }
  }
  bindRegistration();
}

/* ============ Registration ============ */
function bindRegistration() {
  // Persona multi-select
  const personaContainer = document.getElementById('reg-personas');
  personaContainer.querySelectorAll('.multi-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const errEl = document.getElementById('reg-error');

    if (!name) { errEl.textContent = '名前を入力してください'; errEl.style.display = 'block'; return; }

    const selectedPersonas = Array.from(personaContainer.querySelectorAll('.multi-btn.selected')).map(b => b.dataset.v);
    if (selectedPersonas.length === 0) { errEl.textContent = 'ペルソナを1つ以上選択してください'; errEl.style.display = 'block'; return; }

    const token = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 24) : Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');

    const row = { user_token: token, display_name: name, personas: selectedPersonas };
    if (email) row.email = email;

    const { data, error } = await sb.from('pro_users').insert(row).select().single();
    if (error) { errEl.textContent = 'エラー: ' + error.message; errEl.style.display = 'block'; return; }

    localStorage.setItem('pro_token', token);
    currentUser = data;
    await showApp();
  });
}

/* ============ Show App ============ */
async function showApp() {
  document.getElementById('topbar').style.display = '';
  document.getElementById('nav-tabs').style.display = '';

  // Load data
  const today = todayStr();
  const [mRes, eRes, drillRes, eventRes] = await Promise.all([
    sb.from('pro_morning_checkins').select('*').eq('user_id', currentUser.id).eq('checkin_date', today).maybeSingle(),
    sb.from('pro_evening_checkins').select('*').eq('user_id', currentUser.id).eq('checkin_date', today).maybeSingle(),
    sb.from('pro_drill_menus').select('*').eq('is_active', true),
    sb.from('pro_events').select('*').eq('user_id', currentUser.id).gte('event_date', today).eq('is_completed', false).order('event_date').limit(5)
  ]);

  todayMorning = mRes.data;
  todayEvening = eRes.data;
  allDrills = drillRes.data || [];
  upcomingEvents = eventRes.data || [];

  bindNavigation();
  showTab('home');
}

/* ============ Navigation ============ */
function bindNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });
  document.getElementById('btn-nav-settings').addEventListener('click', () => showScreen('screen-settings'));
  document.getElementById('btn-settings-back').addEventListener('click', () => showTab('home'));

  // Settings
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-delete-account').addEventListener('click', deleteAccount);
  document.getElementById('btn-save-personas').addEventListener('click', savePersonas);
}

function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  switch (tab) {
    case 'home': renderHome(); break;
    case 'morning': renderMorningCheckin(); break;
    case 'evening': renderEveningCheckin(); break;
    case 'events': renderEvents(); break;
    case 'insights': renderInsights(); break;
    case 'reports': renderReports(); break;
    case 'drills': renderDrillLibrary(); break;
    case 'peaking': renderPeaking(); break;
  }
}

/* ============ HOME ============ */
async function renderHome() {
  showScreen('screen-home');

  // Readiness
  if (todayMorning) {
    document.getElementById('home-readiness').textContent = parseFloat(todayMorning.morning_readiness).toFixed(1);
    const sig = todayMorning.signal_level;
    document.getElementById('home-signal').innerHTML = `<span class="signal-badge signal-${sig}">${sig === 'green' ? 'Good' : sig === 'yellow' ? 'Moderate' : 'Low'}</span>`;
  } else {
    document.getElementById('home-readiness').textContent = '—';
    document.getElementById('home-signal').innerHTML = '<span style="font-size:12px;color:var(--gray-500);">朝チェックインを記録してください</span>';
  }

  // Trend arrow (compare to yesterday)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const { data: yd } = await sb.from('pro_morning_checkins').select('morning_readiness').eq('user_id', currentUser.id).eq('checkin_date', yesterday.toISOString().slice(0, 10)).maybeSingle();
  if (todayMorning && yd) {
    const diff = parseFloat(todayMorning.morning_readiness) - parseFloat(yd.morning_readiness);
    const trendEl = document.getElementById('home-trend');
    if (diff > 0.3) { trendEl.className = 'readiness-trend up'; trendEl.textContent = '↑ +' + diff.toFixed(1); }
    else if (diff < -0.3) { trendEl.className = 'readiness-trend down'; trendEl.textContent = '↓ ' + diff.toFixed(1); }
    else { trendEl.className = 'readiness-trend flat'; trendEl.textContent = '→ 安定'; }
  }

  // Streak (count consecutive morning checkin days)
  const { data: recentCheckins } = await sb.from('pro_morning_checkins').select('checkin_date').eq('user_id', currentUser.id).order('checkin_date', { ascending: false }).limit(60);
  const streak = calcStreak(recentCheckins || []);
  document.getElementById('home-streak').textContent = streak;

  // Avg performance (last 7 days evening)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: evenings } = await sb.from('pro_evening_checkins').select('cognitive_performance').eq('user_id', currentUser.id).gte('checkin_date', weekAgo.toISOString().slice(0, 10));
  if (evenings && evenings.length > 0) {
    const avg = evenings.reduce((s, e) => s + e.cognitive_performance, 0) / evenings.length;
    document.getElementById('home-avg-perf').textContent = avg.toFixed(1);
  }

  // Drill count
  const { count: drillCount } = await sb.from('pro_drill_completions').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id);
  document.getElementById('home-drills').textContent = drillCount || 0;

  // Alerts
  await renderAlerts();

  // Next event
  renderNextEvent();

  // Today's drills
  renderTodayDrills();

  // Mini trend chart
  await renderMiniTrend();
}

function calcStreak(checkins) {
  if (!checkins.length) return 0;
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < checkins.length; i++) {
    const expected = new Date(today); expected.setDate(expected.getDate() - i);
    if (checkins[i].checkin_date === expected.toISOString().slice(0, 10)) streak++;
    else break;
  }
  return streak;
}

async function renderAlerts() {
  const container = document.getElementById('home-alerts');
  const { data: signals } = await sb.from('pro_risk_signals').select('*')
    .eq('user_id', currentUser.id).eq('is_dismissed', false).is('resolved_at', null)
    .order('created_at', { ascending: false }).limit(3);

  if (!signals || signals.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = signals.map(s => `
    <div class="alert-card">
      <div class="alert-title">${riskTypeLabel(s.risk_type)}</div>
      <div class="alert-text">${s.message}</div>
      ${s.recommendation ? `<div class="alert-text" style="margin-top:6px;color:var(--accent);">${s.recommendation}</div>` : ''}
    </div>
  `).join('');
}

function riskTypeLabel(t) {
  const m = { burnout: 'バーンアウト兆候', sleep_debt: '睡眠負債', cognitive_decline: '認知パフォーマンス低下', no_recovery: '回復行動ゼロ' };
  return m[t] || t;
}

function renderNextEvent() {
  const container = document.getElementById('home-event');
  if (upcomingEvents.length === 0) { container.innerHTML = ''; return; }
  const ev = upcomingEvents[0];
  const days = Math.ceil((new Date(ev.event_date) - new Date(todayStr())) / 86400000);

  container.innerHTML = `
    <div class="event-card">
      <div style="text-align:center;">
        <div class="event-countdown">${days}</div>
        <div class="event-countdown-label">${days === 0 ? '今日' : 'days'}</div>
      </div>
      <div class="event-info">
        <div class="event-name">${ev.event_name}</div>
        <div class="event-date">${ev.event_date} <span class="event-type-badge">${EVENT_TYPES[ev.event_type] || ev.event_type}</span></div>
      </div>
    </div>`;
}

function renderTodayDrills() {
  const container = document.getElementById('home-drills-list');
  if (!allDrills.length) { container.innerHTML = '<div class="loading">ドリルが登録されていません</div>'; return; }

  // Pick 2 drills based on condition + persona
  const recommended = recommendDrills(2);
  container.innerHTML = recommended.map(d => `
    <div class="drill-card" onclick="completeDrillFromHome('${d.id}')">
      <div class="drill-card-icon">${d.icon}</div>
      <div class="drill-card-title">${d.title}</div>
      <div class="drill-card-meta">${d.duration_min}分 ・ ${categoryLabel(d.category)}</div>
      <div class="drill-card-desc">${d.description || ''}</div>
    </div>
  `).join('');
}

async function renderMiniTrend() {
  const since = new Date(); since.setDate(since.getDate() - 7);
  const { data } = await sb.from('pro_morning_checkins').select('checkin_date, morning_readiness')
    .eq('user_id', currentUser.id).gte('checkin_date', since.toISOString().slice(0, 10))
    .order('checkin_date');

  const svg = document.getElementById('home-trend-chart');
  const empty = document.getElementById('home-trend-empty');

  if (!data || data.length < 2) { svg.style.display = 'none'; empty.style.display = ''; return; }
  svg.style.display = ''; empty.style.display = 'none';

  const W = 580, H = 100, pad = 20;
  const stepX = (W - pad * 2) / (data.length - 1);

  let path = '';
  data.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((parseFloat(d.morning_readiness) || 0) / 5) * (H - pad * 2);
    path += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  });

  svg.innerHTML = `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    data.map((d, i) => {
      const x = pad + i * stepX;
      const y = H - pad - ((parseFloat(d.morning_readiness) || 0) / 5) * (H - pad * 2);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="var(--accent)"/>`;
    }).join('');
}

/* ============ MORNING CHECK-IN ============ */
function renderMorningCheckin() {
  showScreen('screen-morning');
  const container = document.getElementById('morning-questions');
  const doneEl = document.getElementById('morning-done');
  const submitBtn = document.getElementById('btn-morning-submit');

  if (todayMorning) {
    container.style.display = 'none';
    submitBtn.style.display = 'none';
    doneEl.style.display = '';
    document.getElementById('morning-done-msg').textContent = `Morning Readiness: ${parseFloat(todayMorning.morning_readiness).toFixed(1)}`;
    return;
  }

  container.style.display = '';
  submitBtn.style.display = '';
  doneEl.style.display = 'none';

  const answers = {};
  container.innerHTML = MORNING_Q.map((q, i) => renderQuestion(q, i, 'morning')).join('');
  bindQuestionHandlers(container, MORNING_Q, answers, 'morning');

  submitBtn.onclick = () => submitMorning(answers);
}

async function submitMorning(answers) {
  const btn = document.getElementById('btn-morning-submit');
  btn.disabled = true; btn.textContent = '送信中...';

  // Calc readiness: avg of rating fields (sleep_quality, wakeup_energy, stress_level, overall_condition)
  const ratingKeys = ['sleep_quality', 'wakeup_energy', 'stress_level', 'overall_condition'];
  const ratings = ratingKeys.map(k => answers[k]).filter(v => v != null);
  const readiness = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;
  const signal = readiness <= 2 ? 'red' : readiness <= 3 ? 'yellow' : 'green';

  const row = {
    user_id: currentUser.id,
    checkin_date: todayStr(),
    sleep_quality: answers.sleep_quality,
    sleep_hours: answers.sleep_hours ? parseFloat(answers.sleep_hours) : null,
    wakeup_energy: answers.wakeup_energy,
    stress_level: answers.stress_level,
    cognitive_load_forecast: answers.cognitive_load_forecast || 'normal',
    top_task_category: answers.top_task_category || 'other',
    overall_condition: answers.overall_condition,
    morning_readiness: Math.round(readiness * 10) / 10,
    signal_level: signal
  };

  const { data, error } = await sb.from('pro_morning_checkins').upsert(row, { onConflict: 'user_id,checkin_date' }).select().single();
  if (error) { btn.disabled = false; btn.textContent = '送信する'; alert('エラー: ' + error.message); return; }

  todayMorning = data;
  await checkRiskSignals();
  renderMorningCheckin();
}

/* ============ EVENING CHECK-IN ============ */
function renderEveningCheckin() {
  showScreen('screen-evening');
  const container = document.getElementById('evening-questions');
  const doneEl = document.getElementById('evening-done');
  const submitBtn = document.getElementById('btn-evening-submit');

  if (todayEvening) {
    container.style.display = 'none';
    submitBtn.style.display = 'none';
    doneEl.style.display = '';
    document.getElementById('evening-done-msg').textContent = `Evening Review: ${parseFloat(todayEvening.evening_review).toFixed(1)}`;
    return;
  }

  container.style.display = '';
  submitBtn.style.display = '';
  doneEl.style.display = 'none';

  const answers = {};
  container.innerHTML = EVENING_Q.map((q, i) => renderQuestion(q, i, 'evening')).join('');
  bindQuestionHandlers(container, EVENING_Q, answers, 'evening');

  submitBtn.onclick = () => submitEvening(answers);
}

async function submitEvening(answers) {
  const btn = document.getElementById('btn-evening-submit');
  btn.disabled = true; btn.textContent = '送信中...';

  const ratingKeys = ['cognitive_performance', 'judgment_quality', 'energy_remaining', 'tomorrow_motivation'];
  const ratings = ratingKeys.map(k => answers[k]).filter(v => v != null);
  const review = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3;

  const row = {
    user_id: currentUser.id,
    checkin_date: todayStr(),
    cognitive_performance: answers.cognitive_performance,
    focus_peak_time: answers.focus_peak_time || 'morning',
    judgment_quality: answers.judgment_quality || null,
    energy_remaining: answers.energy_remaining,
    recovery_actions: answers.recovery_actions || [],
    substance_intake: answers.substance_intake || 'none',
    tomorrow_motivation: answers.tomorrow_motivation,
    evening_review: Math.round(review * 10) / 10
  };

  const { data, error } = await sb.from('pro_evening_checkins').upsert(row, { onConflict: 'user_id,checkin_date' }).select().single();
  if (error) { btn.disabled = false; btn.textContent = '送信する'; alert('エラー: ' + error.message); return; }

  todayEvening = data;
  await checkRiskSignals();
  renderEveningCheckin();
}

/* ============ EVENTS ============ */
function renderEvents() {
  showScreen('screen-events');

  document.getElementById('btn-add-event').onclick = () => {
    const form = document.getElementById('event-form');
    form.style.display = form.style.display === 'none' ? '' : 'none';
  };

  // Event type select
  bindSelectGroup('event-type-select');
  bindSelectGroup('event-importance');

  document.getElementById('btn-save-event').onclick = saveEvent;

  loadEventList();
}

async function saveEvent() {
  const name = document.getElementById('event-name').value.trim();
  const typeEl = document.querySelector('#event-type-select .select-btn.selected');
  const dateVal = document.getElementById('event-date').value;
  const impEl = document.querySelector('#event-importance .rating-btn.selected');

  if (!name || !dateVal) { alert('イベント名と日付を入力してください'); return; }

  const row = {
    user_id: currentUser.id,
    event_name: name,
    event_type: typeEl ? typeEl.dataset.v : 'other',
    event_date: dateVal,
    importance: impEl ? parseInt(impEl.dataset.v) : 3
  };

  const { error } = await sb.from('pro_events').insert(row);
  if (error) { alert('エラー: ' + error.message); return; }

  document.getElementById('event-form').style.display = 'none';
  document.getElementById('event-name').value = '';

  // Generate peaking protocol for high importance events
  if (row.importance >= 4) {
    await generatePeakingProtocol(row);
  }

  // Reload events
  const { data } = await sb.from('pro_events').select('*').eq('user_id', currentUser.id).gte('event_date', todayStr()).eq('is_completed', false).order('event_date').limit(10);
  upcomingEvents = data || [];
  loadEventList();
}

async function loadEventList() {
  const container = document.getElementById('event-list');
  const { data } = await sb.from('pro_events').select('*').eq('user_id', currentUser.id).order('event_date', { ascending: false }).limit(20);

  if (!data || data.length === 0) { container.innerHTML = '<div class="loading">イベントが登録されていません</div>'; return; }

  container.innerHTML = data.map(ev => {
    const days = Math.ceil((new Date(ev.event_date) - new Date(todayStr())) / 86400000);
    const isPast = days < 0;
    return `
      <div class="event-card" style="${isPast ? 'opacity:0.5;' : ''}">
        <div style="text-align:center;">
          <div class="event-countdown">${isPast ? '—' : days}</div>
          <div class="event-countdown-label">${isPast ? '完了' : days === 0 ? '今日' : 'days'}</div>
        </div>
        <div class="event-info">
          <div class="event-name">${ev.event_name}</div>
          <div class="event-date">${ev.event_date} <span class="event-type-badge">${EVENT_TYPES[ev.event_type] || ev.event_type}</span></div>
        </div>
        ${!isPast ? `<div><button type="button" class="btn-text" onclick="showEventLog('${ev.id}','before')">Before</button><button type="button" class="btn-text" onclick="showEventLog('${ev.id}','after')" style="margin-left:8px;">After</button></div>` : ''}
      </div>`;
  }).join('');
}

/* ============ EVENT LOG ============ */
window.showEventLog = function(eventId, phase) {
  const container = document.getElementById('event-log-form');
  container.style.display = '';

  if (phase === 'before') {
    container.innerHTML = `
      <div class="card" style="margin-top:16px;">
        <div class="card-title">Before Log</div>
        ${renderQuestionInline('pre_condition', 'rating', '直前のコンディション', '最悪', '最高')}
        ${renderQuestionInline('pre_focus', 'rating', '集中度', '最低', '最高')}
        ${renderQuestionInline('pre_pressure', 'rating', 'プレッシャー度', '低', '極高')}
        <div class="checkin-question"><div class="checkin-question-text">直前の準備行動</div>
          <div class="multi-select-group" id="elog-prep">
            <button type="button" class="multi-btn" data-v="breathing">呼吸法</button>
            <button type="button" class="multi-btn" data-v="stretch">ストレッチ</button>
            <button type="button" class="multi-btn" data-v="routine">ルーティン</button>
            <button type="button" class="multi-btn" data-v="none">なし</button>
          </div>
        </div>
        <button type="button" class="btn-primary" id="btn-elog-submit">記録する</button>
      </div>`;
    bindInlineHandlers(container);
    document.getElementById('elog-prep').querySelectorAll('.multi-btn').forEach(b => b.addEventListener('click', () => b.classList.toggle('selected')));
    document.getElementById('btn-elog-submit').onclick = () => submitEventLog(eventId, 'before', container);
  } else {
    container.innerHTML = `
      <div class="card" style="margin-top:16px;">
        <div class="card-title">After Log</div>
        ${renderQuestionInline('post_performance', 'rating', 'パフォーマンス自己評価', '最低', '最高')}
        ${renderQuestionInline('post_judgment', 'rating', '判断の鋭さ', '鈍い', '鋭い')}
        <div class="checkin-question"><div class="checkin-question-text">反省点</div>
          <div class="multi-select-group" id="elog-reflection">
            <button type="button" class="multi-btn" data-v="fatigue">疲労</button>
            <button type="button" class="multi-btn" data-v="focus_lost">集中切れ</button>
            <button type="button" class="multi-btn" data-v="emotional">感情的</button>
            <button type="button" class="multi-btn" data-v="unprepared">準備不足</button>
            <button type="button" class="multi-btn" data-v="none">特になし</button>
          </div>
        </div>
        <button type="button" class="btn-primary" id="btn-elog-submit">記録する</button>
      </div>`;
    bindInlineHandlers(container);
    document.getElementById('elog-reflection').querySelectorAll('.multi-btn').forEach(b => b.addEventListener('click', () => b.classList.toggle('selected')));
    document.getElementById('btn-elog-submit').onclick = () => submitEventLog(eventId, 'after', container);
  }
};

async function submitEventLog(eventId, phase, container) {
  const answers = collectInlineAnswers(container);
  const row = {
    user_id: currentUser.id,
    event_id: eventId,
    phase: phase,
    log_date: todayStr()
  };

  if (phase === 'before') {
    row.pre_condition = answers.pre_condition;
    row.pre_focus = answers.pre_focus;
    row.pre_pressure = answers.pre_pressure;
    row.pre_preparation = Array.from(document.querySelectorAll('#elog-prep .multi-btn.selected')).map(b => b.dataset.v);
  } else {
    row.post_performance = answers.post_performance;
    row.post_judgment = answers.post_judgment;
    row.post_reflection = Array.from(document.querySelectorAll('#elog-reflection .multi-btn.selected')).map(b => b.dataset.v);
  }

  const { error } = await sb.from('pro_event_logs').insert(row);
  if (error) { alert('エラー: ' + error.message); return; }

  container.innerHTML = '<div class="card" style="text-align:center;padding:24px;"><div style="font-size:32px;">✅</div><div style="color:var(--gray-300);margin-top:8px;">記録完了</div></div>';
  setTimeout(() => { container.style.display = 'none'; }, 2000);
}

/* ============ INSIGHTS ============ */
async function renderInsights() {
  showScreen('screen-insights');
  const container = document.getElementById('insights-content');

  // Count total days of data
  const { count: morningCount } = await sb.from('pro_morning_checkins').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id);

  if ((morningCount || 0) < 30) {
    container.innerHTML = `
      <div class="data-counter">
        <div class="data-counter-num">${morningCount || 0} / 30</div>
        <div class="data-counter-label">日分のデータを蓄積中</div>
        <div class="data-counter-sub">30日分のデータが溜まると、あなた専用のインサイトが表示されます。<br>毎日のチェックインを続けてください。</div>
      </div>`;
    return;
  }

  // Generate insights from data
  const insights = await generateInsights();
  if (insights.length === 0) {
    container.innerHTML = '<div class="loading">インサイトを生成中...</div>';
    return;
  }

  container.innerHTML = insights.map(ins => `
    <div class="insight-card ${ins.type === 'warning' ? 'warning' : ''}">
      <div class="insight-type">${ins.type === 'best_condition' ? 'ベストパフォーマンス条件' : '注意パターン'}</div>
      <div class="insight-text">${ins.text}</div>
      <div class="insight-data">${ins.data || ''}</div>
    </div>
  `).join('');
}

async function generateInsights() {
  const insights = [];

  // Fetch all morning + evening data
  const { data: mornings } = await sb.from('pro_morning_checkins').select('*').eq('user_id', currentUser.id).order('checkin_date', { ascending: false }).limit(90);
  const { data: evenings } = await sb.from('pro_evening_checkins').select('*').eq('user_id', currentUser.id).order('checkin_date', { ascending: false }).limit(90);

  if (!mornings || mornings.length < 30) return insights;

  // Build date-keyed map
  const eMap = {};
  (evenings || []).forEach(e => { eMap[e.checkin_date] = e; });

  // 1. Best performance condition: high sleep + low stress → high performance
  const pairedDays = mornings.filter(m => eMap[m.checkin_date]).map(m => ({ m, e: eMap[m.checkin_date] }));

  if (pairedDays.length >= 14) {
    // High sleep quality correlation
    const highSleep = pairedDays.filter(d => d.m.sleep_quality >= 4);
    const lowSleep = pairedDays.filter(d => d.m.sleep_quality <= 2);
    if (highSleep.length >= 5 && lowSleep.length >= 5) {
      const avgHigh = highSleep.reduce((s, d) => s + d.e.cognitive_performance, 0) / highSleep.length;
      const avgLow = lowSleep.reduce((s, d) => s + d.e.cognitive_performance, 0) / lowSleep.length;
      if (avgHigh - avgLow > 0.5) {
        insights.push({
          type: 'best_condition',
          text: `睡眠の質が4以上の日は、認知パフォーマンスが平均${avgHigh.toFixed(1)}（全日平均${(pairedDays.reduce((s, d) => s + d.e.cognitive_performance, 0) / pairedDays.length).toFixed(1)}）`,
          data: `サンプル数: ${highSleep.length}日 vs ${lowSleep.length}日`
        });
      }
    }

    // Low stress correlation
    const lowStress = pairedDays.filter(d => d.m.stress_level >= 4); // 4-5 = low stress (inverted scale)
    if (lowStress.length >= 5) {
      const avgPerf = lowStress.reduce((s, d) => s + d.e.cognitive_performance, 0) / lowStress.length;
      const avgAll = pairedDays.reduce((s, d) => s + d.e.cognitive_performance, 0) / pairedDays.length;
      if (avgPerf - avgAll > 0.3) {
        insights.push({
          type: 'best_condition',
          text: `ストレスが低い朝は、認知パフォーマンスが平均${avgPerf.toFixed(1)}（全日平均${avgAll.toFixed(1)}）`,
          data: `サンプル数: ${lowStress.length}日`
        });
      }
    }

    // Substance intake warning
    const drinkDays = pairedDays.filter(d => d.e.substance_intake === 'heavy');
    if (drinkDays.length >= 3) {
      // Check next day readiness
      const nextDayReadiness = [];
      drinkDays.forEach(d => {
        const nextDate = new Date(d.m.checkin_date);
        nextDate.setDate(nextDate.getDate() + 1);
        const next = mornings.find(m => m.checkin_date === nextDate.toISOString().slice(0, 10));
        if (next) nextDayReadiness.push(parseFloat(next.morning_readiness));
      });
      if (nextDayReadiness.length >= 3) {
        const avgNext = nextDayReadiness.reduce((a, b) => a + b, 0) / nextDayReadiness.length;
        const avgAll = mornings.reduce((s, m) => s + parseFloat(m.morning_readiness), 0) / mornings.length;
        if (avgAll - avgNext > 0.5) {
          insights.push({
            type: 'warning',
            text: `飲酒の翌日のMorning Readinessが平均${(avgAll - avgNext).toFixed(1)}ポイント低下`,
            data: `サンプル数: ${nextDayReadiness.length}日`
          });
        }
      }
    }

    // Recovery action correlation
    const withRecovery = pairedDays.filter(d => d.e.recovery_actions && d.e.recovery_actions.length > 0 && !d.e.recovery_actions.includes('none'));
    const noRecovery = pairedDays.filter(d => !d.e.recovery_actions || d.e.recovery_actions.length === 0 || d.e.recovery_actions.includes('none'));
    if (withRecovery.length >= 5 && noRecovery.length >= 5) {
      // Check next morning readiness
      const withRecReadiness = [], noRecReadiness = [];
      withRecovery.forEach(d => {
        const nextDate = new Date(d.m.checkin_date); nextDate.setDate(nextDate.getDate() + 1);
        const next = mornings.find(m => m.checkin_date === nextDate.toISOString().slice(0, 10));
        if (next) withRecReadiness.push(parseFloat(next.morning_readiness));
      });
      noRecovery.forEach(d => {
        const nextDate = new Date(d.m.checkin_date); nextDate.setDate(nextDate.getDate() + 1);
        const next = mornings.find(m => m.checkin_date === nextDate.toISOString().slice(0, 10));
        if (next) noRecReadiness.push(parseFloat(next.morning_readiness));
      });
      if (withRecReadiness.length >= 3 && noRecReadiness.length >= 3) {
        const avgWith = withRecReadiness.reduce((a, b) => a + b, 0) / withRecReadiness.length;
        const avgNo = noRecReadiness.reduce((a, b) => a + b, 0) / noRecReadiness.length;
        if (avgWith - avgNo > 0.3) {
          insights.push({
            type: 'best_condition',
            text: `回復行動を実施した翌日のReadinessが+${(avgWith - avgNo).toFixed(1)}ポイント改善`,
            data: `回復あり: ${withRecReadiness.length}日 / なし: ${noRecReadiness.length}日`
          });
        }
      }
    }
  }

  // Event log insights
  const { data: eLogs } = await sb.from('pro_event_logs').select('*').eq('user_id', currentUser.id);
  if (eLogs && eLogs.length >= 6) {
    const befores = eLogs.filter(l => l.phase === 'before' && l.pre_preparation);
    const withBreathing = befores.filter(l => l.pre_preparation.includes('breathing'));
    if (withBreathing.length >= 3) {
      // Find corresponding after logs
      const breathingEvents = new Set(withBreathing.map(l => l.event_id));
      const afterWithBreathing = eLogs.filter(l => l.phase === 'after' && breathingEvents.has(l.event_id) && l.post_judgment);
      const afterWithout = eLogs.filter(l => l.phase === 'after' && !breathingEvents.has(l.event_id) && l.post_judgment);
      if (afterWithBreathing.length >= 2 && afterWithout.length >= 2) {
        const avgWith = afterWithBreathing.reduce((s, l) => s + l.post_judgment, 0) / afterWithBreathing.length;
        const avgWo = afterWithout.reduce((s, l) => s + l.post_judgment, 0) / afterWithout.length;
        if (avgWith - avgWo > 0.3) {
          insights.push({
            type: 'best_condition',
            text: `イベント前に呼吸法を実施した際、判断の鋭さが+${(avgWith - avgWo).toFixed(1)}ポイント`,
            data: `サンプル数: ${afterWithBreathing.length}回 vs ${afterWithout.length}回`
          });
        }
      }
    }
  }

  return insights;
}

/* ============ REPORTS ============ */
async function renderReports() {
  showScreen('screen-reports');

  // Weekly reports
  const { data: weeklyData } = await sb.from('pro_weekly_reports').select('*').eq('user_id', currentUser.id).order('week_start', { ascending: false }).limit(8);
  const weeklyContainer = document.getElementById('weekly-reports');

  if (weeklyData && weeklyData.length > 0) {
    weeklyContainer.innerHTML = weeklyData.map(r => `
      <div class="report-card">
        <div class="report-week">${r.week_start} 〜</div>
        <div class="report-summary">${r.summary_text || '—'}</div>
        ${r.avg_readiness ? `<div style="font-size:11px;color:var(--gray-500);margin-top:4px;">平均Readiness: ${parseFloat(r.avg_readiness).toFixed(1)} / 平均Performance: ${r.avg_performance ? parseFloat(r.avg_performance).toFixed(1) : '—'}</div>` : ''}
      </div>
    `).join('');
  } else {
    // Auto-generate from data
    await generateWeeklyReport(weeklyContainer);
  }

  // Monthly reports
  const { data: monthlyData } = await sb.from('pro_monthly_reports').select('*').eq('user_id', currentUser.id).order('report_month', { ascending: false }).limit(6);
  const monthlyContainer = document.getElementById('monthly-reports');

  if (monthlyData && monthlyData.length > 0) {
    monthlyContainer.innerHTML = monthlyData.map(r => `
      <div class="report-card">
        <div class="report-week">${r.report_month}</div>
        <div class="report-summary">${r.summary_text || '—'}</div>
      </div>
    `).join('');
  } else {
    monthlyContainer.innerHTML = '<div class="loading">月次レポートは月末に自動生成されます</div>';
  }
}

async function generateWeeklyReport(container) {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const [mRes, eRes] = await Promise.all([
    sb.from('pro_morning_checkins').select('*').eq('user_id', currentUser.id).gte('checkin_date', weekStart).order('checkin_date'),
    sb.from('pro_evening_checkins').select('*').eq('user_id', currentUser.id).gte('checkin_date', weekStart).order('checkin_date')
  ]);

  const mornings = mRes.data || [];
  const evenings = eRes.data || [];

  if (mornings.length === 0) { container.innerHTML = '<div class="loading">今週のデータがまだありません</div>'; return; }

  const avgR = mornings.reduce((s, m) => s + parseFloat(m.morning_readiness), 0) / mornings.length;
  const avgP = evenings.length > 0 ? evenings.reduce((s, e) => s + e.cognitive_performance, 0) / evenings.length : null;

  // Best/worst day
  const best = mornings.reduce((a, b) => parseFloat(a.morning_readiness) > parseFloat(b.morning_readiness) ? a : b);
  const worst = mornings.reduce((a, b) => parseFloat(a.morning_readiness) < parseFloat(b.morning_readiness) ? a : b);

  let summary = `今週は${mornings.length}日分のデータを記録。`;
  summary += `平均Readinessは${avgR.toFixed(1)}。`;
  if (avgP) summary += `平均パフォーマンスは${avgP.toFixed(1)}。`;
  summary += `ベストは${best.checkin_date}（${parseFloat(best.morning_readiness).toFixed(1)}）。`;

  container.innerHTML = `
    <div class="report-card">
      <div class="report-week">${weekStart} 〜</div>
      <div class="report-summary">${summary}</div>
      <div style="margin-top:8px;">
        ${mornings.map(m => {
          const sig = m.signal_level;
          return `<span class="signal-badge signal-${sig}" style="margin:2px;">${m.checkin_date.slice(5)} ${parseFloat(m.morning_readiness).toFixed(1)}</span>`;
        }).join(' ')}
      </div>
    </div>`;
}

/* ============ DRILLS ============ */
function renderDrillLibrary() {
  showScreen('screen-drills');
  const container = document.getElementById('drill-library');

  if (!allDrills.length) { container.innerHTML = '<div class="loading">ドリルが登録されていません</div>'; return; }

  // Group by category
  const cats = {};
  allDrills.forEach(d => { if (!cats[d.category]) cats[d.category] = []; cats[d.category].push(d); });

  container.innerHTML = Object.entries(cats).map(([cat, drills]) => `
    <div class="section-header">${categoryLabel(cat)}</div>
    ${drills.map(d => `
      <div class="drill-card" onclick="completeDrillFromHome('${d.id}')">
        <div class="drill-card-icon">${d.icon}</div>
        <div class="drill-card-title">${d.title}</div>
        <div class="drill-card-meta">${d.duration_min}分 ・ ${d.difficulty} ・ ${(d.target_personas || []).join(', ')}</div>
        <div class="drill-card-desc">${d.description || ''}</div>
      </div>
    `).join('')}
  `).join('');
}

window.completeDrillFromHome = async function(drillId) {
  const { error } = await sb.from('pro_drill_completions').insert({
    user_id: currentUser.id,
    drill_id: drillId,
    completed_date: todayStr()
  });
  if (error) { alert('記録に失敗しました'); return; }

  // Visual feedback
  const cards = document.querySelectorAll('.drill-card');
  cards.forEach(c => {
    if (c.getAttribute('onclick') && c.getAttribute('onclick').includes(drillId)) {
      c.style.borderColor = 'var(--green)';
      c.innerHTML = '<div style="text-align:center;padding:16px;color:var(--green);font-weight:700;">✅ 完了</div>';
    }
  });
};

/* ============ PEAKING ============ */
async function renderPeaking() {
  showScreen('screen-peaking');
  const container = document.getElementById('peaking-content');

  if (upcomingEvents.length === 0) {
    container.innerHTML = '<div class="loading">登録済みのイベントがありません。<br>「イベント」タブからイベントを登録してください。</div>';
    return;
  }

  // Show protocols for upcoming high-importance events
  let html = '';
  for (const ev of upcomingEvents.filter(e => e.importance >= 3)) {
    const days = Math.ceil((new Date(ev.event_date) - new Date(todayStr())) / 86400000);
    html += `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--white);">${ev.event_name}</div>
            <div style="font-size:11px;color:var(--gray-400);">${ev.event_date} <span class="event-type-badge">${EVENT_TYPES[ev.event_type] || ev.event_type}</span></div>
          </div>
          <div style="text-align:center;">
            <div class="event-countdown">${days}</div>
            <div class="event-countdown-label">${days === 0 ? '今日' : 'days'}</div>
          </div>
        </div>
      </div>`;

    // Load protocol
    const { data: protocols } = await sb.from('pro_peaking_protocols').select('*').eq('event_id', ev.id).order('days_before', { ascending: false });

    if (protocols && protocols.length > 0) {
      html += protocols.map(p => `
        <div class="protocol-day ${p.protocol_date === todayStr() ? 'style="border-color:var(--accent);"' : ''}">
          <div class="protocol-day-label">${p.protocol_date}（${p.days_before}日前）</div>
          ${p.sleep_rec ? `<div class="protocol-item">💤 ${p.sleep_rec}</div>` : ''}
          ${p.nutrition_rec ? `<div class="protocol-item">🍽️ ${p.nutrition_rec}</div>` : ''}
          ${p.exercise_rec ? `<div class="protocol-item">🏃 ${p.exercise_rec}</div>` : ''}
          ${p.routine_rec ? `<div class="protocol-item">🧘 ${p.routine_rec}</div>` : ''}
          ${p.drill_rec ? `<div class="protocol-item">🧠 ${p.drill_rec}</div>` : ''}
        </div>
      `).join('');
    } else if (days <= 3 && days >= 0) {
      html += '<div class="loading">プロトコルを生成中...</div>';
      await generatePeakingProtocol(ev);
    }
  }

  container.innerHTML = html || '<div class="loading">重要度3以上のイベントにピーキングプロトコルが生成されます</div>';
}

async function generatePeakingProtocol(event) {
  const eventDate = new Date(event.event_date || event.event_date);
  const protocols = [];

  for (let d = 3; d >= 0; d--) {
    const date = new Date(eventDate); date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().slice(0, 10);

    const proto = {
      user_id: currentUser.id,
      event_id: event.id || event.event_id,
      days_before: d,
      protocol_date: dateStr
    };

    if (d === 3) {
      proto.sleep_rec = '7.5時間以上を確保。就寝1時間前にスクリーンオフ。';
      proto.nutrition_rec = 'カフェインは14時まで。飲酒を控える。';
      proto.exercise_rec = '軽い有酸素運動（30分散歩）で血流を改善。';
      proto.routine_rec = '瞑想5分 or 呼吸法で自律神経を整える。';
    } else if (d === 2) {
      proto.sleep_rec = '就寝・起床時間を一定に。7.5時間以上。';
      proto.nutrition_rec = '炭水化物を適度に。脳のエネルギー備蓄。';
      proto.exercise_rec = 'ストレッチ＋軽いコーディネーションドリル。';
      proto.drill_rec = '空間認知ドリル or 逆ストループ（5分）';
    } else if (d === 1) {
      proto.sleep_rec = '早めに就寝。8時間を目標。';
      proto.nutrition_rec = '消化の良い食事。アルコール完全禁止。';
      proto.exercise_rec = '激しい運動は避ける。散歩程度。';
      proto.routine_rec = '明日の流れをイメージリハーサル。';
      proto.drill_rec = '4-7-8呼吸法（2分）でリラックス。';
    } else {
      proto.sleep_rec = '起床後すぐに日光を浴びる。';
      proto.nutrition_rec = '朝食はタンパク質＋複合糖質。直前にカフェイン少量OK。';
      proto.routine_rec = '直前に4-7-8呼吸法 → グラウンディング → 集中ドリル。';
      proto.drill_rec = 'プレッシャー呼吸＋二重課題（3分）';
    }

    protocols.push(proto);
  }

  await sb.from('pro_peaking_protocols').upsert(protocols, { onConflict: 'id' });
}

/* ============ RISK SIGNALS ============ */
async function checkRiskSignals() {
  const signals = [];

  // 1. Sleep debt: avg sleep < 6h for 7+ days
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: weekMornings } = await sb.from('pro_morning_checkins').select('sleep_hours')
    .eq('user_id', currentUser.id).gte('checkin_date', weekAgo.toISOString().slice(0, 10));

  if (weekMornings && weekMornings.length >= 5) {
    const withHours = weekMornings.filter(m => m.sleep_hours);
    if (withHours.length >= 5) {
      const avg = withHours.reduce((s, m) => s + parseFloat(m.sleep_hours), 0) / withHours.length;
      if (avg < 6) {
        signals.push({
          risk_type: 'sleep_debt',
          risk_level: avg < 5 ? 'red' : 'yellow',
          message: `直近${withHours.length}日間の平均睡眠時間が${avg.toFixed(1)}時間です。睡眠負債が蓄積しています。`,
          recommendation: '今週は毎晩7.5時間以上の睡眠を目指してください。就寝1時間前のスクリーンオフを実施しましょう。'
        });
      }
    }
  }

  // 2. No recovery: no recovery actions for 7+ days
  const { data: weekEvenings } = await sb.from('pro_evening_checkins').select('recovery_actions')
    .eq('user_id', currentUser.id).gte('checkin_date', weekAgo.toISOString().slice(0, 10));

  if (weekEvenings && weekEvenings.length >= 5) {
    const noRecovery = weekEvenings.every(e => !e.recovery_actions || e.recovery_actions.length === 0 || e.recovery_actions.includes('none'));
    if (noRecovery) {
      signals.push({
        risk_type: 'no_recovery',
        risk_level: 'yellow',
        message: '直近1週間、回復行動が記録されていません。',
        recommendation: '散歩15分、瞑想5分、昼寝20分。いずれか1つを明日試してみてください。'
      });
    }
  }

  // 3. Burnout: readiness + motivation declining for 2+ weeks
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const { data: twoWeekMornings } = await sb.from('pro_morning_checkins').select('morning_readiness, overall_condition, checkin_date')
    .eq('user_id', currentUser.id).gte('checkin_date', twoWeeksAgo.toISOString().slice(0, 10)).order('checkin_date');

  if (twoWeekMornings && twoWeekMornings.length >= 10) {
    const firstHalf = twoWeekMornings.slice(0, Math.floor(twoWeekMornings.length / 2));
    const secondHalf = twoWeekMornings.slice(Math.floor(twoWeekMornings.length / 2));
    const avgFirst = firstHalf.reduce((s, m) => s + parseFloat(m.morning_readiness), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + parseFloat(m.morning_readiness), 0) / secondHalf.length;
    if (avgFirst - avgSecond > 0.8) {
      signals.push({
        risk_type: 'burnout',
        risk_level: 'red',
        message: '過去2週間でReadinessが持続的に低下しています。バーンアウトの兆候かもしれません。',
        recommendation: '今週は意図的に負荷を下げ、回復に充てる時間を確保してください。改善しない場合は専門家への相談も検討してください。'
      });
    }
  }

  // Save signals
  for (const sig of signals) {
    // Check if similar recent signal exists
    const { data: existing } = await sb.from('pro_risk_signals').select('id')
      .eq('user_id', currentUser.id).eq('risk_type', sig.risk_type)
      .is('resolved_at', null).gte('created_at', weekAgo.toISOString()).limit(1);
    if (existing && existing.length > 0) continue;

    await sb.from('pro_risk_signals').insert({ user_id: currentUser.id, ...sig });
  }
}

/* ============ DRILL RECOMMENDATION ============ */
function recommendDrills(count) {
  if (!allDrills.length) return [];

  const personas = currentUser.personas || [];
  const tags = [];

  if (todayMorning) {
    if (todayMorning.sleep_quality <= 2) tags.push('low_sleep');
    if (todayMorning.stress_level <= 2) tags.push('high_stress');
    if (todayMorning.wakeup_energy <= 2) tags.push('low_energy');
    if (todayMorning.overall_condition <= 2) tags.push('low_focus');

    // Check if there's an event today
    const todayEvent = upcomingEvents.find(e => e.event_date === todayStr());
    if (todayEvent) tags.push('pre_event');
  }

  // Score drills
  const scored = allDrills.map(d => {
    let score = 0;
    // Persona match
    if (d.target_personas && d.target_personas.some(p => personas.includes(p))) score += 3;
    // Condition match
    if (d.target_conditions && d.target_conditions.some(t => tags.includes(t))) score += 5;
    // Brain type match
    if (currentUser.brain_type && d.target_brain_types) {
      const axes = currentUser.brain_type.split('');
      if (d.target_brain_types.some(t => axes.includes(t))) score += 2;
    }
    // Add some randomness based on date
    score += simpleHash(todayStr() + d.id) % 3;
    return { ...d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count);
}

/* ============ SETTINGS ============ */
function showSettings() {
  showScreen('screen-settings');
  document.getElementById('settings-profile').textContent = `${currentUser.display_name} ・ ${(currentUser.personas || []).join(', ')}`;

  const personaContainer = document.getElementById('settings-personas');
  const allPersonas = [
    { v: 'executive', l: '経営者・起業家' },
    { v: 'athlete', l: '棋士・esports' },
    { v: 'investor', l: '投資家' },
    { v: 'creator', l: 'クリエイター' },
    { v: 'lawyer', l: '弁護士・士業' },
    { v: 'doctor', l: '医師・医療' }
  ];
  personaContainer.innerHTML = allPersonas.map(p =>
    `<button type="button" class="multi-btn ${(currentUser.personas || []).includes(p.v) ? 'selected' : ''}" data-v="${p.v}">${p.l}</button>`
  ).join('');
  personaContainer.querySelectorAll('.multi-btn').forEach(b => b.addEventListener('click', () => b.classList.toggle('selected')));
}

async function savePersonas() {
  const selected = Array.from(document.querySelectorAll('#settings-personas .multi-btn.selected')).map(b => b.dataset.v);
  if (selected.length === 0) { alert('1つ以上選択してください'); return; }
  await sb.from('pro_users').update({ personas: selected, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
  currentUser.personas = selected;
  alert('保存しました');
}

async function exportData() {
  const [mRes, eRes, evRes, elRes, drRes] = await Promise.all([
    sb.from('pro_morning_checkins').select('*').eq('user_id', currentUser.id).order('checkin_date'),
    sb.from('pro_evening_checkins').select('*').eq('user_id', currentUser.id).order('checkin_date'),
    sb.from('pro_events').select('*').eq('user_id', currentUser.id).order('event_date'),
    sb.from('pro_event_logs').select('*').eq('user_id', currentUser.id).order('log_date'),
    sb.from('pro_drill_completions').select('*').eq('user_id', currentUser.id).order('completed_date')
  ]);

  const exportObj = {
    user: currentUser,
    morning_checkins: mRes.data || [],
    evening_checkins: eRes.data || [],
    events: evRes.data || [],
    event_logs: elRes.data || [],
    drill_completions: drRes.data || [],
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `unlock_pro_export_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function deleteAccount() {
  if (!confirm('アカウントを削除しますか？すべてのデータが即座に削除されます。この操作は元に戻せません。')) return;
  if (!confirm('本当に削除しますか？最終確認です。')) return;

  await sb.from('pro_users').delete().eq('id', currentUser.id);
  localStorage.removeItem('pro_token');
  location.reload();
}

/* ============ QUESTION RENDERING HELPERS ============ */
function renderQuestion(q, idx, prefix) {
  let html = `<div class="checkin-question"><div class="checkin-question-text">${q.text}</div>`;

  if (q.type === 'rating') {
    html += `<div class="rating-group" data-prefix="${prefix}" data-key="${q.key}">
      ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rating-btn" data-v="${v}">${v}</button>`).join('')}
    </div>
    <div class="rating-labels"><span>${q.low}</span><span>${q.high}</span></div>`;
  } else if (q.type === 'number') {
    html += `<input class="form-input" type="number" step="0.5" placeholder="${q.placeholder || ''}" data-prefix="${prefix}" data-key="${q.key}" style="margin-top:8px;">`;
  } else if (q.type === 'select') {
    html += `<div class="select-group" data-prefix="${prefix}" data-key="${q.key}">
      ${q.options.map(o => `<button type="button" class="select-btn" data-v="${o.value}">${o.label}</button>`).join('')}
    </div>`;
  } else if (q.type === 'multi') {
    html += `<div class="multi-select-group" data-prefix="${prefix}" data-key="${q.key}">
      ${q.options.map(o => `<button type="button" class="multi-btn" data-v="${o.value}">${o.label}</button>`).join('')}
    </div>`;
  }

  html += '</div>';
  return html;
}

function bindQuestionHandlers(container, questions, answers, prefix) {
  const submitBtnId = prefix === 'morning' ? 'btn-morning-submit' : 'btn-evening-submit';
  const requiredCount = questions.filter(q => q.type === 'rating').length;

  // Rating buttons
  container.querySelectorAll('.rating-group').forEach(group => {
    group.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answers[group.dataset.key] = parseInt(btn.dataset.v);
        checkSubmitEnabled(answers, requiredCount, submitBtnId);
      });
    });
  });

  // Number inputs
  container.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('input', () => {
      answers[input.dataset.key] = input.value;
    });
  });

  // Select buttons
  container.querySelectorAll('.select-group').forEach(group => {
    group.querySelectorAll('.select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.select-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        answers[group.dataset.key] = btn.dataset.v;
      });
    });
  });

  // Multi-select buttons
  container.querySelectorAll('.multi-select-group').forEach(group => {
    group.querySelectorAll('.multi-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
        answers[group.dataset.key] = Array.from(group.querySelectorAll('.multi-btn.selected')).map(b => b.dataset.v);
      });
    });
  });
}

function checkSubmitEnabled(answers, requiredCount, btnId) {
  const ratingCount = Object.values(answers).filter(v => typeof v === 'number').length;
  document.getElementById(btnId).disabled = ratingCount < requiredCount;
}

/* Inline question rendering for event logs */
function renderQuestionInline(key, type, text, low, high) {
  return `<div class="checkin-question"><div class="checkin-question-text">${text}</div>
    <div class="rating-group" data-key="${key}">
      ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rating-btn" data-v="${v}">${v}</button>`).join('')}
    </div>
    <div class="rating-labels"><span>${low}</span><span>${high}</span></div>
  </div>`;
}

function bindInlineHandlers(container) {
  container.querySelectorAll('.rating-group').forEach(group => {
    group.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  });
}

function collectInlineAnswers(container) {
  const answers = {};
  container.querySelectorAll('.rating-group').forEach(group => {
    const sel = group.querySelector('.rating-btn.selected');
    if (sel) answers[group.dataset.key] = parseInt(sel.dataset.v);
  });
  return answers;
}

function bindSelectGroup(id) {
  const group = document.getElementById(id);
  if (!group) return;
  group.querySelectorAll('.select-btn, .rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.select-btn, .rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

/* ============ HELPERS ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function categoryLabel(cat) {
  const m = { spatial: '空間認知', dual_task: 'デュアルタスク', breathing: '呼吸法', decision_speed: '判断速度', creative: '創造性', recovery: 'リカバリー' };
  return m[cat] || cat;
}

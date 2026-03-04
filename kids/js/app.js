/* ================================================
   UNLOCK — Kids/Teens Brain Capital App
   Fun-first, safe, no ranking, no comparison
   ================================================ */
'use strict';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- State ---------- */
let currentChild = null;
let orgCode = null;
let orgData = null;
let allDrills = [];
let allBadges = [];
let earnedBadges = [];
let todayCheckin = null;
let todayDrill = null;

/* ---------- Kids Questions (3Q, 3-choice emoji) ---------- */
const KIDS_QUESTIONS = [
  {
    key: 'sleep', field: 'sleep_score',
    text: 'きのうのよる、よくねむれた？',
    choices: [
      { value: 3, icon: '😴', label: 'ぐっすり' },
      { value: 2, icon: '😐', label: 'ふつう' },
      { value: 1, icon: '😵', label: 'ねむい…' }
    ]
  },
  {
    key: 'mood', field: 'mood_score',
    text: 'いまの きぶんは？',
    choices: [
      { value: 3, icon: '😊', label: 'いいかんじ' },
      { value: 2, icon: '😐', label: 'ふつう' },
      { value: 1, icon: '😢', label: 'ちょっと…' }
    ]
  },
  {
    key: 'motivation', field: 'motivation_score',
    text: 'きょう、なにかやりたい？',
    choices: [
      { value: 3, icon: '🔥', label: 'やるぞ！' },
      { value: 2, icon: '🙂', label: 'まあまあ' },
      { value: 1, icon: '😴', label: 'のんびり…' }
    ]
  }
];

/* ---------- Teens Questions (5Q, 5-level) ---------- */
const TEENS_QUESTIONS = [
  { key: 'sleep',      field: 'sleep_score',      text: '睡眠の質はどうだった？',    low: 'ほぼ寝てない', high: 'ぐっすり' },
  { key: 'mood',       field: 'mood_score',       text: '今の気分は？',             low: 'かなり落ち込み', high: 'すごく良い' },
  { key: 'motivation', field: 'motivation_score', text: 'やる気はどのくらい？',      low: '全然ない', high: '最高' },
  { key: 'fatigue',    field: 'fatigue_score',    text: '疲れ具合は？',             low: 'クタクタ', high: '元気いっぱい' },
  { key: 'focus',      field: 'focus_score',      text: '集中できそう？',           low: '全然ムリ', high: 'バッチリ' }
];

/* ---------- Character faces ---------- */
const FACES = {
  great: { face: '😄', msg: 'きょうもげんき！すごい！', sub: 'このちょうし！' },
  ok:    { face: '😊', msg: 'いいかんじだね！',        sub: 'きょうもたのしもう' },
  rest:  { face: '😌', msg: 'ちょっとおやすみモード',   sub: 'むりしなくてだいじょうぶだよ' },
  none:  { face: '🤔', msg: 'きょうのきぶんは？',      sub: 'チェックインしておしえてね' }
};

const ACTION_SUGGESTIONS = {
  low_sleep: ['早めにおふとんに入ろう', '寝る前はスマホを見ないようにしよう'],
  low_mood: ['好きな音楽を聴いてリフレッシュ', '友だちとおしゃべりしよう'],
  low_motivation: ['小さい目標からやってみよう', '好きなことを10分だけやろう'],
  high_fatigue: ['ストレッチして体をほぐそう', 'ゆっくり深呼吸してみよう'],
  low_focus: ['静かな場所で5分集中してみよう', '目を閉じて30秒リラックス']
};

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const params = new URLSearchParams(location.search);
  orgCode = params.get('org');
  if (!orgCode) { document.body.innerHTML = '<div class="loading">組織コードが見つかりません。URLを確認してください。</div>'; return; }

  const { data: org } = await sb.from('kid_orgs').select('*').eq('org_code', orgCode).eq('is_active', true).maybeSingle();
  if (!org) { document.body.innerHTML = '<div class="loading">組織が見つかりません。</div>'; return; }
  orgData = org;

  // Check stored token
  const token = localStorage.getItem('kid_token_' + orgCode);
  if (token) {
    const { data: child } = await sb.from('children').select('*').eq('child_token', token).eq('is_active', true).maybeSingle();
    if (child) { currentChild = child; await showHome(); return; }
  }

  // Load groups for registration
  await loadGroups();
  bindRegistration();
}

/* ---------- Registration ---------- */
async function loadGroups() {
  const { data } = await sb.from('kid_groups').select('*').eq('org_code', orgCode).order('sort_order');
  const sel = document.getElementById('reg-group');
  if (!data || data.length === 0) {
    sel.innerHTML = '<option value="">グループが未登録です</option>';
    return;
  }
  sel.innerHTML = '<option value="">えらんでね</option>' + data.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
}

function bindRegistration() {
  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const groupId = document.getElementById('reg-group').value;
    const ageGroup = document.getElementById('reg-age-group').value;
    const birthYear = document.getElementById('reg-birth-year').value;
    const errEl = document.getElementById('reg-error');

    if (!name) { errEl.textContent = 'なまえを入れてね'; errEl.style.display = 'block'; return; }

    const token = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 24) : Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');

    const row = {
      org_code: orgCode,
      child_token: token,
      display_name: name,
      age_group: ageGroup,
      share_with_parent: true
    };
    if (groupId) row.group_id = groupId;
    if (birthYear) row.birth_year = parseInt(birthYear);

    const { data, error } = await sb.from('children').insert(row).select().single();
    if (error) { errEl.textContent = 'エラーが発生しました'; errEl.style.display = 'block'; return; }

    localStorage.setItem('kid_token_' + orgCode, token);
    currentChild = data;
    await showHome();
  });
}

/* ---------- Show Home ---------- */
async function showHome() {
  showScreen('loading');
  document.getElementById('topbar').style.display = '';
  document.getElementById('topbar-org').textContent = orgData.org_name;

  // Load data in parallel
  const today = new Date().toISOString().slice(0, 10);
  const [checkinRes, drillRes, badgeRes, earnedRes] = await Promise.all([
    sb.from('kid_daily_checkins').select('*').eq('child_id', currentChild.id).eq('checkin_date', today).maybeSingle(),
    sb.from('kid_drill_menus').select('*').eq('is_active', true).in('target_age', [currentChild.age_group, 'all']),
    sb.from('kid_badges').select('*').eq('is_active', true),
    sb.from('kid_child_badges').select('*, kid_badges(*)').eq('child_id', currentChild.id)
  ]);

  todayCheckin = checkinRes.data;
  allDrills = drillRes.data || [];
  allBadges = badgeRes.data || [];
  earnedBadges = (earnedRes.data || []).map(eb => eb.badge_id);

  // Update streak display
  if (currentChild.streak_count > 0) {
    document.getElementById('topbar-streak').style.display = '';
    document.getElementById('streak-count').textContent = currentChild.streak_count;
  }

  if (currentChild.age_group === 'kids') {
    await renderKidsHome();
  } else {
    await renderTeensHome();
  }

  bindNavigation();
}

/* ---------- Kids Home ---------- */
async function renderKidsHome() {
  showScreen('screen-home-kids');

  // Character face
  if (todayCheckin) {
    const sig = todayCheckin.signal_level;
    const f = sig === 'green' ? FACES.great : sig === 'yellow' ? FACES.ok : FACES.rest;
    document.getElementById('kids-face').textContent = f.face;
    document.getElementById('kids-msg').textContent = f.msg;
    document.getElementById('kids-sub').textContent = f.sub;
    document.getElementById('btn-kids-checkin').textContent = 'チェックインずみ ✅';
    document.getElementById('btn-kids-checkin').disabled = true;
  } else {
    const f = FACES.none;
    document.getElementById('kids-face').textContent = f.face;
    document.getElementById('kids-msg').textContent = f.msg;
    document.getElementById('kids-sub').textContent = f.sub;
  }

  // Today's drill
  renderDrillArea('kids-drill-area');

  // Badge preview (show first 4)
  renderBadgePreview('kids-badge-preview');
}

/* ---------- Teens Home ---------- */
async function renderTeensHome() {
  showScreen('screen-home-teens');

  if (todayCheckin) {
    const score = parseFloat(todayCheckin.readiness_score) || 0;
    document.getElementById('teens-score').textContent = score.toFixed(1);
    const sig = todayCheckin.signal_level;
    document.getElementById('teens-signal').innerHTML = `<span class="signal-gentle signal-${sig === 'green' ? 'great' : sig === 'yellow' ? 'ok' : 'rest'}">${sig === 'green' ? '好調' : sig === 'yellow' ? 'まあまあ' : 'おやすみモード'}</span>`;
    document.getElementById('teens-msg').textContent = '今日のReadiness';

    // Action suggestion
    const action = getActionSuggestion(todayCheckin);
    document.getElementById('teens-action').textContent = action || '';

    document.getElementById('btn-teens-checkin').textContent = 'チェックイン済み ✅';
    document.getElementById('btn-teens-checkin').disabled = true;
  } else {
    document.getElementById('teens-score').textContent = '—';
    document.getElementById('teens-signal').innerHTML = '';
    document.getElementById('teens-action').textContent = 'チェックインして今日の状態を記録しよう';
  }

  renderDrillArea('teens-drill-area');
  await renderTeensTrend();
}

/* ---------- Teens Trend ---------- */
async function renderTeensTrend() {
  const since = new Date(); since.setDate(since.getDate() - 28);
  const { data } = await sb.from('kid_daily_checkins').select('checkin_date, readiness_score')
    .eq('child_id', currentChild.id).gte('checkin_date', since.toISOString().slice(0, 10))
    .order('checkin_date');

  const svg = document.getElementById('teens-trend-chart');
  const empty = document.getElementById('teens-trend-empty');
  if (!data || data.length < 2) { svg.style.display = 'none'; empty.style.display = ''; return; }

  svg.style.display = ''; empty.style.display = 'none';
  const maxScore = currentChild.age_group === 'teens' ? 5 : 3;
  const W = 580, H = 140, pad = 20;
  const stepX = (W - pad * 2) / (data.length - 1);

  let path = '';
  data.forEach((d, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((parseFloat(d.readiness_score) || 0) / maxScore) * (H - pad * 2);
    path += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  });

  svg.innerHTML = `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    data.map((d, i) => {
      const x = pad + i * stepX;
      const y = H - pad - ((parseFloat(d.readiness_score) || 0) / maxScore) * (H - pad * 2);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--accent)"/>`;
    }).join('');
}

/* ---------- Drill Area ---------- */
function renderDrillArea(containerId) {
  const container = document.getElementById(containerId);
  if (!allDrills.length) { container.innerHTML = ''; return; }

  // Pick today's drill (deterministic based on date + child)
  const today = new Date().toISOString().slice(0, 10);
  const hash = simpleHash(today + currentChild.id);
  const idx = hash % allDrills.length;
  todayDrill = allDrills[idx];

  const isKids = currentChild.age_group === 'kids';
  container.innerHTML = `
    <div class="section-header">${isKids ? 'きょうのあそび' : '今日のおすすめドリル'}</div>
    <div class="drill-card" id="drill-card-${containerId}" style="cursor:pointer;">
      <div class="drill-card-icon">${todayDrill.stamp_icon}</div>
      <div class="drill-card-title">${todayDrill.title}</div>
      <div class="drill-card-meta">${todayDrill.duration_min}分 ・ ${categoryLabel(todayDrill.category)}</div>
      <div class="drill-card-desc">${todayDrill.description || ''}</div>
    </div>`;

  container.querySelector('.drill-card').addEventListener('click', () => showDrill(todayDrill));
}

function categoryLabel(cat) {
  const m = { visual: 'ビジュアル', coordination: 'コーディネーション', breathing: 'ブレス', challenge: 'チャレンジ', group_fun: 'みんなであそぼう' };
  return m[cat] || cat;
}

/* ---------- Badge Preview ---------- */
function renderBadgePreview(containerId) {
  const container = document.getElementById(containerId);
  const preview = allBadges.slice(0, 4).map(b => {
    const earned = earnedBadges.includes(b.id);
    return `<div class="badge-item ${earned ? '' : 'badge-locked'}"><div class="badge-icon">${b.icon}</div><div class="badge-title">${b.title}</div></div>`;
  }).join('');
  container.innerHTML = preview;
}

/* ---------- Navigation ---------- */
function bindNavigation() {
  const once = { once: false };

  // Kids check-in
  const btnKids = document.getElementById('btn-kids-checkin');
  if (btnKids && !btnKids.disabled) btnKids.addEventListener('click', () => startKidsCheckin());

  const btnTeens = document.getElementById('btn-teens-checkin');
  if (btnTeens && !btnTeens.disabled) btnTeens.addEventListener('click', () => startTeensCheckin());

  document.getElementById('btn-badges').addEventListener('click', () => showBadgesScreen());
  document.getElementById('btn-settings').addEventListener('click', () => showSettings());
  document.getElementById('btn-badges-back').addEventListener('click', () => goHome());
  document.getElementById('btn-settings-back').addEventListener('click', () => goHome());
  document.getElementById('btn-done-home').addEventListener('click', () => { location.reload(); });
  document.getElementById('btn-drill-done').addEventListener('click', completeDrill);
  document.getElementById('btn-drill-back').addEventListener('click', () => goHome());
}

function goHome() {
  showScreen(currentChild.age_group === 'kids' ? 'screen-home-kids' : 'screen-home-teens');
}

/* ---------- Kids Check-in ---------- */
function startKidsCheckin() {
  showScreen('screen-checkin-kids');
  const container = document.getElementById('kids-checkin-questions');
  const answers = {};

  container.innerHTML = KIDS_QUESTIONS.map((q, qi) => `
    <div class="kids-question">
      <div class="kids-question-text">${q.text}</div>
      <div class="kids-choice-group">
        ${q.choices.map(c => `
          <button type="button" class="kids-choice-btn" data-q="${qi}" data-v="${c.value}">
            <span class="kids-choice-icon">${c.icon}</span>
            <span class="kids-choice-label">${c.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.kids-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qi = btn.dataset.q;
      container.querySelectorAll(`[data-q="${qi}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      answers[qi] = parseInt(btn.dataset.v);
      document.getElementById('btn-kids-checkin-submit').disabled = Object.keys(answers).length < KIDS_QUESTIONS.length;
    });
  });

  document.getElementById('btn-kids-checkin-submit').onclick = () => submitKidsCheckin(answers);
}

async function submitKidsCheckin(answers) {
  const btn = document.getElementById('btn-kids-checkin-submit');
  btn.disabled = true; btn.textContent = 'おくってるよ...';

  const scores = {};
  KIDS_QUESTIONS.forEach((q, i) => { scores[q.field] = answers[i]; });

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / KIDS_QUESTIONS.length;
  const readiness = Math.round(avg * 10) / 10;
  const signal = avg <= 1.3 ? 'red' : avg <= 2 ? 'yellow' : 'green';
  const today = new Date().toISOString().slice(0, 10);

  const row = {
    child_id: currentChild.id,
    org_code: orgCode,
    group_id: currentChild.group_id,
    age_group: 'kids',
    checkin_date: today,
    answers: scores,
    readiness_score: readiness,
    signal_level: signal,
    ...scores
  };

  const { error } = await sb.from('kid_daily_checkins').upsert(row, { onConflict: 'child_id,checkin_date' });
  if (error) { btn.disabled = false; btn.textContent = 'おくる！ ✨'; alert('エラーが発生しました'); return; }

  // Update streak
  await updateStreak(today);

  // Create risk signal if needed
  if (signal !== 'green') {
    await sb.from('kid_risk_signals').insert({
      child_id: currentChild.id, org_code: orgCode,
      source_type: 'daily_checkin', risk_level: signal,
      risk_categories: Object.entries(scores).filter(([, v]) => v <= 1).map(([k]) => k.replace('_score', '')),
      message_child: signal === 'red' ? 'ちょっとおやすみモードかも。むりしなくていいよ！' : 'まあまあだね。できることからやってみよう！',
      message_parent: signal === 'red' ? 'お子さまのコンディションが低めの日が続いています。ゆっくりお話しする時間を設けてみてください。' : 'お子さまのコンディションがやや低めです。様子を見守ってあげてください。'
    });
  }

  // Check badges
  const newBadges = await checkBadges();

  showDoneScreen(signal, newBadges);
}

/* ---------- Teens Check-in ---------- */
function startTeensCheckin() {
  showScreen('screen-checkin-teens');
  const container = document.getElementById('teens-checkin-questions');
  const answers = {};

  container.innerHTML = TEENS_QUESTIONS.map((q, qi) => `
    <div class="teens-question">
      <div class="teens-question-text">${q.text}</div>
      <div class="rating-group">
        ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rating-btn" data-q="${qi}" data-v="${v}">${v}</button>`).join('')}
      </div>
      <div class="rating-labels"><span>${q.low}</span><span>${q.high}</span></div>
    </div>
  `).join('');

  container.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qi = btn.dataset.q;
      container.querySelectorAll(`[data-q="${qi}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      answers[qi] = parseInt(btn.dataset.v);
      document.getElementById('btn-teens-checkin-submit').disabled = Object.keys(answers).length < TEENS_QUESTIONS.length;
    });
  });

  document.getElementById('btn-teens-checkin-submit').onclick = () => submitTeensCheckin(answers);
}

async function submitTeensCheckin(answers) {
  const btn = document.getElementById('btn-teens-checkin-submit');
  btn.disabled = true; btn.textContent = '送信中...';

  const scores = {};
  TEENS_QUESTIONS.forEach((q, i) => { scores[q.field] = answers[i]; });

  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / TEENS_QUESTIONS.length;
  const readiness = Math.round(avg * 10) / 10;
  const signal = avg <= 2 ? 'red' : avg <= 3 ? 'yellow' : 'green';
  const today = new Date().toISOString().slice(0, 10);

  const row = {
    child_id: currentChild.id,
    org_code: orgCode,
    group_id: currentChild.group_id,
    age_group: 'teens',
    checkin_date: today,
    answers: scores,
    readiness_score: readiness,
    signal_level: signal,
    ...scores
  };

  const { error } = await sb.from('kid_daily_checkins').upsert(row, { onConflict: 'child_id,checkin_date' });
  if (error) { btn.disabled = false; btn.textContent = '送信する'; alert('エラーが発生しました'); return; }

  await updateStreak(today);

  if (signal !== 'green') {
    await sb.from('kid_risk_signals').insert({
      child_id: currentChild.id, org_code: orgCode,
      source_type: 'daily_checkin', risk_level: signal,
      risk_categories: Object.entries(scores).filter(([, v]) => v <= 2).map(([k]) => k.replace('_score', '')),
      message_child: signal === 'red' ? 'ちょっと疲れてるかも。無理しないでね。' : '少し低めだけど大丈夫。できることからやってみよう。',
      message_parent: signal === 'red' ? 'お子さまのコンディションが低めの日が続いています。ゆっくりお話しする時間を設けてみてください。' : 'お子さまのコンディションがやや低めです。様子を見守ってあげてください。'
    });
  }

  const newBadges = await checkBadges();
  showDoneScreen(signal, newBadges);
}

/* ---------- Streak ---------- */
async function updateStreak(today) {
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  let newStreak = 1;
  if (currentChild.last_checkin === yStr) {
    newStreak = (currentChild.streak_count || 0) + 1;
  } else if (currentChild.last_checkin === today) {
    newStreak = currentChild.streak_count || 1;
  }

  await sb.from('children').update({ streak_count: newStreak, last_checkin: today }).eq('id', currentChild.id);
  currentChild.streak_count = newStreak;
  currentChild.last_checkin = today;
}

/* ---------- Badges ---------- */
async function checkBadges() {
  const newBadges = [];

  // Reload earned
  const { data: earned } = await sb.from('kid_child_badges').select('badge_id').eq('child_id', currentChild.id);
  const earnedIds = new Set((earned || []).map(e => e.badge_id));

  // Count checkins
  const { count: checkinCount } = await sb.from('kid_daily_checkins').select('id', { count: 'exact', head: true }).eq('child_id', currentChild.id);

  // Count drills
  const { count: drillCount } = await sb.from('kid_drill_completions').select('id', { count: 'exact', head: true }).eq('child_id', currentChild.id);

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    let earned = false;
    switch (badge.condition_type) {
      case 'streak':
        earned = currentChild.streak_count >= badge.condition_value;
        break;
      case 'checkin_count':
        earned = (checkinCount || 0) >= badge.condition_value;
        break;
      case 'drill_count':
        earned = (drillCount || 0) >= badge.condition_value;
        break;
      case 'first_action':
        earned = (drillCount || 0) >= 1;
        break;
    }

    if (earned) {
      await sb.from('kid_child_badges').insert({ child_id: currentChild.id, badge_id: badge.id });
      newBadges.push(badge);
      earnedIds.add(badge.id);
    }
  }

  earnedBadges = Array.from(earnedIds);
  return newBadges;
}

/* ---------- Done Screen ---------- */
function showDoneScreen(signal, newBadges) {
  showScreen('screen-done');

  const isKids = currentChild.age_group === 'kids';
  if (signal === 'green') {
    document.getElementById('done-icon').textContent = '🎉';
    document.getElementById('done-title').textContent = isKids ? 'すごい！げんきいっぱい！' : '好調！いい感じ！';
    document.getElementById('done-desc').textContent = isKids ? 'きょうもチェックインありがとう！' : 'チェックイン完了。今日も頑張ろう！';
  } else if (signal === 'yellow') {
    document.getElementById('done-icon').textContent = '👍';
    document.getElementById('done-title').textContent = isKids ? 'まあまあだね！' : 'まずまず！';
    document.getElementById('done-desc').textContent = isKids ? 'できることからやってみよう！' : '無理せず自分のペースでいこう。';
  } else {
    document.getElementById('done-icon').textContent = '🌙';
    document.getElementById('done-title').textContent = isKids ? 'おやすみモードだね' : 'おやすみモード';
    document.getElementById('done-desc').textContent = isKids ? 'むりしなくていいよ。ゆっくりしよう。' : '無理しないで。休むのも大事。';
  }

  // Show drill suggestion on done screen
  if (todayDrill) {
    document.getElementById('done-drill-area').innerHTML = `
      <div class="drill-card" style="cursor:pointer;" id="done-drill-card">
        <div class="drill-card-icon">${todayDrill.stamp_icon}</div>
        <div class="drill-card-title">${isKids ? 'きょうのあそび' : '今日のドリル'}：${todayDrill.title}</div>
        <div class="drill-card-meta">${todayDrill.duration_min}分</div>
      </div>`;
    document.getElementById('done-drill-card').addEventListener('click', () => showDrill(todayDrill));
  }

  // Show new badges
  if (newBadges.length > 0) {
    document.getElementById('done-badge-area').innerHTML = `
      <div class="card" style="text-align:center;background:var(--fun-yellow);">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">🏅 バッジゲット！</div>
        ${newBadges.map(b => `<div style="font-size:32px;">${b.icon}</div><div style="font-size:13px;font-weight:600;">${b.title}</div>`).join('')}
      </div>`;
  }
}

/* ---------- Drill Screen ---------- */
function showDrill(drill) {
  showScreen('screen-drill');
  document.getElementById('drill-title-text').textContent = currentChild.age_group === 'kids' ? 'きょうのあそび' : '今日のドリル';
  document.getElementById('drill-detail').innerHTML = `
    <div class="drill-card">
      <div class="drill-card-icon">${drill.stamp_icon}</div>
      <div class="drill-card-title">${drill.title}</div>
      <div class="drill-card-meta">${drill.duration_min}分 ・ ${categoryLabel(drill.category)} ・ ${drill.difficulty === 'easy' ? 'かんたん' : drill.difficulty === 'medium' ? 'ふつう' : 'むずかしい'}</div>
      <div class="drill-card-desc">${drill.description || ''}</div>
      ${drill.video_url ? `<a href="${drill.video_url}" target="_blank" class="drill-card-video">▶ 動画を見る</a>` : ''}
    </div>`;
}

async function completeDrill() {
  if (!todayDrill) return;
  const btn = document.getElementById('btn-drill-done');
  btn.disabled = true; btn.textContent = 'きろく中...';

  const today = new Date().toISOString().slice(0, 10);
  await sb.from('kid_drill_completions').insert({
    child_id: currentChild.id,
    drill_id: todayDrill.id,
    completed_date: today
  });

  const newBadges = await checkBadges();

  btn.textContent = 'スタンプゲット！ 🌟';
  if (newBadges.length > 0) {
    document.getElementById('drill-detail').innerHTML += `
      <div class="card" style="text-align:center;background:var(--fun-yellow);margin-top:16px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">🏅 バッジゲット！</div>
        ${newBadges.map(b => `<div style="font-size:32px;">${b.icon}</div><div style="font-size:13px;font-weight:600;">${b.title}</div>`).join('')}
      </div>`;
  }

  setTimeout(() => goHome(), 2000);
}

/* ---------- Badges Screen ---------- */
function showBadgesScreen() {
  showScreen('screen-badges');
  const container = document.getElementById('badge-collection');
  container.innerHTML = allBadges.map(b => {
    const earned = earnedBadges.includes(b.id);
    return `<div class="badge-item ${earned ? '' : 'badge-locked'}"><div class="badge-icon">${b.icon}</div><div class="badge-title">${b.title}</div></div>`;
  }).join('');
}

/* ---------- Settings ---------- */
function showSettings() {
  showScreen('screen-settings');
  document.getElementById('settings-profile').textContent = `${currentChild.display_name} ・ ${currentChild.age_group === 'kids' ? '小学生' : '中高生'} ・ 連続 ${currentChild.streak_count || 0} 日`;

  const toggle = document.getElementById('settings-share-parent');
  toggle.checked = currentChild.share_with_parent;
  toggle.onchange = async () => {
    await sb.from('children').update({ share_with_parent: toggle.checked }).eq('id', currentChild.id);
    currentChild.share_with_parent = toggle.checked;
  };
}

/* ---------- Helpers ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

function getActionSuggestion(checkin) {
  const weakest = [];
  if (checkin.sleep_score <= 2) weakest.push('low_sleep');
  if (checkin.mood_score <= 2) weakest.push('low_mood');
  if (checkin.motivation_score <= 2) weakest.push('low_motivation');
  if (checkin.fatigue_score && checkin.fatigue_score <= 2) weakest.push('high_fatigue');
  if (checkin.focus_score && checkin.focus_score <= 2) weakest.push('low_focus');

  if (weakest.length === 0) return null;
  const key = weakest[0];
  const suggestions = ACTION_SUGGESTIONS[key];
  if (!suggestions) return null;
  return suggestions[simpleHash(new Date().toISOString().slice(0, 10)) % suggestions.length];
}

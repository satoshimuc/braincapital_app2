/* ================================================
   脳の元気度チェック — Senior Brain Wellness
   Accessible self-check tool for 60+ seniors.
   Positive framing only. No medical diagnosis.
   ================================================ */
'use strict';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============ State ============ */
let currentUser = null;
let todayCheckin = null;
let allDrills = [];
let calendarMonth = new Date();

/* ============ 3-scale Questions (5) ============ */
const Q_3SCALE = [
  { key: 'sleep_quality', icon: '😴', text: 'きのうの夜、よく眠れましたか？',
    choices: [
      { value: 3, icon: '😊', label: 'よく眠れた' },
      { value: 2, icon: '😐', label: 'ふつう' },
      { value: 1, icon: '😟', label: 'あまり眠れなかった' }
    ]},
  { key: 'mood', icon: '😊', text: 'きょうの気分はどうですか？',
    choices: [
      { value: 3, icon: '😊', label: 'いい気分' },
      { value: 2, icon: '😐', label: 'ふつう' },
      { value: 1, icon: '😟', label: 'あまりよくない' }
    ]},
  { key: 'went_outside', icon: '🚶', text: 'きのう、外に出ましたか？\n散歩や買い物など',
    choices: [
      { value: 3, icon: '🚶', label: '出た' },
      { value: 2, icon: '🏠', label: '少しだけ' },
      { value: 1, icon: '🛋️', label: '出なかった' }
    ]},
  { key: 'social_interaction', icon: '👥', text: 'きのう、誰かと話しましたか？',
    choices: [
      { value: 3, icon: '👥', label: 'たくさん話した' },
      { value: 2, icon: '💬', label: '少し話した' },
      { value: 1, icon: '🤫', label: 'ほとんど話さなかった' }
    ]},
  { key: 'forgetfulness', icon: '🧠', text: '最近、もの忘れが気になりますか？',
    choices: [
      { value: 3, icon: '😊', label: '気にならない' },
      { value: 2, icon: '🤔', label: '少し気になる' },
      { value: 1, icon: '😟', label: '気になる' }
    ]}
];

/* ============ 5-scale Questions (7) ============ */
const Q_5SCALE = [
  { key: 'sleep_quality', icon: '😴', text: 'きのうの夜、よく眠れましたか？', low: 'ぜんぜん眠れなかった', high: 'ぐっすり眠れた' },
  { key: 'mood', icon: '😊', text: 'きょうの気分はどうですか？', low: 'とてもよくない', high: 'とてもいい' },
  { key: 'went_outside', icon: '🚶', text: 'きのう、外に出ましたか？', low: 'まったく出なかった', high: 'たくさん出た' },
  { key: 'social_interaction', icon: '👥', text: 'きのう、誰かと話しましたか？', low: 'まったく話さなかった', high: 'たくさん話した' },
  { key: 'forgetfulness', icon: '🧠', text: '最近、もの忘れが気になりますか？', low: 'とても気になる', high: 'まったく気にならない' },
  { key: 'body_condition', icon: '💪', text: 'からだの調子はどうですか？\n（痛み、だるさなど）', low: 'とてもつらい', high: 'とても元気' },
  { key: 'activity_motivation', icon: '✨', text: 'きょう、何かやりたいことはありますか？', low: '何もしたくない', high: 'やりたいことがたくさん' }
];

/* ============ Init ============ */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const token = localStorage.getItem('senior_token');
  if (token) {
    const { data } = await sb.from('senior_users').select('*').eq('user_token', token).eq('is_active', true).maybeSingle();
    if (data) { currentUser = data; applyFontSize(data.font_size); await showApp(); return; }
  }
  bindRegistration();
}

/* ============ Font Size ============ */
function applyFontSize(size) {
  document.body.classList.remove('font-xlarge', 'font-xxlarge');
  if (size === 'xlarge') document.body.classList.add('font-xlarge');
  else if (size === 'xxlarge') document.body.classList.add('font-xxlarge');
}

/* ============ Registration ============ */
function bindRegistration() {
  // Mode select
  bindRadioGroup('reg-mode');
  bindRadioGroup('reg-fontsize');

  // Preview font size
  document.getElementById('reg-fontsize').querySelectorAll('.answer-3-btn').forEach(btn => {
    btn.addEventListener('click', () => applyFontSize(btn.dataset.v));
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const errEl = document.getElementById('reg-error');
    if (!name) { errEl.textContent = 'お名前を入力してください'; errEl.style.display = 'block'; return; }

    const mode = getRadioValue('reg-mode') || '3scale';
    const fontSize = getRadioValue('reg-fontsize') || 'large';

    const token = generateToken();
    const row = { user_token: token, display_name: name, answer_mode: mode, font_size: fontSize };

    const { data, error } = await sb.from('senior_users').insert(row).select().single();
    if (error) { errEl.textContent = 'エラーが発生しました。もう一度お試しください。'; errEl.style.display = 'block'; return; }

    localStorage.setItem('senior_token', token);
    currentUser = data;
    applyFontSize(fontSize);
    await showApp();
  });
}

/* ============ Show App ============ */
async function showApp() {
  document.getElementById('topbar').style.display = '';
  document.getElementById('nav-tabs').style.display = '';

  const today = todayStr();
  const [cRes, dRes] = await Promise.all([
    sb.from('senior_daily_checkins').select('*').eq('senior_id', currentUser.id).eq('checkin_date', today).maybeSingle(),
    sb.from('senior_drill_menus').select('*').eq('is_active', true).order('sort_order')
  ]);

  todayCheckin = cRes.data;
  allDrills = dRes.data || [];

  bindNavigation();
  showTab('home');
}

/* ============ Navigation ============ */
function bindNavigation() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });
  document.getElementById('btn-nav-settings').addEventListener('click', () => { renderSettings(); showScreen('screen-settings'); });
  document.getElementById('btn-settings-back').addEventListener('click', () => showTab('home'));
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-delete-account').addEventListener('click', deleteAccount);
  document.getElementById('btn-assessment-start').addEventListener('click', () => showTab('assessment'));
  document.getElementById('btn-braintype-start').addEventListener('click', () => showTab('braintype'));
  document.getElementById('btn-drill-back').addEventListener('click', () => showTab('drill'));
}

function showTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const activeTab = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  switch (tab) {
    case 'home': renderHome(); break;
    case 'checkin': renderCheckin(); break;
    case 'drill': renderDrillList(); break;
    case 'calendar': renderCalendar(); break;
    case 'assessment': renderAssessment(); break;
    case 'braintype': renderBrainType(); break;
  }
}

/* ============ HOME ============ */
async function renderHome() {
  showScreen('screen-home');

  // Wellness score
  if (todayCheckin) {
    const score = parseFloat(todayCheckin.brain_wellness_score);
    document.getElementById('home-score').textContent = score.toFixed(1);
    document.getElementById('home-face').textContent = score >= 4 ? '😊' : score >= 2.5 ? '😐' : '😟';
    document.getElementById('home-message').textContent = getWellnessMessage(score);
    document.getElementById('home-wellness-hero').style.borderColor = score >= 4 ? 'var(--green)' : score >= 2.5 ? 'var(--yellow)' : 'var(--red)';
  } else {
    document.getElementById('home-score').textContent = '—';
    document.getElementById('home-face').textContent = '🧠';
    document.getElementById('home-message').textContent = 'チェックインをすると元気度がわかります';
  }

  // Streak
  const { data: recentCheckins } = await sb.from('senior_daily_checkins').select('checkin_date')
    .eq('senior_id', currentUser.id).order('checkin_date', { ascending: false }).limit(60);
  const streak = calcStreak(recentCheckins || []);
  if (streak > 0) {
    document.getElementById('home-streak-banner').style.display = '';
    document.getElementById('home-streak').textContent = streak;
    document.getElementById('home-streak-text').textContent = streak >= 7
      ? '日つづけています。すばらしいですね！'
      : '日つづけています';
  } else {
    document.getElementById('home-streak-banner').style.display = 'none';
  }

  // Checkin CTA
  const ctaEl = document.getElementById('home-checkin-cta');
  if (todayCheckin) {
    ctaEl.innerHTML = '<div class="card" style="text-align:center;background:var(--bg-success);border-color:var(--green);"><div style="font-size:36px;">✅</div><div style="font-size:var(--fs-base);font-weight:700;color:var(--green);margin-top:4px;">きょうのチェックインは完了です</div></div>';
  } else {
    ctaEl.innerHTML = '<button type="button" class="btn-primary" style="margin-bottom:16px;font-size:var(--fs-h3);padding:20px;" onclick="showTab(\'checkin\')">きょうのチェックインをする</button>';
  }

  // Today's drill
  renderHomeDrill();

  // Mini calendar
  renderMiniCalendar();
}

function getWellnessMessage(score) {
  if (score >= 4.5) return 'とても元気です！すばらしい！';
  if (score >= 3.5) return '元気ですね。このまま続けましょう。';
  if (score >= 2.5) return 'まずまずですね。';
  if (score >= 1.5) return '少しお疲れのようです。ゆっくり過ごしましょう。';
  return 'お疲れのようです。無理せず、ゆっくり休んでください。';
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

function renderHomeDrill() {
  const container = document.getElementById('home-drill');
  if (!allDrills.length) { container.innerHTML = '<div class="loading">ドリルがありません</div>'; return; }

  const drill = recommendDrill();
  container.innerHTML = `
    <div class="drill-card" onclick="showDrillDetail('${drill.id}')">
      <div class="drill-card-icon">${drill.icon}</div>
      <div class="drill-card-title">${drill.title}</div>
      <div class="drill-card-meta">${drill.duration_min}分 ・ ${difficultyLabel(drill.difficulty)}</div>
      <div class="drill-card-desc">${drill.description || ''}</div>
    </div>`;
}

async function renderMiniCalendar() {
  const container = document.getElementById('home-calendar');
  const now = new Date();
  const stamps = await loadStamps(now.getFullYear(), now.getMonth());
  container.innerHTML = buildCalendarHTML(now.getFullYear(), now.getMonth(), stamps);
}

/* ============ CHECK-IN ============ */
function renderCheckin() {
  showScreen('screen-checkin');
  const container = document.getElementById('checkin-questions');
  const doneEl = document.getElementById('checkin-done');
  const submitBtn = document.getElementById('btn-checkin-submit');

  if (todayCheckin) {
    container.style.display = 'none';
    submitBtn.style.display = 'none';
    doneEl.style.display = '';
    document.getElementById('checkin-done-msg').textContent =
      `脳の元気度: ${parseFloat(todayCheckin.brain_wellness_score).toFixed(1)}\nまたあした会いましょう！`;
    return;
  }

  container.style.display = '';
  submitBtn.style.display = '';
  doneEl.style.display = 'none';

  const is3 = currentUser.answer_mode === '3scale';
  const questions = is3 ? Q_3SCALE : Q_5SCALE;
  const answers = {};

  container.innerHTML = questions.map((q, i) => render3or5Question(q, i, is3)).join('');
  bind3or5Handlers(container, questions, answers, is3);

  submitBtn.onclick = () => submitCheckin(answers, is3);

  // Voice input
  voiceMode = false;
  const toggleBtn = document.getElementById('btn-voice-toggle');
  toggleBtn.classList.remove('active');
  document.getElementById('voice-toggle-label').textContent = '音声';
  document.getElementById('voice-mode-ui').style.display = 'none';
  maybeInitVoice();
}

function render3or5Question(q, idx, is3) {
  let html = `<div class="checkin-question">
    <div class="checkin-question-text"><span class="checkin-question-icon">${q.icon}</span>${q.text.replace(/\n/g, '<br>')}</div>`;

  if (is3) {
    html += `<div class="answer-3scale" data-key="${q.key}">
      ${q.choices.map(c => `
        <button type="button" class="answer-3-btn" data-v="${c.value}" aria-label="${c.label}">
          <span class="answer-icon">${c.icon}</span>
          ${c.label}
        </button>
      `).join('')}
    </div>`;
  } else {
    html += `<div class="rating-group" data-key="${q.key}">
      ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rating-btn" data-v="${v}" aria-label="${v}">${v}</button>`).join('')}
    </div>
    <div class="rating-labels"><span>${q.low}</span><span>${q.high}</span></div>`;
  }

  html += '</div>';
  return html;
}

function bind3or5Handlers(container, questions, answers, is3) {
  if (is3) {
    container.querySelectorAll('.answer-3scale').forEach(group => {
      group.querySelectorAll('.answer-3-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.answer-3-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[group.dataset.key] = parseInt(btn.dataset.v);
          checkSubmitReady(answers, questions.length);
        });
      });
    });
  } else {
    container.querySelectorAll('.rating-group').forEach(group => {
      group.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[group.dataset.key] = parseInt(btn.dataset.v);
          checkSubmitReady(answers, questions.length);
        });
      });
    });
  }
}

function checkSubmitReady(answers, total) {
  document.getElementById('btn-checkin-submit').disabled = Object.keys(answers).length < total;
}

/* ============ VOICE INPUT MODE ============ */
let voiceMode = false;
let voiceRecognition = null;
let voiceQuestionIndex = 0;
let voiceAnswers = {};
let voiceQuestions = [];
let voiceIs3 = true;

function initVoiceToggle() {
  const toggleBtn = document.getElementById('btn-voice-toggle');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    toggleBtn.style.display = 'none';
    return;
  }

  toggleBtn.addEventListener('click', () => {
    voiceMode = !voiceMode;
    toggleBtn.classList.toggle('active', voiceMode);
    document.getElementById('voice-toggle-label').textContent = voiceMode ? '音声ON' : '音声';

    if (voiceMode) {
      startVoiceCheckin();
    } else {
      stopVoiceMode();
    }
  });
}

function startVoiceCheckin() {
  voiceIs3 = currentUser.answer_mode === '3scale';
  voiceQuestions = voiceIs3 ? Q_3SCALE : Q_5SCALE;
  voiceAnswers = {};
  voiceQuestionIndex = 0;

  document.getElementById('checkin-questions').style.display = 'none';
  document.getElementById('btn-checkin-submit').style.display = 'none';
  document.getElementById('voice-mode-ui').style.display = '';
  document.getElementById('checkin-subtitle').textContent = '声で答えてください。マイクボタンをタップして話しましょう。';

  document.getElementById('btn-voice-mic').addEventListener('click', startListening);
  document.getElementById('btn-voice-skip').addEventListener('click', voiceSkipQuestion);

  showVoiceQuestion();
}

function stopVoiceMode() {
  if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} voiceRecognition = null; }
  document.getElementById('voice-mode-ui').style.display = 'none';
  document.getElementById('checkin-questions').style.display = '';
  document.getElementById('btn-checkin-submit').style.display = '';
  document.getElementById('checkin-subtitle').textContent = 'かんたんな質問に答えてください。';
}

function showVoiceQuestion() {
  if (voiceQuestionIndex >= voiceQuestions.length) {
    voiceComplete();
    return;
  }

  const q = voiceQuestions[voiceQuestionIndex];
  document.getElementById('voice-q-icon').textContent = q.icon;
  document.getElementById('voice-q-text').textContent = q.text.replace(/\n/g, ' ');
  document.getElementById('voice-progress').textContent =
    `${voiceQuestionIndex + 1} / ${voiceQuestions.length}`;

  const micBtn = document.getElementById('btn-voice-mic');
  micBtn.classList.remove('listening');
  document.getElementById('voice-mic-icon').textContent = '🎤';
  document.getElementById('voice-mic-label').textContent = 'タップして話す';
  document.getElementById('voice-transcript').style.display = 'none';
  document.getElementById('voice-status').textContent = '';

  // Show choices as reference
  const choicesEl = document.getElementById('voice-choices');
  if (voiceIs3 && q.choices) {
    choicesEl.innerHTML = q.choices.map(c =>
      `<button type="button" class="voice-choice-btn" data-v="${c.value}" onclick="voiceSelectManual(${c.value})">${c.icon} ${c.label}</button>`
    ).join('');
  } else {
    choicesEl.innerHTML = [1, 2, 3, 4, 5].map(v =>
      `<button type="button" class="voice-choice-btn" data-v="${v}" onclick="voiceSelectManual(${v})">${v}</button>`
    ).join('');
  }
}

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  if (voiceRecognition) { try { voiceRecognition.abort(); } catch (e) {} }

  voiceRecognition = new SpeechRecognition();
  voiceRecognition.lang = 'ja-JP';
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = true;
  voiceRecognition.maxAlternatives = 3;

  const micBtn = document.getElementById('btn-voice-mic');
  micBtn.classList.add('listening');
  document.getElementById('voice-mic-icon').textContent = '🔴';
  document.getElementById('voice-mic-label').textContent = '聞いています...';
  document.getElementById('voice-status').textContent = '話してください';
  document.getElementById('voice-transcript').style.display = '';
  document.getElementById('voice-transcript').textContent = '...';

  voiceRecognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript = event.results[i][0].transcript;
    }
    document.getElementById('voice-transcript').textContent = transcript;

    if (event.results[event.resultIndex].isFinal) {
      processVoiceAnswer(transcript);
    }
  };

  voiceRecognition.onerror = (event) => {
    micBtn.classList.remove('listening');
    document.getElementById('voice-mic-icon').textContent = '🎤';
    document.getElementById('voice-mic-label').textContent = 'もう一度タップ';

    if (event.error === 'no-speech') {
      document.getElementById('voice-status').textContent = '声が聞こえませんでした。もう一度お試しください。';
    } else if (event.error === 'not-allowed') {
      document.getElementById('voice-status').textContent = 'マイクの使用が許可されていません。設定を確認してください。';
    } else {
      document.getElementById('voice-status').textContent = 'うまく聞き取れませんでした。もう一度お試しください。';
    }
  };

  voiceRecognition.onend = () => {
    micBtn.classList.remove('listening');
    document.getElementById('voice-mic-icon').textContent = '🎤';
    document.getElementById('voice-mic-label').textContent = 'タップして話す';
  };

  voiceRecognition.start();
}

function processVoiceAnswer(transcript) {
  const text = transcript.trim().toLowerCase();
  const q = voiceQuestions[voiceQuestionIndex];
  let matchedValue = null;

  if (voiceIs3 && q.choices) {
    // 3-scale matching
    matchedValue = match3ScaleVoice(text, q);
  } else {
    // 5-scale matching
    matchedValue = match5ScaleVoice(text);
  }

  if (matchedValue !== null) {
    voiceAnswers[q.key] = matchedValue;

    // Highlight matched choice
    document.querySelectorAll('.voice-choice-btn').forEach(btn => {
      btn.classList.toggle('matched', parseInt(btn.dataset.v) === matchedValue);
    });

    document.getElementById('voice-status').textContent = '✅ 記録しました';

    // Auto-advance after 1 second
    setTimeout(() => {
      voiceQuestionIndex++;
      showVoiceQuestion();
    }, 1000);
  } else {
    document.getElementById('voice-status').textContent =
      'うまく聞き取れませんでした。もう一度話すか、ボタンをタップしてください。';
  }
}

function match3ScaleVoice(text, q) {
  // Generic positive/neutral/negative patterns
  const positiveWords = ['よい', 'いい', 'よく', '良い', '良く', 'すごく', 'たくさん', 'はい', 'うん',
    'いい気分', 'よく眠れ', 'ぐっすり', '気にならない', '出た', '出ました', '話した', '話しました',
    '元気', 'ばっちり', '最高', 'よかった', '大丈夫'];
  const neutralWords = ['ふつう', '普通', 'まあまあ', 'そこそこ', '少し', 'すこし', 'ちょっと',
    '少しだけ', 'まぁまぁ'];
  const negativeWords = ['悪い', 'わるい', 'よくない', '良くない', 'だめ', 'ダメ', 'いいえ',
    '眠れなかった', '出なかった', '出ない', '話さなかった', '話さない', '気になる',
    'ぜんぜん', '全然', 'ほとんど', '無い', 'ない'];

  // Check specific choice labels first
  for (const choice of q.choices) {
    if (text.includes(choice.label) || text.includes(choice.label.replace(/\s/g, ''))) {
      return choice.value;
    }
  }

  // Then check generic patterns
  for (const w of negativeWords) { if (text.includes(w)) return 1; }
  for (const w of neutralWords) { if (text.includes(w)) return 2; }
  for (const w of positiveWords) { if (text.includes(w)) return 3; }

  // Number detection
  if (text.includes('1') || text.includes('いち') || text.includes('一')) return 1;
  if (text.includes('2') || text.includes('に') || text.includes('二')) return 2;
  if (text.includes('3') || text.includes('さん') || text.includes('三')) return 3;

  return null;
}

function match5ScaleVoice(text) {
  // Direct number mapping
  const numMap = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    'いち': 1, 'に': 2, 'さん': 3, 'し': 4, 'よん': 4, 'ご': 5,
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5 };

  for (const [word, val] of Object.entries(numMap)) {
    if (text === word || text.includes(word)) return val;
  }

  // Sentiment-based
  if (text.includes('最悪') || text.includes('ぜんぜん') || text.includes('全然')) return 1;
  if (text.includes('あまり') || text.includes('よくない') || text.includes('悪い')) return 2;
  if (text.includes('ふつう') || text.includes('普通') || text.includes('まあまあ')) return 3;
  if (text.includes('よい') || text.includes('いい') || text.includes('良い')) return 4;
  if (text.includes('最高') || text.includes('とても') || text.includes('すごく') || text.includes('ばっちり')) return 5;

  return null;
}

window.voiceSelectManual = function(value) {
  const q = voiceQuestions[voiceQuestionIndex];
  voiceAnswers[q.key] = value;

  document.querySelectorAll('.voice-choice-btn').forEach(btn => {
    btn.classList.toggle('matched', parseInt(btn.dataset.v) === value);
  });
  document.getElementById('voice-status').textContent = '✅ 記録しました';

  setTimeout(() => {
    voiceQuestionIndex++;
    showVoiceQuestion();
  }, 800);
};

function voiceSkipQuestion() {
  voiceQuestionIndex++;
  showVoiceQuestion();
}

function voiceComplete() {
  // Fill any skipped answers with middle value
  voiceQuestions.forEach(q => {
    if (voiceAnswers[q.key] == null) {
      voiceAnswers[q.key] = voiceIs3 ? 2 : 3;
    }
  });

  // Submit
  document.getElementById('voice-mode-ui').style.display = 'none';
  submitCheckin(voiceAnswers, voiceIs3);
}

// Initialize voice toggle when checkin screen renders (called from renderCheckin)
function maybeInitVoice() {
  if (!document.getElementById('btn-voice-toggle')._voiceBound) {
    initVoiceToggle();
    document.getElementById('btn-voice-toggle')._voiceBound = true;
  }
}

async function submitCheckin(answers, is3) {
  const btn = document.getElementById('btn-checkin-submit');
  btn.disabled = true; btn.textContent = 'おくっています...';

  // Calc wellness score
  const vals = Object.values(answers);
  let score;
  if (is3) {
    // 3-scale: 1-3 → normalize to 1-5 scale
    const avg3 = vals.reduce((a, b) => a + b, 0) / vals.length;
    score = (avg3 - 1) * 2 + 1; // 1→1, 2→3, 3→5
  } else {
    score = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  score = Math.round(score * 10) / 10;

  const signal = score <= 2 ? 'red' : score <= 3 ? 'yellow' : 'green';

  const row = {
    senior_id: currentUser.id,
    checkin_date: todayStr(),
    answer_mode: is3 ? '3scale' : '5scale',
    sleep_quality: answers.sleep_quality,
    mood: answers.mood,
    went_outside: answers.went_outside,
    social_interaction: answers.social_interaction,
    forgetfulness: answers.forgetfulness,
    body_condition: answers.body_condition || null,
    activity_motivation: answers.activity_motivation || null,
    brain_wellness_score: score,
    signal_level: signal
  };

  const { data, error } = await sb.from('senior_daily_checkins').upsert(row, { onConflict: 'senior_id,checkin_date' }).select().single();
  if (error) { btn.disabled = false; btn.textContent = 'おくる'; alert('エラーが発生しました。もう一度お試しください。'); return; }

  todayCheckin = data;

  // Add calendar stamp
  await sb.from('senior_calendar_stamps').upsert({
    senior_id: currentUser.id, stamp_date: todayStr(), stamp_type: 'checkin'
  }, { onConflict: 'senior_id,stamp_date,stamp_type' });

  // Check risk signals
  await checkRiskSignals();

  renderCheckin();
}

/* ============ DRILLS ============ */
function renderDrillList() {
  showScreen('screen-drill');
  const container = document.getElementById('drill-list');

  if (!allDrills.length) { container.innerHTML = '<div class="loading">ドリルがありません</div>'; return; }

  container.innerHTML = allDrills.map(d => `
    <div class="drill-card" onclick="showDrillDetail('${d.id}')">
      <div class="drill-card-icon">${d.icon}</div>
      <div class="drill-card-title">${d.title}</div>
      <div class="drill-card-meta">${d.duration_min}分 ・ ${difficultyLabel(d.difficulty)}${d.pair_mode ? ' ・ ペアOK' : ''}</div>
      <div class="drill-card-desc">${d.description || ''}</div>
    </div>
  `).join('');
}

window.showDrillDetail = function(drillId) {
  showScreen('screen-drill-detail');
  const drill = allDrills.find(d => d.id === drillId);
  if (!drill) return;

  const container = document.getElementById('drill-detail-content');
  container.innerHTML = `
    <div style="text-align:center;margin:16px 0;">
      <div style="font-size:64px;">${drill.icon}</div>
      <h3 style="font-size:var(--fs-h2);font-weight:700;margin-top:8px;">${drill.title}</h3>
      <p style="font-size:var(--fs-label);color:var(--text-hint);margin-top:4px;">${drill.duration_min}分 ・ ${difficultyLabel(drill.difficulty)}</p>
    </div>
    <p style="font-size:var(--fs-base);color:var(--text-sub);margin-bottom:16px;line-height:1.8;">${drill.description || ''}</p>
    <div class="section-header">やりかた</div>
    <div class="drill-instructions">${drill.instructions || 'やってみましょう！'}</div>
    <button type="button" class="btn-primary" style="margin-top:24px;font-size:var(--fs-h3);padding:20px;" onclick="completeDrill('${drill.id}')">やりました！</button>
    <div id="drill-complete-msg" style="display:none;margin-top:16px;"></div>
  `;
};

window.completeDrill = async function(drillId) {
  const { error } = await sb.from('senior_drill_completions').insert({
    senior_id: currentUser.id,
    drill_id: drillId,
    completed_date: todayStr()
  });

  await sb.from('senior_calendar_stamps').upsert({
    senior_id: currentUser.id, stamp_date: todayStr(), stamp_type: 'drill'
  }, { onConflict: 'senior_id,stamp_date,stamp_type' });

  const msgEl = document.getElementById('drill-complete-msg');
  if (error) {
    msgEl.innerHTML = '<div class="card" style="background:var(--bg-danger);text-align:center;padding:16px;font-size:var(--fs-base);">記録に失敗しました</div>';
  } else {
    msgEl.innerHTML = '<div class="done-state"><div class="done-icon">🌟</div><div class="done-title">よくできました！</div><div class="done-sub">またあした、ちがうドリルに挑戦しましょう。</div></div>';
  }
  msgEl.style.display = '';
};

function recommendDrill() {
  if (!allDrills.length) return null;

  let scored = allDrills.map(d => {
    let score = 0;
    if (todayCheckin) {
      if (todayCheckin.social_interaction <= 1 && d.target_conditions && d.target_conditions.includes('low_social')) score += 5;
      if (todayCheckin.mood <= 1 && d.target_conditions && d.target_conditions.includes('low_mood')) score += 5;
      if (todayCheckin.activity_motivation <= 1 && d.difficulty === 'easy') score += 3;
      if (todayCheckin.forgetfulness <= 1 && d.target_conditions && d.target_conditions.includes('forgetful')) score += 4;
      if (todayCheckin.brain_wellness_score >= 4 && d.difficulty === 'challenge') score += 3;
    }
    score += simpleHash(todayStr() + d.id) % 3;
    return { ...d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/* ============ CALENDAR ============ */
async function renderCalendar() {
  showScreen('screen-calendar');

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  document.getElementById('calendar-month-label').textContent = `${year}年${month + 1}月`;

  document.getElementById('btn-cal-prev').onclick = () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  };
  document.getElementById('btn-cal-next').onclick = () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  };

  const stamps = await loadStamps(year, month);
  document.getElementById('full-calendar').innerHTML = buildCalendarHTML(year, month, stamps);

  // Streak
  const { data: recentCheckins } = await sb.from('senior_daily_checkins').select('checkin_date')
    .eq('senior_id', currentUser.id).order('checkin_date', { ascending: false }).limit(60);
  document.getElementById('cal-streak').textContent = calcStreak(recentCheckins || []);
}

async function loadStamps(year, month) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0);
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const { data } = await sb.from('senior_calendar_stamps').select('stamp_date, stamp_type')
    .eq('senior_id', currentUser.id)
    .gte('stamp_date', startDate)
    .lte('stamp_date', endStr);

  const map = {};
  (data || []).forEach(s => {
    if (!map[s.stamp_date]) map[s.stamp_date] = [];
    map[s.stamp_date].push(s.stamp_type);
  });
  return map;
}

function buildCalendarHTML(year, month, stamps) {
  const today = todayStr();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  let html = '<div class="calendar-grid">';
  html += weekdays.map(w => `<div class="calendar-header">${w}</div>`).join('');

  // Empty cells
  for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === today;
    const dayStamps = stamps[dateStr] || [];
    const hasCheckin = dayStamps.includes('checkin');
    const hasDrill = dayStamps.includes('drill');

    let cls = 'calendar-day';
    if (isToday) cls += ' today';
    if (hasCheckin || hasDrill) cls += ' stamped';

    let stampIcon = '';
    if (hasCheckin && hasDrill) stampIcon = '<span class="stamp">🌟</span>';
    else if (hasCheckin) stampIcon = '<span class="stamp">✅</span>';
    else if (hasDrill) stampIcon = '<span class="stamp">💪</span>';

    html += `<div class="${cls}"><span>${d}</span>${stampIcon}</div>`;
  }

  html += '</div>';
  return html;
}

/* ============ MONTHLY ASSESSMENT ============ */
function renderAssessment() {
  showScreen('screen-assessment');
  // Simplified: show message about monthly assessment
  const container = document.getElementById('assessment-questions');
  const is3 = currentUser.answer_mode === '3scale';

  const assessmentQ = [
    { key: 'sleep_nutrition', icon: '🍽️', text: 'バランスのよい食事はとれていますか？' },
    { key: 'exercise', icon: '🏃', text: '運動やからだを動かす習慣はありますか？' },
    { key: 'health_mgmt', icon: '💊', text: 'お薬の管理やからだのケアはできていますか？' },
    { key: 'curiosity', icon: '🔍', text: '新しいことに興味はありますか？' },
    { key: 'communication', icon: '💬', text: '家族や友人と会話を楽しめていますか？' },
    { key: 'planning', icon: '📋', text: '買い物の計画やだんどりはできていますか？' },
    { key: 'hobby', icon: '🎨', text: '趣味を楽しめていますか？' },
    { key: 'social_participation', icon: '🏘️', text: '地域の活動やイベントに参加していますか？' },
    { key: 'community', icon: '🤝', text: '近所の方や友人と交流がありますか？' },
    { key: 'role_sense', icon: '👤', text: '誰かの役に立っていると感じますか？' }
  ];

  const answers = {};

  if (is3) {
    container.innerHTML = assessmentQ.map(q => `
      <div class="checkin-question">
        <div class="checkin-question-text"><span class="checkin-question-icon">${q.icon}</span>${q.text}</div>
        <div class="answer-3scale" data-key="${q.key}">
          <button type="button" class="answer-3-btn" data-v="3" aria-label="はい"><span class="answer-icon">😊</span>はい</button>
          <button type="button" class="answer-3-btn" data-v="2" aria-label="ふつう"><span class="answer-icon">😐</span>ふつう</button>
          <button type="button" class="answer-3-btn" data-v="1" aria-label="いいえ"><span class="answer-icon">😟</span>いいえ</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.answer-3scale').forEach(group => {
      group.querySelectorAll('.answer-3-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.answer-3-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[group.dataset.key] = parseInt(btn.dataset.v);
          document.getElementById('btn-assessment-submit').disabled = Object.keys(answers).length < assessmentQ.length;
        });
      });
    });
  } else {
    container.innerHTML = assessmentQ.map(q => `
      <div class="checkin-question">
        <div class="checkin-question-text"><span class="checkin-question-icon">${q.icon}</span>${q.text}</div>
        <div class="rating-group" data-key="${q.key}">
          ${[1, 2, 3, 4, 5].map(v => `<button type="button" class="rating-btn" data-v="${v}">${v}</button>`).join('')}
        </div>
        <div class="rating-labels"><span>まったくない</span><span>とてもある</span></div>
      </div>
    `).join('');

    container.querySelectorAll('.rating-group').forEach(group => {
      group.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          answers[group.dataset.key] = parseInt(btn.dataset.v);
          document.getElementById('btn-assessment-submit').disabled = Object.keys(answers).length < assessmentQ.length;
        });
      });
    });
  }

  document.getElementById('btn-assessment-submit').onclick = () => submitAssessment(answers, is3);
}

async function submitAssessment(answers, is3) {
  const btn = document.getElementById('btn-assessment-submit');
  btn.disabled = true; btn.textContent = 'おくっています...';

  // Normalize 3-scale to 5-scale for storage
  const norm = (v) => is3 ? ((v - 1) * 2 + 1) : v;

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const row = {
    senior_id: currentUser.id,
    assessment_month: month,
    answer_mode: is3 ? '3scale' : '5scale',
    sleep_nutrition_score: norm(answers.sleep_nutrition),
    exercise_score: norm(answers.exercise),
    health_management_score: norm(answers.health_mgmt),
    curiosity_score: norm(answers.curiosity),
    communication_score: norm(answers.communication),
    planning_score: norm(answers.planning),
    hobby_engagement_score: norm(answers.hobby),
    social_participation_score: norm(answers.social_participation),
    community_score: norm(answers.community),
    role_sense_score: norm(answers.role_sense),
    overall_score: Object.values(answers).reduce((a, b) => a + norm(b), 0) / Object.keys(answers).length,
    responses: answers
  };

  const { error } = await sb.from('senior_monthly_assessments').upsert(row, { onConflict: 'senior_id,assessment_month' });

  await sb.from('senior_calendar_stamps').upsert({
    senior_id: currentUser.id, stamp_date: todayStr(), stamp_type: 'assessment'
  }, { onConflict: 'senior_id,stamp_date,stamp_type' });

  if (error) { btn.disabled = false; btn.textContent = 'おくる'; alert('エラーが発生しました'); return; }

  document.getElementById('assessment-questions').style.display = 'none';
  btn.style.display = 'none';
  document.getElementById('assessment-done').style.display = '';
  document.getElementById('assessment-done-msg').textContent = 'ありがとうございます。来月もよろしくお願いします。';
}

/* ============ BRAIN TYPE ============ */
async function renderBrainType() {
  showScreen('screen-braintype');
  const container = document.getElementById('braintype-content');

  const { data } = await sb.from('senior_brain_types').select('*').eq('senior_id', currentUser.id).maybeSingle();

  if (data) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:32px;">
        <div style="font-size:56px;">🧠</div>
        <div style="font-size:var(--fs-h2);font-weight:800;color:var(--primary);margin-top:8px;">${data.type_name_jp}</div>
        <div style="font-size:var(--fs-base);color:var(--text-sub);margin-top:12px;line-height:1.8;text-align:left;">${data.type_description || ''}</div>
      </div>
      <div class="section-header">あなたの脳の特徴</div>
      <div class="score-row">
        <span class="score-label">じっくり型</span>
        <div class="score-bar-bg"><div class="score-bar green" style="width:${data.axis_sn * 20}%"></div></div>
        <span class="score-value">${data.axis_sn}</span>
      </div>
      <div class="score-row">
        <span class="score-label">分析型</span>
        <div class="score-bar-bg"><div class="score-bar green" style="width:${data.axis_ah * 20}%"></div></div>
        <span class="score-value">${data.axis_ah}</span>
      </div>
      <div class="score-row">
        <span class="score-label">論理型</span>
        <div class="score-bar-bg"><div class="score-bar green" style="width:${data.axis_le * 20}%"></div></div>
        <span class="score-value">${data.axis_le}</span>
      </div>
      <div class="score-row">
        <span class="score-label">計画型</span>
        <div class="score-bar-bg"><div class="score-bar green" style="width:${data.axis_pf * 20}%"></div></div>
        <span class="score-value">${data.axis_pf}</span>
      </div>`;
  } else {
    container.innerHTML = '<div class="loading">脳タイプ診断はまだ受けていません。<br>設定から受けることができます。</div>';
  }
}

/* ============ RISK SIGNALS ============ */
async function checkRiskSignals() {
  const signals = [];
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStr = weekAgo.toISOString().slice(0, 10);

  const { data: weekCheckins } = await sb.from('senior_daily_checkins').select('*')
    .eq('senior_id', currentUser.id).gte('checkin_date', weekStr).order('checkin_date');

  if (!weekCheckins || weekCheckins.length < 3) return;

  // 1. Social isolation: outside=1 AND social=1 for 5+ days
  const isolated = weekCheckins.filter(c => c.went_outside <= 1 && c.social_interaction <= 1);
  if (isolated.length >= 5) {
    signals.push({
      risk_type: 'social_isolation',
      risk_level: isolated.length >= 7 ? 'red' : 'yellow',
      message: '最近、外出や会話の機会が少ないようです。',
      recommendation: '近くを散歩したり、お知り合いに電話してみませんか？',
      family_notification_text: '外出や会話の機会が減っているようです。電話や訪問で声をかけてみてください。',
      care_staff_details: `直近${weekCheckins.length}日中${isolated.length}日で外出・会話がほぼゼロ`
    });
  }

  // 2. Persistent low mood: mood=1 for 7+ days
  const lowMood = weekCheckins.filter(c => c.mood <= 1);
  if (lowMood.length >= 5) {
    signals.push({
      risk_type: 'persistent_low_mood',
      risk_level: lowMood.length >= 7 ? 'red' : 'yellow',
      message: '少しお疲れの日が続いているようです。こんなときはゆっくり過ごしましょう。',
      recommendation: '好きな音楽を聴いたり、外の空気を吸ってみませんか？',
      family_notification_text: '少しお疲れの日が続いているようです。ゆっくり話を聞いてあげてください。',
      care_staff_details: `直近${weekCheckins.length}日中${lowMood.length}日で気分が最低評価`
    });
  }

  // 3. Sleep disruption: sleep=1 for 7+ days
  const poorSleep = weekCheckins.filter(c => c.sleep_quality <= 1);
  if (poorSleep.length >= 5) {
    signals.push({
      risk_type: 'sleep_disruption',
      risk_level: poorSleep.length >= 7 ? 'red' : 'yellow',
      message: '眠れない日が続いているようです。',
      recommendation: '寝る前にぬるめのお風呂に入ったり、深呼吸をしてみませんか？',
      family_notification_text: '睡眠が不安定な日が続いているようです。就寝環境を一緒に見直してみませんか。',
      care_staff_details: `直近${weekCheckins.length}日中${poorSleep.length}日で睡眠最低評価`
    });
  }

  // 4. Forgetfulness spike: forgetfulness=1 for recent days (compare to earlier)
  if (weekCheckins.length >= 5) {
    const recentForget = weekCheckins.slice(-5).filter(c => c.forgetfulness <= 1).length;
    if (recentForget >= 4) {
      signals.push({
        risk_type: 'forgetfulness_spike',
        risk_level: 'yellow',
        message: 'もの忘れが少し気になっているようですね。',
        recommendation: '「思い出しトレーニング」のドリルを試してみませんか？',
        family_notification_text: '最近、少しコンディションに変化が見られます。様子を見てあげてください。',
        care_staff_details: `直近5日中${recentForget}日でもの忘れ自己評価が最低`
      });
    }
  }

  // 5. Motivation loss
  const noMotivation = weekCheckins.filter(c => c.activity_motivation != null && c.activity_motivation <= 1);
  if (noMotivation.length >= 5) {
    signals.push({
      risk_type: 'motivation_loss',
      risk_level: noMotivation.length >= 7 ? 'red' : 'yellow',
      message: 'やりたいことが見つかりにくい日が続いていますね。',
      recommendation: '昔楽しかったことを思い出してみませんか？少しでも気になることがあれば試してみましょう。',
      family_notification_text: '活動意欲が低下している様子です。一緒に何かをする機会を作ってみてください。',
      care_staff_details: `直近${weekCheckins.length}日中${noMotivation.length}日で活動意欲最低`
    });
  }

  // Save (deduplicate)
  for (const sig of signals) {
    const { data: existing } = await sb.from('senior_risk_signals').select('id')
      .eq('senior_id', currentUser.id).eq('risk_type', sig.risk_type)
      .is('resolved_at', null).gte('created_at', weekAgo.toISOString()).limit(1);
    if (existing && existing.length > 0) continue;
    await sb.from('senior_risk_signals').insert({ senior_id: currentUser.id, ...sig });
  }
}

/* ============ SETTINGS ============ */
function renderSettings() {
  document.getElementById('settings-profile').textContent = currentUser.display_name;

  // Font size
  const fsContainer = document.getElementById('settings-fontsize');
  fsContainer.querySelectorAll('.answer-3-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.v === currentUser.font_size);
    btn.addEventListener('click', async () => {
      fsContainer.querySelectorAll('.answer-3-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentUser.font_size = btn.dataset.v;
      applyFontSize(btn.dataset.v);
      await sb.from('senior_users').update({ font_size: btn.dataset.v }).eq('id', currentUser.id);
    });
  });

  // Answer mode
  const amContainer = document.getElementById('settings-answermode');
  amContainer.querySelectorAll('.answer-3-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.v === currentUser.answer_mode);
    btn.addEventListener('click', async () => {
      amContainer.querySelectorAll('.answer-3-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentUser.answer_mode = btn.dataset.v;
      await sb.from('senior_users').update({ answer_mode: btn.dataset.v }).eq('id', currentUser.id);
    });
  });
}

async function exportData() {
  const [cRes, aRes, dRes] = await Promise.all([
    sb.from('senior_daily_checkins').select('*').eq('senior_id', currentUser.id).order('checkin_date'),
    sb.from('senior_monthly_assessments').select('*').eq('senior_id', currentUser.id).order('assessment_month'),
    sb.from('senior_drill_completions').select('*').eq('senior_id', currentUser.id).order('completed_date')
  ]);

  const obj = {
    user: { display_name: currentUser.display_name },
    daily_checkins: cRes.data || [],
    monthly_assessments: aRes.data || [],
    drill_completions: dRes.data || [],
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `brain_wellness_export_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function deleteAccount() {
  if (!confirm('アカウントを削除しますか？\nすべてのデータが削除されます。\nこの操作は元に戻せません。')) return;
  if (!confirm('本当に削除しますか？\n最終確認です。')) return;

  await sb.from('senior_users').delete().eq('id', currentUser.id);
  localStorage.removeItem('senior_token');
  location.reload();
}

/* ============ HELPERS ============ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

function generateToken() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  return Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('');
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function difficultyLabel(d) {
  return { easy: 'かんたん', normal: 'ふつう', challenge: 'チャレンジ' }[d] || d;
}

function bindRadioGroup(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.querySelectorAll('.answer-3-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.answer-3-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

function getRadioValue(containerId) {
  const sel = document.querySelector(`#${containerId} .answer-3-btn.selected`);
  return sel ? sel.dataset.v : null;
}

// Expose to onclick
window.showTab = showTab;

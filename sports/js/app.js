/* ================================================
   UNLOCK Sports — Player App
   Daily check-in + match report + dashboard + trend
   ================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'unlock_sports_token';

  // ============================================
  // DAILY CHECK-IN QUESTIONS (7 items, ~2min)
  // ============================================
  var DAILY_QUESTIONS = [
    { id: 'D01', cat: 'body', label: 'Body', text: '昨晩の睡眠の質はどうでしたか？', lo: '全く眠れなかった', hi: '完璧に眠れた' },
    { id: 'D02', cat: 'body', label: 'Body', text: '身体の疲労感はどうですか？', lo: '非常にだるい', hi: '軽くて元気' },
    { id: 'D03', cat: 'body', label: 'Body', text: '痛みや違和感はありますか？', lo: 'かなりある', hi: '全くない' },
    { id: 'D04', cat: 'body', label: 'Body', text: '昨日〜今朝の食事・水分は十分でしたか？', lo: '不十分', hi: '十分' },
    { id: 'D05', cat: 'brain', label: 'Brain', text: '今の気分・ストレスレベルは？', lo: '非常にストレス', hi: 'とてもリラックス' },
    { id: 'D06', cat: 'brain', label: 'Brain', text: '今日の練習/試合に集中できそうですか？', lo: '全く集中できない', hi: '完全に集中できる' },
    { id: 'D07', cat: 'brain', label: 'Brain', text: '今日のモチベーションは？', lo: 'やる気が出ない', hi: '非常にやる気がある' },
  ];

  // ============================================
  // MATCH REPORT QUESTIONS (5 items + RPE)
  // ============================================
  var MATCH_QUESTIONS = [
    { id: 'M01', type: 'rpe', text: '主観的運動強度（RPE）：今日の試合はどれくらいキツかった？', lo: '非常に楽', hi: '限界' },
    { id: 'M02', type: 'rating', text: '試合中の判断の鋭さ（パスコース、ポジショニングの選択）', lo: '鈍かった', hi: '鋭かった' },
    { id: 'M03', type: 'rating', text: '集中力は後半まで持続できた？', lo: '前半で切れた', hi: '最後まで維持' },
    { id: 'M04', type: 'rating', text: 'メンタル的な消耗度', lo: '非常に消耗', hi: '余裕あり' },
    { id: 'M05', type: 'rating', text: '身体的な消耗度', lo: '非常に消耗', hi: '余裕あり' },
  ];

  // ============================================
  // ACTION BANK (weekly suggestions)
  // ============================================
  var ACTION_BANK = {
    body: [
      '今週は就寝30分前にスマホを手放して、睡眠の質を上げてみましょう。',
      '練習後のクールダウンに5分間のストレッチを追加してみましょう。',
      '今週3日、同じ時刻に布団に入ることを試みましょう。',
      '練習後30分以内にタンパク質を摂る習慣をつけてみましょう。',
    ],
    brain: [
      '練習前に1分間の深呼吸（吸う4秒・止める4秒・吐く6秒）を試してみましょう。',
      '試合映像を見ながら、自分のポジショニングを1プレーだけ振り返ってみましょう。',
      '今週、チームメイトに1回「ナイスプレー」と声をかけてみましょう。',
      '移動中にイヤホンを外して、周囲の音に意識を向ける時間を作ってみましょう。',
    ],
  };

  // ============================================
  // SUPABASE
  // ============================================
  var sb = null;
  if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' &&
      SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ============================================
  // STATE
  // ============================================
  var currentUser = null;
  var currentClub = null;
  var teams = [];
  var checkinAnswers = {};
  var matchAnswers = {};
  var todayCheckin = null;
  var checkinHistory = [];
  var todayMatch = null;

  // ============================================
  // HELPERS
  // ============================================
  var $ = function (s) { return document.querySelector(s); };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function generateToken() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var t = '';
    for (var i = 0; i < 24; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
    return t;
  }

  function calcSignal(bodyScore, brainScore) {
    if (bodyScore <= 2.0 || brainScore <= 2.0) return 'red';
    if (bodyScore <= 3.0 || brainScore <= 3.0) return 'yellow';
    return 'green';
  }

  function signalBadgeHtml(level) {
    var labels = { green: '良好', yellow: '注意', red: '要注意' };
    if (!level || !labels[level]) return '';
    return '<span class="signal-badge signal-' + level + '"><span class="signal-dot signal-dot-' + level + '"></span>' + labels[level] + '</span>';
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    var clubCode = getUrlParam('club');
    if (!clubCode || !sb) {
      showScreen('screen-register');
      $('#reg-error').textContent = '有効なクラブURLからアクセスしてください。';
      $('#reg-error').style.display = 'block';
      $('#btn-register').disabled = true;
      return;
    }

    sb.from('clubs').select('*').eq('club_code', clubCode).eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#reg-error').textContent = '無効なクラブコードです。';
          $('#reg-error').style.display = 'block';
          $('#btn-register').disabled = true;
          return;
        }
        currentClub = res.data[0];
        $('#topbar-club').textContent = currentClub.club_name;

        return sb.from('teams').select('*').eq('club_code', clubCode).order('sort_order');
      })
      .then(function (res) {
        if (!res) return;
        teams = res.data || [];
        populateTeams();

        var token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return sb.from('sports_users').select('*').eq('user_token', token).eq('is_active', true).limit(1)
            .then(function (res2) {
              if (res2.data && res2.data.length > 0) {
                currentUser = res2.data[0];
                afterLogin();
              }
            });
        }
      });
  }

  function populateTeams() {
    var sel = $('#reg-team');
    if (teams.length === 0) {
      sel.innerHTML = '<option value="">チームが未登録です</option>';
      $('#btn-register').disabled = true;
      return;
    }
    sel.innerHTML = '<option value="">選択してください</option>';
    teams.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.team_name;
      sel.appendChild(opt);
    });
    $('#btn-register').disabled = false;
  }

  function afterLogin() {
    $('#topbar').style.display = '';
    showDashboard();
  }

  // ============================================
  // REGISTER
  // ============================================
  $('#btn-register').addEventListener('click', function () {
    var teamId = $('#reg-team').value;
    var name = $('#reg-name').value.trim();
    var number = $('#reg-number').value ? parseInt($('#reg-number').value, 10) : null;
    var position = $('#reg-position').value || null;
    if (!teamId) { $('#reg-error').textContent = 'チームを選択してください。'; $('#reg-error').style.display = 'block'; return; }
    if (!name) { $('#reg-error').textContent = '表示名を入力してください。'; $('#reg-error').style.display = 'block'; return; }
    if (!sb || !currentClub) return;

    var token = generateToken();
    sb.from('sports_users').insert([{
      club_code: currentClub.club_code,
      team_id: teamId,
      user_token: token,
      display_name: name,
      squad_number: number,
      position: position,
      role: 'player',
    }]).select().then(function (res) {
      if (res.error) {
        $('#reg-error').textContent = '登録に失敗しました。' + res.error.message;
        $('#reg-error').style.display = 'block';
        return;
      }
      currentUser = res.data[0];
      localStorage.setItem(TOKEN_KEY, token);
      afterLogin();
    });
  });

  // ============================================
  // DASHBOARD
  // ============================================
  function showDashboard() {
    showScreen('screen-home');
    loadDashboardData();
  }

  function loadDashboardData() {
    var today = todayStr();

    Promise.all([
      sb.from('daily_checkins').select('*').eq('user_id', currentUser.id).eq('checkin_date', today).limit(1),
      sb.from('daily_checkins').select('*').eq('user_id', currentUser.id).order('checkin_date', { ascending: false }).limit(28),
      sb.from('matches').select('*').eq('club_code', currentUser.club_code).eq('match_date', today).limit(1),
      sb.from('training_menus').select('*').eq('is_active', true),
    ]).then(function (results) {
      todayCheckin = (results[0].data || [])[0] || null;
      checkinHistory = (results[1].data || []).reverse();
      todayMatch = (results[2].data || [])[0] || null;
      var menus = results[3].data || [];

      renderDashboard(menus);
    });
  }

  function renderDashboard(menus) {
    // Today's scores
    if (todayCheckin) {
      $('#home-total').textContent = Number(todayCheckin.total_readiness).toFixed(1);
      $('#home-body').textContent = Number(todayCheckin.body_readiness).toFixed(1);
      $('#home-brain').textContent = Number(todayCheckin.brain_readiness).toFixed(1);
      $('#home-signal').innerHTML = signalBadgeHtml(todayCheckin.signal_level);
      $('#btn-start-checkin').textContent = '今日のチェックイン済み';
      $('#btn-start-checkin').disabled = true;
    } else {
      $('#home-total').textContent = '—';
      $('#home-body').textContent = '—';
      $('#home-brain').textContent = '—';
      $('#home-signal').innerHTML = '';
      $('#btn-start-checkin').textContent = 'デイリーチェックイン';
      $('#btn-start-checkin').disabled = false;
    }

    // Match report button
    if (todayMatch) {
      $('#btn-start-match-report').style.display = '';
      // Check if already submitted
      sb.from('match_reports').select('id').eq('user_id', currentUser.id).eq('match_id', todayMatch.id).limit(1)
        .then(function (res) {
          if (res.data && res.data.length > 0) {
            $('#btn-start-match-report').textContent = '試合後レポート済み';
            $('#btn-start-match-report').disabled = true;
          } else {
            $('#btn-start-match-report').textContent = '試合後レポート';
            $('#btn-start-match-report').disabled = false;
          }
        });
    } else {
      $('#btn-start-match-report').style.display = 'none';
    }

    // Recommendation
    renderRecommendation(menus);

    // Action
    renderAction();

    // Trend
    renderTrend();
  }

  function renderRecommendation(menus) {
    var section = $('#home-recommendation');
    if (!menus || menus.length === 0 || !todayCheckin) {
      section.innerHTML = '';
      return;
    }

    // Pick menu based on state
    var tags = [];
    if (Number(todayCheckin.focus_outlook) <= 3) tags.push('low_focus');
    if (Number(todayCheckin.motivation) <= 3) tags.push('low_motivation');
    if (Number(todayCheckin.stress_mood) <= 3) tags.push('high_stress');
    if (Number(todayCheckin.sleep_quality) <= 3) tags.push('low_sleep');
    if (Number(todayCheckin.fatigue) <= 2) tags.push('high_fatigue');

    if (tags.length === 0) tags.push('low_focus'); // default

    // Find matching menus
    var scored = menus.map(function (m) {
      var overlap = (m.target_tags || []).filter(function (t) { return tags.indexOf(t) !== -1; }).length;
      return { menu: m, score: overlap };
    }).filter(function (m) { return m.score > 0; });

    scored.sort(function (a, b) { return b.score - a.score; });

    var pick = scored.length > 0 ? scored[0].menu : menus[Math.floor(Math.random() * menus.length)];
    var intClass = 'intensity-' + pick.intensity;
    var intLabel = { low: 'Low', medium: 'Mid', high: 'High' }[pick.intensity] || 'Mid';

    section.innerHTML =
      '<div class="section-header">今日のおすすめドリル</div>' +
      '<div class="menu-card">' +
        '<div class="menu-card-title">' + pick.title + '</div>' +
        '<div class="menu-card-meta">' +
          '<span class="intensity-badge ' + intClass + '">' + intLabel + '</span>' +
          '<span>' + (pick.duration_min || 10) + '分</span>' +
        '</div>' +
        '<div class="menu-card-desc">' + (pick.description || '') + '</div>' +
        (pick.video_url ? '<a href="' + pick.video_url + '" target="_blank" class="menu-card-video">動画を見る →</a>' : '') +
      '</div>';
  }

  function renderAction() {
    var section = $('#home-action');
    if (!todayCheckin) { section.innerHTML = ''; return; }

    var lowestCat = Number(todayCheckin.body_readiness) <= Number(todayCheckin.brain_readiness) ? 'body' : 'brain';
    var actions = ACTION_BANK[lowestCat];
    var idx = Math.floor(Math.random() * actions.length);

    section.innerHTML =
      '<div class="action-card">' +
        '<div class="action-card-label">今週の1アクション</div>' +
        '<div class="action-card-text">' + actions[idx] + '</div>' +
      '</div>';
  }

  function renderTrend() {
    var svg = $('#trend-chart');
    var emptyEl = $('#trend-empty');

    if (checkinHistory.length === 0) {
      svg.style.display = 'none';
      emptyEl.style.display = '';
      return;
    }
    svg.style.display = '';
    emptyEl.style.display = 'none';

    var data = checkinHistory;
    var w = 580, h = 160, pad = 30;
    var n = data.length;
    var html = '';

    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee" stroke-width="1"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    var bodyPts = [], brainPts = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      var bodyY = h - pad - ((Number(data[i].body_readiness) - 1) / 4) * (h - 2 * pad);
      var brainY = h - pad - ((Number(data[i].brain_readiness) - 1) / 4) * (h - 2 * pad);
      bodyPts.push({ x: x, y: bodyY });
      brainPts.push({ x: x, y: brainY });

      if (i % Math.max(1, Math.floor(n / 7)) === 0 || i === n - 1) {
        var parts = data[i].checkin_date.split('-');
        html += '<text x="' + x + '" y="' + (h - 4) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
      }
    }

    // Body line
    if (bodyPts.length > 1) {
      html += '<path d="M' + bodyPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#1a73e8" stroke-width="2" opacity="0.8"/>';
    }
    bodyPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#1a73e8"/>'; });

    // Brain line
    if (brainPts.length > 1) {
      html += '<path d="M' + brainPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#0a8f3c" stroke-width="2" opacity="0.8"/>';
    }
    brainPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="3" fill="#0a8f3c"/>'; });

    svg.innerHTML = html;
  }

  // ============================================
  // DAILY CHECK-IN
  // ============================================
  $('#btn-start-checkin').addEventListener('click', function () {
    if (this.disabled) return;
    checkinAnswers = {};
    renderCheckinQuestions();
    showScreen('screen-checkin');
  });

  function renderCheckinQuestions() {
    var container = $('#checkin-questions');
    container.innerHTML = '';
    DAILY_QUESTIONS.forEach(function (q) {
      var div = document.createElement('div');
      div.className = 'checkin-q';
      div.innerHTML =
        '<div class="checkin-q-cat">' + q.label + '</div>' +
        '<div class="checkin-q-text">' + q.text + '</div>' +
        '<div class="rating-group">' +
          [1, 2, 3, 4, 5].map(function (n) {
            return '<button type="button" class="rating-btn" data-qid="' + q.id + '" data-val="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="rating-labels"><span>' + q.lo + '</span><span>' + q.hi + '</span></div>';
      container.appendChild(div);
    });
    updateCheckinSubmit();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.rating-btn');
    if (!btn) return;

    // Daily checkin
    if ($('#screen-checkin').classList.contains('active')) {
      var qid = btn.getAttribute('data-qid');
      var val = parseInt(btn.getAttribute('data-val'), 10);
      checkinAnswers[qid] = val;
      btn.closest('.rating-group').querySelectorAll('.rating-btn').forEach(function (b) {
        b.classList.toggle('selected', parseInt(b.getAttribute('data-val'), 10) === val);
      });
      updateCheckinSubmit();
    }

    // Match report (rating questions)
    if ($('#screen-match-report').classList.contains('active') && btn.classList.contains('rating-btn') && !btn.classList.contains('rpe-btn')) {
      var mqid = btn.getAttribute('data-qid');
      var mval = parseInt(btn.getAttribute('data-val'), 10);
      matchAnswers[mqid] = mval;
      btn.closest('.rating-group').querySelectorAll('.rating-btn').forEach(function (b) {
        b.classList.toggle('selected', parseInt(b.getAttribute('data-val'), 10) === mval);
      });
      updateMatchSubmit();
    }
  });

  // RPE buttons
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.rpe-btn');
    if (!btn || !$('#screen-match-report').classList.contains('active')) return;
    var qid = btn.getAttribute('data-qid');
    var val = parseInt(btn.getAttribute('data-val'), 10);
    matchAnswers[qid] = val;
    btn.closest('.rpe-group').querySelectorAll('.rpe-btn').forEach(function (b) {
      b.classList.toggle('selected', parseInt(b.getAttribute('data-val'), 10) === val);
    });
    updateMatchSubmit();
  });

  function updateCheckinSubmit() {
    var answered = Object.keys(checkinAnswers).length;
    $('#btn-checkin-submit').disabled = answered < DAILY_QUESTIONS.length;
  }

  $('#btn-checkin-submit').addEventListener('click', function () {
    if (!sb || !currentUser) return;

    var bodyQs = DAILY_QUESTIONS.filter(function (q) { return q.cat === 'body'; });
    var brainQs = DAILY_QUESTIONS.filter(function (q) { return q.cat === 'brain'; });

    var bodySum = bodyQs.reduce(function (s, q) { return s + (checkinAnswers[q.id] || 3); }, 0);
    var brainSum = brainQs.reduce(function (s, q) { return s + (checkinAnswers[q.id] || 3); }, 0);

    var bodyScore = bodySum / bodyQs.length;
    var brainScore = brainSum / brainQs.length;
    var totalScore = (bodySum + brainSum) / DAILY_QUESTIONS.length;
    var signal = calcSignal(bodyScore, brainScore);

    var record = {
      user_id: currentUser.id,
      club_code: currentUser.club_code,
      team_id: currentUser.team_id,
      checkin_date: todayStr(),
      answers: checkinAnswers,
      body_readiness: bodyScore.toFixed(1),
      brain_readiness: brainScore.toFixed(1),
      total_readiness: totalScore.toFixed(1),
      sleep_quality: checkinAnswers['D01'] || null,
      fatigue: checkinAnswers['D02'] || null,
      pain_level: checkinAnswers['D03'] || null,
      nutrition: checkinAnswers['D04'] || null,
      stress_mood: checkinAnswers['D05'] || null,
      focus_outlook: checkinAnswers['D06'] || null,
      motivation: checkinAnswers['D07'] || null,
      signal_level: signal,
      one_word: $('#checkin-oneword').value.trim() || null,
    };

    sb.from('daily_checkins').upsert([record], { onConflict: 'user_id,checkin_date' }).select()
      .then(function (res) {
        if (res.error) { console.error('Save failed:', res.error); return; }
        var saved = res.data[0];

        // Risk signal
        if (signal !== 'green') {
          var cats = [];
          if (bodyScore <= 3.0) cats.push('body');
          if (brainScore <= 3.0) cats.push('brain');
          sb.from('sports_risk_signals').insert([{
            user_id: currentUser.id,
            club_code: currentUser.club_code,
            team_id: currentUser.team_id,
            source_type: 'daily_checkin',
            source_id: saved.id,
            risk_level: signal,
            risk_categories: cats,
            message: signal === 'red' ? 'コンディションが低い状態です。無理せず休息を優先してください。' : '一部のスコアが注意レベルです。',
          }]);
        }

        showScreen('screen-done');
        $('#done-icon').textContent = signal === 'green' ? '\u2705' : '\u26a0\ufe0f';
        $('#done-title').textContent = 'チェックイン完了';
        var msg = 'お疲れさま！Body ' + bodyScore.toFixed(1) + ' / Brain ' + brainScore.toFixed(1);
        if (signal === 'red') msg += '\n今日は無理せず、コンディション回復を優先しましょう。';
        else if (signal === 'yellow') msg += '\n少し注意が必要かも。自分のペースで。';
        $('#done-desc').textContent = msg;
      });
  });

  $('#btn-checkin-skip').addEventListener('click', function () {
    showDashboard();
  });

  // ============================================
  // MATCH REPORT
  // ============================================
  $('#btn-start-match-report').addEventListener('click', function () {
    if (this.disabled || !todayMatch) return;
    matchAnswers = {};
    renderMatchQuestions();
    showScreen('screen-match-report');
  });

  function renderMatchQuestions() {
    var container = $('#match-report-questions');
    container.innerHTML = '';

    // Match info
    var info = document.createElement('div');
    info.className = 'card';
    info.style.marginBottom = '24px';
    info.innerHTML =
      '<div class="card-title">' + (todayMatch.is_home ? 'HOME' : 'AWAY') + ' vs ' + todayMatch.opponent + '</div>' +
      '<div class="card-desc">' + todayMatch.match_date + (todayMatch.competition ? ' / ' + todayMatch.competition : '') + '</div>';
    container.appendChild(info);

    MATCH_QUESTIONS.forEach(function (q) {
      var div = document.createElement('div');
      div.className = 'checkin-q';

      if (q.type === 'rpe') {
        div.innerHTML =
          '<div class="checkin-q-text">' + q.text + '</div>' +
          '<div class="rpe-group">' +
            [1,2,3,4,5,6,7,8,9,10].map(function (n) {
              return '<button type="button" class="rpe-btn" data-qid="' + q.id + '" data-val="' + n + '">' + n + '</button>';
            }).join('') +
          '</div>' +
          '<div class="rating-labels"><span>' + q.lo + '</span><span>' + q.hi + '</span></div>';
      } else {
        div.innerHTML =
          '<div class="checkin-q-text">' + q.text + '</div>' +
          '<div class="rating-group">' +
            [1,2,3,4,5].map(function (n) {
              return '<button type="button" class="rating-btn" data-qid="' + q.id + '" data-val="' + n + '">' + n + '</button>';
            }).join('') +
          '</div>' +
          '<div class="rating-labels"><span>' + q.lo + '</span><span>' + q.hi + '</span></div>';
      }
      container.appendChild(div);
    });
    updateMatchSubmit();
  }

  function updateMatchSubmit() {
    var answered = Object.keys(matchAnswers).length;
    $('#btn-match-submit').disabled = answered < MATCH_QUESTIONS.length;
  }

  $('#btn-match-submit').addEventListener('click', function () {
    if (!sb || !currentUser || !todayMatch) return;

    var record = {
      user_id: currentUser.id,
      match_id: todayMatch.id,
      club_code: currentUser.club_code,
      team_id: currentUser.team_id,
      answers: matchAnswers,
      rpe: matchAnswers['M01'] || null,
      decision_sharpness: matchAnswers['M02'] || null,
      focus_sustained: matchAnswers['M03'] || null,
      mental_fatigue: matchAnswers['M04'] || null,
      physical_fatigue: matchAnswers['M05'] || null,
    };

    // Signal from match report
    var mentalAvg = ((matchAnswers['M02'] || 3) + (matchAnswers['M03'] || 3) + (matchAnswers['M04'] || 3)) / 3;
    var physAvg = (matchAnswers['M05'] || 3);
    record.signal_level = calcSignal(physAvg, mentalAvg);

    sb.from('match_reports').upsert([record], { onConflict: 'user_id,match_id' }).select()
      .then(function (res) {
        if (res.error) { console.error('Save failed:', res.error); return; }

        if (record.signal_level !== 'green') {
          sb.from('sports_risk_signals').insert([{
            user_id: currentUser.id,
            club_code: currentUser.club_code,
            team_id: currentUser.team_id,
            source_type: 'match_report',
            source_id: res.data[0].id,
            risk_level: record.signal_level,
            risk_categories: ['match_load'],
            message: '試合後の消耗度が高い状態です。リカバリーを優先してください。',
          }]);
        }

        showScreen('screen-done');
        $('#done-icon').textContent = '\u26bd';
        $('#done-title').textContent = '試合後レポート完了';
        $('#done-desc').textContent = 'vs ' + todayMatch.opponent + ' のレポートが記録されました。';
      });
  });

  // ============================================
  // DONE
  // ============================================
  $('#btn-done-home').addEventListener('click', showDashboard);

  // ============================================
  // SETTINGS
  // ============================================
  $('#btn-settings').addEventListener('click', function () {
    $('#settings-share-coach').checked = !!currentUser.share_with_coach;
    var team = teams.find(function (t) { return t.id === currentUser.team_id; });
    var posLabel = currentUser.position ? ' / ' + currentUser.position : '';
    var numLabel = currentUser.squad_number ? ' #' + currentUser.squad_number : '';
    $('#settings-profile').textContent = currentUser.display_name + numLabel + posLabel + ' / ' + (team ? team.team_name : '—');
    showScreen('screen-settings');
  });

  $('#btn-settings-back').addEventListener('click', showDashboard);

  $('#settings-share-coach').addEventListener('change', function () {
    if (!sb || !currentUser) return;
    var val = this.checked;
    sb.from('sports_users').update({ share_with_coach: val }).eq('id', currentUser.id)
      .then(function () {
        currentUser.share_with_coach = val;
      });
  });

  // ============================================
  // BOOT
  // ============================================
  init();
})();

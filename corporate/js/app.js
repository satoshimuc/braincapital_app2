/* ================================================
   UNLOCK Corporate Wellness — Employee App
   ================================================ */
(function () {
  'use strict';

  // ============================================
  // CONFIG
  // ============================================
  var TOKEN_KEY = 'unlock_corp_token';

  var WEEKLY_QUESTIONS = [
    { id: 'W01', cat: 'stress', text: '今週、仕事上のストレスをうまく処理できていると感じた' },
    { id: 'W02', cat: 'stress', text: '気持ちに余裕を持って過ごせた' },
    { id: 'W03', cat: 'health', text: '十分な睡眠が取れ、朝すっきり起きられた' },
    { id: 'W04', cat: 'health', text: '集中力を必要な時に発揮できた' },
    { id: 'W05', cat: 'health', text: '心身にエネルギーがあり、活動的に過ごせた' },
  ];

  var ACTION_BANK = {
    stress: [
      '今日5分間、目を閉じて深呼吸をしてみましょう。吸う4秒・止める4秒・吐く6秒。',
      '今週中に、仕事から完全に離れる15分の休憩を1日1回つくりましょう。',
      '信頼できる人に、最近感じていることを話してみましょう。',
      '今日の帰り道、イヤホンを外して周囲の音に意識を向けてみましょう。',
    ],
    health: [
      '今晩、就寝30分前にスマホを手放して、紙の本やストレッチに切り替えてみましょう。',
      '次の食事で、野菜を一品追加してみましょう。脳の燃料補給です。',
      '今日10分間の散歩をしてみましょう。歩くだけでBDNF（脳の成長因子）が分泌されます。',
      '今週3日、同じ時刻に布団に入ることを試みましょう。',
    ],
  };

  var REFERRAL_LINKS = [
    { name: '産業医・保健師への相談', desc: '社内の産業保健スタッフにご相談ください。', url: null },
    { name: 'こころの健康相談統一ダイヤル', desc: '0570-064-556', url: 'tel:0570064556' },
    { name: 'よりそいホットライン', desc: '0120-279-338（24時間）', url: 'tel:0120279338' },
  ];

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
  var currentUser = null;   // corp_users record
  var currentOrg = null;    // organizations record
  var departments = [];
  var checkinAnswers = {};
  var weeklyHistory = [];

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

  function getWeekStart() {
    var d = new Date();
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    var mon = new Date(d.setDate(diff));
    return mon.toISOString().slice(0, 10);
  }

  function generateToken() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    var t = '';
    for (var i = 0; i < 24; i++) t += chars.charAt(Math.floor(Math.random() * chars.length));
    return t;
  }

  function calcRisk(stressScore, healthScore) {
    if (stressScore <= 2.0 || healthScore <= 2.0) return 'red';
    if (stressScore <= 3.0 || healthScore <= 3.0) return 'yellow';
    return 'green';
  }

  function riskBadgeHtml(level) {
    var labels = { green: '良好', yellow: '注意', red: '要注意' };
    return '<span class="risk-badge risk-' + level + '"><span class="risk-dot risk-dot-' + level + '"></span>' + labels[level] + '</span>';
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    var orgCode = getUrlParam('org');
    if (!orgCode || !sb) {
      showScreen('screen-register');
      $('#reg-error').textContent = '有効な組織URLからアクセスしてください。';
      $('#reg-error').style.display = 'block';
      $('#btn-register').disabled = true;
      return;
    }

    // Validate org
    sb.from('organizations').select('*').eq('org_code', orgCode).eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#reg-error').textContent = '無効な組織コードです。';
          $('#reg-error').style.display = 'block';
          $('#btn-register').disabled = true;
          return;
        }
        currentOrg = res.data[0];
        $('#topbar-org').textContent = currentOrg.org_name;

        // Load departments
        return sb.from('departments').select('*').eq('org_code', orgCode).order('sort_order');
      })
      .then(function (res) {
        if (!res) return;
        departments = res.data || [];
        populateDepartments();

        // Check existing session
        var token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return sb.from('corp_users').select('*').eq('user_token', token).eq('is_active', true).limit(1)
            .then(function (res2) {
              if (res2.data && res2.data.length > 0) {
                currentUser = res2.data[0];
                afterLogin();
              }
            });
        }
      });
  }

  function populateDepartments() {
    var sel = $('#reg-department');
    sel.innerHTML = '<option value="">選択してください</option>';
    departments.forEach(function (d) {
      var opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  }

  function afterLogin() {
    $('#topbar').style.display = '';
    // Check consent
    sb.from('consents').select('*').eq('user_id', currentUser.id)
      .then(function (res) {
        var consents = res.data || [];
        var basic = consents.find(function (c) { return c.consent_type === 'basic_usage' && c.status === 'granted'; });
        if (!basic) {
          showScreen('screen-consent');
        } else {
          showDashboard();
        }
      });
  }

  // ============================================
  // REGISTER
  // ============================================
  $('#btn-register').addEventListener('click', function () {
    var deptId = $('#reg-department').value;
    var name = $('#reg-name').value.trim() || '匿名';
    if (!deptId) {
      $('#reg-error').textContent = '部門を選択してください。';
      $('#reg-error').style.display = 'block';
      return;
    }
    if (!sb || !currentOrg) return;

    var token = generateToken();
    sb.from('corp_users').insert([{
      org_code: currentOrg.org_code,
      department_id: deptId,
      user_token: token,
      display_name: name,
      role: 'employee',
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
  // CONSENT
  // ============================================
  $('#consent-basic').addEventListener('change', function () {
    $('#btn-consent-submit').disabled = !this.checked;
  });

  $('#btn-consent-submit').addEventListener('click', function () {
    if (!sb || !currentUser) return;

    var ohScores = $('#consent-oh-scores').checked;
    var ohCheckins = $('#consent-oh-checkins').checked;
    var ohActive = ohScores || ohCheckins;

    var inserts = [{
      user_id: currentUser.id,
      consent_type: 'basic_usage',
      status: 'granted',
      granted_at: new Date().toISOString(),
    }];

    if (ohActive) {
      inserts.push({
        user_id: currentUser.id,
        consent_type: 'oh_sharing',
        status: 'granted',
        shared_scopes: { share_overall_scores: ohScores, share_weekly_checkins: ohCheckins },
        granted_at: new Date().toISOString(),
      });
    }

    sb.from('consents').upsert(inserts, { onConflict: 'user_id,consent_type' })
      .then(function (res) {
        if (res.error) { console.error(res.error); return; }
        showDashboard();
      });
  });

  // ============================================
  // DASHBOARD
  // ============================================
  function showDashboard() {
    showScreen('screen-home');
    loadWeeklyHistory();
  }

  function loadWeeklyHistory() {
    sb.from('weekly_checkins').select('*')
      .eq('user_id', currentUser.id)
      .order('week_start', { ascending: false })
      .limit(8)
      .then(function (res) {
        weeklyHistory = (res.data || []).reverse();
        renderDashboard();
      });
  }

  function renderDashboard() {
    if (weeklyHistory.length === 0) {
      $('#dash-score').textContent = '—';
      $('#dash-risk-badge').innerHTML = '';
      $('#trend-chart').style.display = 'none';
      $('#trend-empty').style.display = '';
      $('#action-section').innerHTML = '';
      $('#referral-section').style.display = 'none';
      return;
    }

    var latest = weeklyHistory[weeklyHistory.length - 1];
    $('#dash-score').textContent = Number(latest.total_score).toFixed(1);
    $('#dash-risk-badge').innerHTML = riskBadgeHtml(latest.risk_level);

    // Trend chart
    $('#trend-chart').style.display = '';
    $('#trend-empty').style.display = 'none';
    drawTrendChart(weeklyHistory);

    // Action
    renderAction(latest);

    // Referral
    renderReferral(latest.risk_level);
  }

  function drawTrendChart(data) {
    var svg = $('#trend-chart');
    var w = 580, h = 160, pad = 30;
    var n = data.length;
    if (n === 0) { svg.innerHTML = ''; return; }

    var html = '';
    // Grid lines
    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee" stroke-width="1"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    var points = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      var score = Number(data[i].total_score);
      var y = h - pad - ((score - 1) / 4) * (h - 2 * pad);
      points.push({ x: x, y: y, score: score, risk: data[i].risk_level, week: data[i].week_start });

      // Week label
      var parts = data[i].week_start.split('-');
      html += '<text x="' + x + '" y="' + (h - 4) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
    }

    // Line
    if (points.length > 1) {
      var pathD = 'M' + points.map(function (p) { return p.x + ',' + p.y; }).join(' L');
      html += '<path d="' + pathD + '" fill="none" stroke="#222" stroke-width="2"/>';
    }

    // Dots
    points.forEach(function (p) {
      var colors = { green: '#0a8f3c', yellow: '#b8860b', red: '#c00' };
      html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="5" fill="' + (colors[p.risk] || '#222') + '"/>';
    });

    svg.innerHTML = html;
  }

  function renderAction(latest) {
    var section = $('#action-section');
    var lowestCat = Number(latest.stress_score) <= Number(latest.health_score) ? 'stress' : 'health';
    var actions = ACTION_BANK[lowestCat];
    var idx = Math.floor(Math.random() * actions.length);
    section.innerHTML =
      '<div class="action-card">' +
        '<div class="action-card-label">今週の1アクション</div>' +
        '<div class="action-card-text">' + actions[idx] + '</div>' +
      '</div>';
  }

  function renderReferral(level) {
    var section = $('#referral-section');
    if (level === 'green') {
      section.style.display = 'none';
      return;
    }
    section.style.display = '';
    var cssClass = level === 'red' ? '' : ' yellow';
    var title = level === 'red'
      ? 'ストレスまたは脳の健康に注意が必要な可能性があります'
      : 'やや負荷がかかっている可能性があります';
    var desc = level === 'red'
      ? '診断ではなく可能性の示唆です。以下の窓口にご相談ください。'
      : '無理をせず、下記の窓口もご活用ください。';

    var linksHtml = REFERRAL_LINKS.map(function (r) {
      return '<li>' + (r.url ? '<a href="' + r.url + '">' : '') + r.name + (r.url ? '</a>' : '') +
        '<br><span style="font-size:11px;color:#777;">' + r.desc + '</span></li>';
    }).join('');

    section.innerHTML =
      '<div class="referral-card' + cssClass + '">' +
        '<div class="referral-title">' + title + '</div>' +
        '<div class="referral-desc">' + desc + '</div>' +
        '<ul class="referral-links">' + linksHtml + '</ul>' +
      '</div>';
  }

  // ============================================
  // WEEKLY CHECK-IN
  // ============================================
  $('#btn-start-checkin').addEventListener('click', function () {
    checkinAnswers = {};
    renderCheckinQuestions();
    showScreen('screen-checkin');
  });

  function renderCheckinQuestions() {
    var container = $('#checkin-questions');
    container.innerHTML = '';
    WEEKLY_QUESTIONS.forEach(function (q) {
      var div = document.createElement('div');
      div.className = 'checkin-question';
      div.innerHTML =
        '<div class="checkin-question-id">' + q.id + '</div>' +
        '<div class="checkin-question-text">' + q.text + '</div>' +
        '<div class="rating-group">' +
          [1, 2, 3, 4, 5].map(function (n) {
            return '<button type="button" class="rating-btn" data-qid="' + q.id + '" data-val="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="rating-labels"><span>まったく当てはまらない</span><span>非常に当てはまる</span></div>';
      container.appendChild(div);
    });
    updateCheckinSubmit();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.rating-btn');
    if (!btn || !$('#screen-checkin').classList.contains('active')) return;
    var qid = btn.getAttribute('data-qid');
    var val = parseInt(btn.getAttribute('data-val'), 10);
    checkinAnswers[qid] = val;

    // Update UI
    btn.closest('.rating-group').querySelectorAll('.rating-btn').forEach(function (b) {
      b.classList.toggle('selected', parseInt(b.getAttribute('data-val'), 10) === val);
    });
    btn.closest('.checkin-question').classList.add('answered');
    updateCheckinSubmit();
  });

  function updateCheckinSubmit() {
    var total = WEEKLY_QUESTIONS.length;
    var answered = Object.keys(checkinAnswers).length;
    $('#btn-checkin-submit').disabled = answered < total;
  }

  $('#btn-checkin-submit').addEventListener('click', function () {
    if (!sb || !currentUser) return;

    // Calculate scores
    var stressQs = WEEKLY_QUESTIONS.filter(function (q) { return q.cat === 'stress'; });
    var healthQs = WEEKLY_QUESTIONS.filter(function (q) { return q.cat === 'health'; });

    var stressSum = stressQs.reduce(function (s, q) { return s + (checkinAnswers[q.id] || 3); }, 0);
    var healthSum = healthQs.reduce(function (s, q) { return s + (checkinAnswers[q.id] || 3); }, 0);

    var stressScore = stressSum / stressQs.length;
    var healthScore = healthSum / healthQs.length;
    var totalScore = (stressSum + healthSum) / WEEKLY_QUESTIONS.length;
    var riskLevel = calcRisk(stressScore, healthScore);

    var record = {
      user_id: currentUser.id,
      org_code: currentUser.org_code,
      department_id: currentUser.department_id,
      answers: checkinAnswers,
      stress_score: stressScore.toFixed(1),
      health_score: healthScore.toFixed(1),
      total_score: totalScore.toFixed(1),
      risk_level: riskLevel,
      week_start: getWeekStart(),
    };

    sb.from('weekly_checkins').insert([record]).select()
      .then(function (res) {
        if (res.error) {
          console.error('Save failed:', res.error);
          return;
        }
        var saved = res.data[0];

        // Create risk signal if not green
        if (riskLevel !== 'green') {
          sb.from('risk_signals').insert([{
            user_id: currentUser.id,
            org_code: currentUser.org_code,
            source_type: 'weekly_checkin',
            source_id: saved.id,
            risk_level: riskLevel,
            risk_categories: stressScore <= healthScore ? ['stress'] : ['health'],
            message: riskLevel === 'red'
              ? 'ストレスまたは脳の健康スコアが低い状態が検出されました。'
              : '一部のスコアが注意レベルです。',
          }]);
        }

        // Show done screen
        showScreen('screen-checkin-done');
        $('#done-icon').textContent = riskLevel === 'green' ? '\u2705' : riskLevel === 'yellow' ? '\u26a0\ufe0f' : '\u26a0\ufe0f';
        var doneMsg = 'お疲れさまでした。結果がダッシュボードに反映されました。';
        if (riskLevel !== 'green') {
          doneMsg = 'チェックインが完了しました。いくつかのスコアに注意が必要かもしれません。';
        }
        $('#done-desc').textContent = doneMsg;

        // Show referral on done screen if needed
        if (riskLevel !== 'green') {
          var cssClass = riskLevel === 'red' ? '' : ' yellow';
          var linksHtml = REFERRAL_LINKS.map(function (r) {
            return '<li>' + (r.url ? '<a href="' + r.url + '">' : '') + r.name + (r.url ? '</a>' : '') +
              '<br><span style="font-size:11px;color:#777;">' + r.desc + '</span></li>';
          }).join('');
          $('#done-referral').innerHTML =
            '<div class="referral-card' + cssClass + '">' +
              '<div class="referral-title">相談窓口</div>' +
              '<ul class="referral-links">' + linksHtml + '</ul>' +
            '</div>';
        } else {
          $('#done-referral').innerHTML = '';
        }
      });
  });

  $('#btn-done-home').addEventListener('click', showDashboard);

  // ============================================
  // SETTINGS
  // ============================================
  $('#btn-settings').addEventListener('click', function () {
    // Load current consent state
    sb.from('consents').select('*').eq('user_id', currentUser.id).eq('consent_type', 'oh_sharing')
      .then(function (res) {
        var c = (res.data || [])[0];
        if (c && c.status === 'granted') {
          var scopes = c.shared_scopes || {};
          $('#settings-oh-scores').checked = !!scopes.share_overall_scores;
          $('#settings-oh-checkins').checked = !!scopes.share_weekly_checkins;
        } else {
          $('#settings-oh-scores').checked = false;
          $('#settings-oh-checkins').checked = false;
        }
      });

    var dept = departments.find(function (d) { return d.id === currentUser.department_id; });
    $('#settings-profile').textContent = '表示名: ' + currentUser.display_name + ' / 部門: ' + (dept ? dept.name : '—');
    showScreen('screen-settings');
  });

  $('#btn-save-consent').addEventListener('click', function () {
    var ohScores = $('#settings-oh-scores').checked;
    var ohCheckins = $('#settings-oh-checkins').checked;
    var ohActive = ohScores || ohCheckins;

    var record = {
      user_id: currentUser.id,
      consent_type: 'oh_sharing',
      status: ohActive ? 'granted' : 'revoked',
      shared_scopes: { share_overall_scores: ohScores, share_weekly_checkins: ohCheckins },
    };
    if (ohActive) record.granted_at = new Date().toISOString();
    else record.revoked_at = new Date().toISOString();

    sb.from('consents').upsert([record], { onConflict: 'user_id,consent_type' })
      .then(function () {
        // Audit log
        sb.from('audit_logs').insert([{
          actor_id: currentUser.id,
          actor_role: 'employee',
          action: ohActive ? 'consent_oh_granted' : 'consent_oh_revoked',
          target_user_id: currentUser.id,
          target_resource: 'consents',
          details: record.shared_scopes,
        }]);
        alert('設定を保存しました。');
        showDashboard();
      });
  });

  $('#btn-settings-back').addEventListener('click', showDashboard);

  // ============================================
  // BOOT
  // ============================================
  init();
})();

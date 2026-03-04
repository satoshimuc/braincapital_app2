/* ================================================
   UNLOCK Sports — Trainer Dashboard
   Full visibility (detailed scores + individuals).
   Every individual view is audit-logged.
   ================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'unlock_sports_trainer_token';

  var DAILY_LABELS = {
    sleep_quality: '睡眠の質',
    fatigue: '身体の疲労',
    pain_level: '痛み/違和感',
    nutrition: '食事/水分',
    stress_mood: 'ストレス/気分',
    focus_outlook: '集中力',
    motivation: 'モチベーション',
  };

  var sb = null;
  if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' &&
      SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  var currentUser = null;
  var currentClub = null;
  var teams = [];
  var allPlayers = [];
  var todayCheckins = [];
  var allCheckins = [];
  var riskSignals = [];

  var $ = function (s) { return document.querySelector(s); };

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function signalBadgeHtml(level) {
    var labels = { green: '良好', yellow: '注意', red: '要注意' };
    if (!level || !labels[level]) return '<span class="player-noinput">未入力</span>';
    return '<span class="signal-badge signal-' + level + '"><span class="signal-dot signal-dot-' + level + '"></span>' + labels[level] + '</span>';
  }

  function getWeekStart(dateStr) {
    var d = new Date(dateStr);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().slice(0, 10);
  }

  // ============================================
  // INIT & LOGIN
  // ============================================
  function init() {
    var clubCode = getUrlParam('club');
    if (!clubCode || !sb) {
      $('#login-error').textContent = '有効なクラブURLからアクセスしてください。';
      $('#login-error').style.display = 'block';
      return;
    }

    sb.from('clubs').select('*').eq('club_code', clubCode).eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効なクラブコードです。';
          $('#login-error').style.display = 'block';
          return;
        }
        currentClub = res.data[0];
        $('#topbar-club').textContent = currentClub.club_name;

        var token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return sb.from('sports_users').select('*')
            .eq('user_token', token).eq('role', 'trainer').eq('is_active', true).limit(1)
            .then(function (res2) {
              if (res2.data && res2.data.length > 0) {
                currentUser = res2.data[0];
                afterLogin();
              }
            });
        }
      });
  }

  $('#btn-login').addEventListener('click', function () {
    var token = $('#login-token').value.trim();
    if (!token || !sb) return;
    sb.from('sports_users').select('*')
      .eq('user_token', token).eq('role', 'trainer').eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効なトークンです。トレーナー権限が必要です。';
          $('#login-error').style.display = 'block';
          return;
        }
        currentUser = res.data[0];
        localStorage.setItem(TOKEN_KEY, token);
        afterLogin();
      });
  });

  $('#btn-logout').addEventListener('click', function () {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null;
    showScreen('screen-login');
  });

  function afterLogin() {
    sb.from('sports_audit_logs').insert([{
      actor_id: currentUser.id, actor_role: 'trainer',
      action: 'trainer_dashboard_login', target_resource: 'trainer_dashboard',
      details: { club_code: currentClub.club_code },
    }]);
    showScreen('screen-triage');
    loadData();
  }

  // ============================================
  // DATA
  // ============================================
  function loadData() {
    var cc = currentClub.club_code;
    Promise.all([
      sb.from('teams').select('*').eq('club_code', cc).order('sort_order'),
      sb.from('sports_users').select('*').eq('club_code', cc).eq('role', 'player').eq('is_active', true),
      sb.from('daily_checkins').select('*').eq('club_code', cc).eq('checkin_date', todayStr()),
      sb.from('daily_checkins').select('*').eq('club_code', cc).order('checkin_date', { ascending: false }).limit(500),
      sb.from('sports_risk_signals').select('*').eq('club_code', cc).order('created_at', { ascending: false }).limit(100),
    ]).then(function (r) {
      teams = r[0].data || [];
      allPlayers = r[1].data || [];
      todayCheckins = r[2].data || [];
      allCheckins = r[3].data || [];
      riskSignals = r[4].data || [];
      populateTeamFilter();
      renderAlerts();
      renderAllPlayers();
      renderTeamTrend();
    });
  }

  function populateTeamFilter() {
    var sel = $('#filter-team');
    sel.innerHTML = '<option value="">全チーム</option>';
    teams.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.team_name;
      sel.appendChild(opt);
    });
  }

  // ============================================
  // TABS
  // ============================================
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  $('#filter-team').addEventListener('change', renderAllPlayers);

  // ============================================
  // ALERTS TAB
  // ============================================
  function renderAlerts() {
    // Summary from today's checkins
    var counts = { green: 0, yellow: 0, red: 0 };
    todayCheckins.forEach(function (c) {
      if (counts[c.signal_level] !== undefined) counts[c.signal_level]++;
    });
    $('#sum-red').textContent = counts.red;
    $('#sum-yellow').textContent = counts.yellow;
    $('#sum-green').textContent = counts.green;

    // Recent risk signals
    var recentSignals = riskSignals.filter(function (s) { return !s.resolved_at; }).slice(0, 20);
    var container = $('#alert-list');
    if (recentSignals.length === 0) {
      container.innerHTML = '';
      $('#alert-empty').style.display = '';
      return;
    }
    $('#alert-empty').style.display = 'none';

    // Map player names
    var playerMap = {};
    allPlayers.forEach(function (p) { playerMap[p.id] = p; });

    container.innerHTML = recentSignals.map(function (s) {
      var player = playerMap[s.user_id] || {};
      var date = new Date(s.created_at);
      var dateStr = (date.getMonth() + 1) + '/' + date.getDate();
      var cats = (s.risk_categories || []).join(', ');
      return '<div class="alert-row" data-user-id="' + s.user_id + '">' +
        '<div>' + signalBadgeHtml(s.risk_level) + '</div>' +
        '<div class="alert-info">' +
          '<div class="alert-name">' + (player.display_name || '—') + (player.squad_number ? ' #' + player.squad_number : '') + '</div>' +
          '<div class="alert-cats">' + (s.message || cats) + '</div>' +
        '</div>' +
        '<div class="alert-date">' + dateStr + '</div>' +
        '</div>';
    }).join('');
  }

  // ============================================
  // ALL PLAYERS TAB
  // ============================================
  function renderAllPlayers() {
    var teamId = $('#filter-team').value;
    var players = allPlayers.filter(function (p) { return !teamId || p.team_id === teamId; });

    var checkinMap = {};
    todayCheckins.forEach(function (c) { checkinMap[c.user_id] = c; });

    var order = { red: 0, yellow: 1, green: 2 };
    var sorted = players.map(function (p) {
      return { player: p, checkin: checkinMap[p.id] || null };
    }).sort(function (a, b) {
      var aOrd = a.checkin ? (order[a.checkin.signal_level] || 3) : 4;
      var bOrd = b.checkin ? (order[b.checkin.signal_level] || 3) : 4;
      return aOrd - bOrd;
    });

    var container = $('#all-player-list');
    container.innerHTML = sorted.map(function (item) {
      var p = item.player;
      var c = item.checkin;
      var numStr = p.squad_number ? '#' + p.squad_number : '';
      var scoreStr = c ? 'B:' + Number(c.body_readiness).toFixed(1) + ' / Br:' + Number(c.brain_readiness).toFixed(1) : '';

      return '<div class="player-row" data-user-id="' + p.id + '">' +
        '<div class="player-number">' + numStr + '</div>' +
        '<div class="player-name">' + p.display_name + ' <span style="font-size:11px;color:var(--gray-400);">' + (p.position || '') + '</span></div>' +
        '<div class="player-oneword" style="font-family:var(--font-mono);font-size:11px;">' + scoreStr + '</div>' +
        '<div class="player-signal">' + signalBadgeHtml(c ? c.signal_level : null) + '</div>' +
        '</div>';
    }).join('');
  }

  // ============================================
  // INDIVIDUAL DETAIL
  // ============================================
  document.addEventListener('click', function (e) {
    var row = e.target.closest('.alert-row, .player-row');
    if (!row) return;
    var userId = row.getAttribute('data-user-id');
    if (!userId) return;
    showIndividual(userId);
  });

  $('#btn-back-list').addEventListener('click', function () {
    $('#btn-back-list').style.display = 'none';
    showScreen('screen-triage');
  });

  function showIndividual(userId) {
    // Audit log
    sb.from('sports_audit_logs').insert([{
      actor_id: currentUser.id, actor_role: 'trainer',
      action: 'view_individual_data', target_user_id: userId,
      target_resource: 'sports_individual_detail',
      details: { club_code: currentClub.club_code },
    }]);

    var player = allPlayers.find(function (p) { return p.id === userId; });
    if (!player) return;

    var team = teams.find(function (t) { return t.id === player.team_id; });
    $('#ind-name').textContent = player.display_name + (player.squad_number ? ' #' + player.squad_number : '');
    $('#ind-meta').textContent = (player.position || '') + (team ? ' / ' + team.team_name : '');

    $('#btn-back-list').style.display = '';
    showScreen('screen-individual');

    Promise.all([
      sb.from('daily_checkins').select('*').eq('user_id', userId).order('checkin_date', { ascending: false }).limit(28),
      sb.from('sports_risk_signals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]).then(function (results) {
      var checkins = (results[0].data || []).reverse();
      var signals = results[1].data || [];

      renderIndScores(checkins);
      renderIndTrend(checkins);
      renderIndRiskHistory(signals);
    });
  }

  function renderIndScores(checkins) {
    if (checkins.length === 0) {
      $('#ind-body').textContent = '—';
      $('#ind-brain').textContent = '—';
      $('#ind-signal').innerHTML = '';
      $('#ind-detail-scores').innerHTML = '<div class="loading">チェックインデータがありません</div>';
      return;
    }

    var latest = checkins[checkins.length - 1];
    $('#ind-body').textContent = Number(latest.body_readiness).toFixed(1);
    $('#ind-brain').textContent = Number(latest.brain_readiness).toFixed(1);
    $('#ind-signal').innerHTML = signalBadgeHtml(latest.signal_level);

    // Detailed scores
    var fields = ['sleep_quality', 'fatigue', 'pain_level', 'nutrition', 'stress_mood', 'focus_outlook', 'motivation'];
    var html = '<div style="font-size:11px;color:var(--gray-400);margin-bottom:8px;">' + latest.checkin_date + '</div>';
    fields.forEach(function (f) {
      var val = latest[f];
      if (val === null || val === undefined) return;
      var cls = val <= 2 ? 'low' : val <= 3 ? 'mid' : 'high';
      var pct = ((val - 1) / 4 * 100).toFixed(0);
      var color = val <= 2 ? 'var(--red)' : val <= 3 ? 'var(--yellow)' : 'var(--green)';
      html += '<div class="detail-score-row">' +
        '<div class="detail-score-label">' + (DAILY_LABELS[f] || f) + '</div>' +
        '<div class="detail-score-bar"><div class="detail-score-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
        '<div class="detail-score-value ' + cls + '">' + val + '</div>' +
        '</div>';
    });

    if (latest.one_word) {
      html += '<div style="margin-top:12px;padding:10px;background:var(--gray-50);border-radius:var(--radius-md);font-size:13px;color:var(--gray-700);">「' + latest.one_word + '」</div>';
    }

    $('#ind-detail-scores').innerHTML = html;
  }

  function renderIndTrend(data) {
    var svg = $('#ind-trend-chart');
    if (data.length === 0) {
      svg.innerHTML = '<text x="350" y="100" text-anchor="middle" fill="#999" font-size="14">データがありません</text>';
      return;
    }

    var w = 700, h = 200, pad = 40;
    var n = data.length;
    var html = '';

    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    var bodyPts = [], brainPts = [];
    data.forEach(function (c, i) {
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      bodyPts.push({ x: x, y: h - pad - ((Number(c.body_readiness) - 1) / 4) * (h - 2 * pad) });
      brainPts.push({ x: x, y: h - pad - ((Number(c.brain_readiness) - 1) / 4) * (h - 2 * pad) });

      if (i % Math.max(1, Math.floor(n / 7)) === 0 || i === n - 1) {
        var parts = c.checkin_date.split('-');
        html += '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
      }
    });

    if (bodyPts.length > 1) html += '<path d="M' + bodyPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#1a73e8" stroke-width="2" opacity="0.8"/>';
    bodyPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#1a73e8"/>'; });
    if (brainPts.length > 1) html += '<path d="M' + brainPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#0a8f3c" stroke-width="2" opacity="0.8"/>';
    brainPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#0a8f3c"/>'; });

    svg.innerHTML = html;
  }

  function renderIndRiskHistory(signals) {
    var container = $('#ind-risk-history');
    if (signals.length === 0) {
      container.innerHTML = '<div class="loading">リスク履歴はありません</div>';
      return;
    }
    container.innerHTML = signals.map(function (s) {
      var date = new Date(s.created_at);
      var dateStr = (date.getMonth() + 1) + '/' + date.getDate();
      return '<div class="risk-row">' +
        '<div class="risk-date">' + dateStr + '</div>' +
        '<div>' + signalBadgeHtml(s.risk_level) + '</div>' +
        '<div class="risk-msg">' + (s.message || '') + '</div>' +
        '</div>';
    }).join('');
  }

  // ============================================
  // TEAM TREND
  // ============================================
  function renderTeamTrend() {
    var svg = $('#team-trend-chart');
    if (allCheckins.length === 0) {
      svg.innerHTML = '<text x="350" y="100" text-anchor="middle" fill="#999" font-size="14">データがありません</text>';
      return;
    }

    var weeks = {};
    allCheckins.forEach(function (c) {
      var wk = getWeekStart(c.checkin_date);
      if (!weeks[wk]) weeks[wk] = [];
      weeks[wk].push(c);
    });

    var sortedWeeks = Object.keys(weeks).sort().slice(-8);
    var w = 700, h = 200, pad = 40;
    var n = sortedWeeks.length;
    var html = '';

    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    var bodyPts = [], brainPts = [];
    sortedWeeks.forEach(function (wk, i) {
      var records = weeks[wk];
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      var bodyAvg = records.reduce(function (s, r) { return s + Number(r.body_readiness); }, 0) / records.length;
      var brainAvg = records.reduce(function (s, r) { return s + Number(r.brain_readiness); }, 0) / records.length;
      bodyPts.push({ x: x, y: h - pad - ((bodyAvg - 1) / 4) * (h - 2 * pad) });
      brainPts.push({ x: x, y: h - pad - ((brainAvg - 1) / 4) * (h - 2 * pad) });
      var parts = wk.split('-');
      html += '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
    });

    if (bodyPts.length > 1) html += '<path d="M' + bodyPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#1a73e8" stroke-width="2" opacity="0.8"/>';
    bodyPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#1a73e8"/>'; });
    if (brainPts.length > 1) html += '<path d="M' + brainPts.map(function (p) { return p.x + ',' + p.y; }).join(' L') + '" fill="none" stroke="#0a8f3c" stroke-width="2" opacity="0.8"/>';
    brainPts.forEach(function (p) { html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="#0a8f3c"/>'; });

    svg.innerHTML = html;
  }

  // ============================================
  // BOOT
  // ============================================
  init();
})();

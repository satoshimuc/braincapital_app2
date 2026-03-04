/* ================================================
   UNLOCK Sports — Coach Dashboard
   Limited visibility: signal level + one-word only.
   No detailed scores visible.
   ================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'unlock_sports_coach_token';

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
  var allMatches = [];
  var allMenus = [];

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
            .eq('user_token', token).eq('role', 'coach').eq('is_active', true).limit(1)
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
      .eq('user_token', token).eq('role', 'coach').eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効なトークンです。コーチ権限が必要です。';
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
      actor_id: currentUser.id, actor_role: 'coach',
      action: 'coach_dashboard_login', target_resource: 'coach_dashboard',
      details: { club_code: currentClub.club_code },
    }]);
    showScreen('screen-dashboard');
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
      sb.from('daily_checkins').select('club_code,team_id,checkin_date,body_readiness,brain_readiness,total_readiness,signal_level').eq('club_code', cc).order('checkin_date', { ascending: false }).limit(500),
      sb.from('matches').select('*').eq('club_code', cc).order('match_date', { ascending: false }).limit(20),
      sb.from('training_menus').select('*').eq('is_active', true),
    ]).then(function (r) {
      teams = r[0].data || [];
      allPlayers = r[1].data || [];
      todayCheckins = r[2].data || [];
      allCheckins = r[3].data || [];
      allMatches = r[4].data || [];
      allMenus = r[5].data || [];
      populateTeamFilter();
      populateMatchSelect();
      renderToday();
      renderTeamTrend();
      renderDrillSuggestions();
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

  function populateMatchSelect() {
    var sel = $('#match-select');
    sel.innerHTML = '<option value="">選択してください</option>';
    allMatches.forEach(function (m) {
      var opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.match_date + ' ' + (m.is_home ? 'HOME' : 'AWAY') + ' vs ' + m.opponent;
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

  $('#filter-team').addEventListener('change', renderToday);

  // ============================================
  // TODAY TAB
  // ============================================
  function renderToday() {
    var teamId = $('#filter-team').value;

    // Filter players and checkins by team
    var players = allPlayers.filter(function (p) { return !teamId || p.team_id === teamId; });
    var checkins = todayCheckins.filter(function (c) { return !teamId || c.team_id === teamId; });

    // Build checkin map by user_id
    var checkinMap = {};
    checkins.forEach(function (c) { checkinMap[c.user_id] = c; });

    // Count signals
    var counts = { green: 0, yellow: 0, red: 0 };
    var redCount = 0;
    checkins.forEach(function (c) {
      if (counts[c.signal_level] !== undefined) counts[c.signal_level]++;
      if (c.signal_level === 'red') redCount++;
    });
    $('#sum-red').textContent = counts.red;
    $('#sum-yellow').textContent = counts.yellow;
    $('#sum-green').textContent = counts.green;

    // Input rate
    var rate = players.length > 0 ? Math.round(checkins.length / players.length * 100) : 0;
    $('#meta-input-rate').textContent = '入力率: ' + rate + '% (' + checkins.length + '/' + players.length + ')';

    // Red notice (anonymous count for coach)
    if (redCount > 0) {
      $('#meta-red-notice').textContent = '要注意: ' + redCount + '名 （詳細はトレーナーに確認）';
    } else {
      $('#meta-red-notice').textContent = '';
    }

    // Player list — coach sees signal + one-word only (no scores)
    var container = $('#player-list');
    if (players.length === 0) {
      container.innerHTML = '';
      $('#player-empty').style.display = '';
      return;
    }
    $('#player-empty').style.display = 'none';

    // Sort: shared+checked-in first, then by signal (red > yellow > green > none)
    var order = { red: 0, yellow: 1, green: 2 };
    var sorted = players.map(function (p) {
      var c = checkinMap[p.id];
      var isShared = p.share_with_coach;
      return { player: p, checkin: c, isShared: isShared };
    }).sort(function (a, b) {
      // Has checkin and shared first
      var aHas = a.checkin && a.isShared ? 0 : a.checkin ? 1 : 2;
      var bHas = b.checkin && b.isShared ? 0 : b.checkin ? 1 : 2;
      if (aHas !== bHas) return aHas - bHas;
      // Then by signal
      var aOrd = a.checkin ? (order[a.checkin.signal_level] || 3) : 4;
      var bOrd = b.checkin ? (order[b.checkin.signal_level] || 3) : 4;
      return aOrd - bOrd;
    });

    container.innerHTML = sorted.map(function (item) {
      var p = item.player;
      var c = item.checkin;
      var numStr = p.squad_number ? '#' + p.squad_number : '';
      var posStr = p.position ? p.position : '';

      var signalHtml, oneWord;
      if (!c) {
        signalHtml = '<span class="player-noinput">未入力</span>';
        oneWord = '';
      } else if (!item.isShared) {
        // Player hasn't shared with coach — show generic
        signalHtml = '<span style="font-size:11px;color:var(--gray-300);">入力済み</span>';
        oneWord = '';
      } else {
        signalHtml = signalBadgeHtml(c.signal_level);
        oneWord = c.one_word || '';
      }

      return '<div class="player-row">' +
        '<div class="player-number">' + numStr + '</div>' +
        '<div class="player-name">' + p.display_name + ' <span style="font-size:11px;color:var(--gray-400);">' + posStr + '</span></div>' +
        '<div class="player-oneword">' + oneWord + '</div>' +
        '<div class="player-signal">' + signalHtml + '</div>' +
        '</div>';
    }).join('');
  }

  // ============================================
  // TEAM TREND TAB
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

  function getWeekStart(dateStr) {
    var d = new Date(dateStr);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().slice(0, 10);
  }

  // ============================================
  // MATCH TAB
  // ============================================
  $('#match-select').addEventListener('change', function () {
    var matchId = this.value;
    if (!matchId) { $('#match-summary').innerHTML = ''; return; }
    renderMatchSummary(matchId);
  });

  function renderMatchSummary(matchId) {
    sb.from('match_reports').select('*').eq('match_id', matchId)
      .then(function (res) {
        var reports = res.data || [];
        var container = $('#match-summary');
        if (reports.length === 0) {
          container.innerHTML = '<div class="loading">レポートがありません</div>';
          return;
        }

        var avgRPE = (reports.reduce(function (s, r) { return s + (r.rpe || 0); }, 0) / reports.length).toFixed(1);
        var avgDecision = (reports.reduce(function (s, r) { return s + (r.decision_sharpness || 0); }, 0) / reports.length).toFixed(1);
        var avgFocus = (reports.reduce(function (s, r) { return s + (r.focus_sustained || 0); }, 0) / reports.length).toFixed(1);

        // RPE distribution
        var rpeDist = {};
        for (var i = 1; i <= 10; i++) rpeDist[i] = 0;
        reports.forEach(function (r) { if (r.rpe) rpeDist[r.rpe]++; });
        var maxRpe = Math.max.apply(null, Object.values(rpeDist));
        if (maxRpe === 0) maxRpe = 1;

        var barsHtml = '';
        var labelsHtml = '';
        for (var j = 1; j <= 10; j++) {
          var pct = (rpeDist[j] / maxRpe * 100);
          barsHtml += '<div class="rpe-bar" style="height:' + pct + '%;background:' + (j >= 8 ? 'var(--red)' : j >= 5 ? 'var(--yellow)' : 'var(--green)') + ';"></div>';
          labelsHtml += '<span>' + j + '</span>';
        }

        container.innerHTML =
          '<div class="match-stat-grid">' +
            '<div class="match-stat-card"><div class="match-stat-value">' + avgRPE + '</div><div class="match-stat-label">平均RPE</div></div>' +
            '<div class="match-stat-card"><div class="match-stat-value">' + avgDecision + '</div><div class="match-stat-label">判断の鋭さ</div></div>' +
            '<div class="match-stat-card"><div class="match-stat-value">' + avgFocus + '</div><div class="match-stat-label">集中持続</div></div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-title">RPE分布（' + reports.length + '名回答）</div>' +
            '<div class="rpe-dist">' + barsHtml + '</div>' +
            '<div class="rpe-bar-labels">' + labelsHtml + '</div>' +
          '</div>';
      });
  }

  // ============================================
  // DRILL SUGGESTIONS TAB
  // ============================================
  function renderDrillSuggestions() {
    var container = $('#drill-suggestions');
    if (allMenus.length === 0 || todayCheckins.length === 0) {
      container.innerHTML = '<div class="loading">チェックインデータまたはメニューがありません</div>';
      return;
    }

    // Team-wide tags based on averages
    var tags = [];
    var avgFocus = todayCheckins.reduce(function (s, c) { return s + (c.focus_outlook || 3); }, 0) / todayCheckins.length;
    var avgMotivation = todayCheckins.reduce(function (s, c) { return s + (c.motivation || 3); }, 0) / todayCheckins.length;
    var avgFatigue = todayCheckins.reduce(function (s, c) { return s + (c.fatigue || 3); }, 0) / todayCheckins.length;
    var avgStress = todayCheckins.reduce(function (s, c) { return s + (c.stress_mood || 3); }, 0) / todayCheckins.length;

    if (avgFocus < 3.5) tags.push('low_focus');
    if (avgMotivation < 3.5) tags.push('low_motivation');
    if (avgFatigue < 3.0) tags.push('high_fatigue');
    if (avgStress < 3.0) tags.push('high_stress');
    if (tags.length === 0) tags.push('low_focus');

    var scored = allMenus.map(function (m) {
      var overlap = (m.target_tags || []).filter(function (t) { return tags.indexOf(t) !== -1; }).length;
      return { menu: m, score: overlap };
    }).filter(function (m) { return m.score > 0; });

    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.slice(0, 3);

    if (top.length === 0) {
      container.innerHTML = '<div class="loading">該当するメニューがありません</div>';
      return;
    }

    container.innerHTML = top.map(function (item) {
      var m = item.menu;
      var intClass = 'intensity-' + m.intensity;
      var intLabel = { low: 'Low', medium: 'Mid', high: 'High' }[m.intensity] || 'Mid';
      return '<div class="menu-card">' +
        '<div class="menu-card-title">' + m.title + '</div>' +
        '<div class="menu-card-meta">' +
          '<span class="intensity-badge ' + intClass + '">' + intLabel + '</span>' +
          '<span>' + (m.duration_min || 10) + '分</span>' +
        '</div>' +
        '<div class="menu-card-desc">' + (m.description || '') + '</div>' +
        (m.video_url ? '<a href="' + m.video_url + '" target="_blank" class="menu-card-video">動画を見る →</a>' : '') +
        '</div>';
    }).join('');
  }

  // ============================================
  // BOOT
  // ============================================
  init();
})();

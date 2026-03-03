/* ================================================
   UNLOCK Corporate Wellness — Occupational Health Dashboard
   Individual data is ONLY visible for consented employees.
   Every view of individual data is audit-logged.
   ================================================ */
(function () {
  'use strict';

  var TOKEN_KEY = 'unlock_corp_oh_token';

  var WEEKLY_QUESTIONS = [
    { id: 'W01', cat: 'stress', text: '今週、仕事上のストレスをうまく処理できていると感じた' },
    { id: 'W02', cat: 'stress', text: '気持ちに余裕を持って過ごせた' },
    { id: 'W03', cat: 'health', text: '十分な睡眠が取れ、朝すっきり起きられた' },
    { id: 'W04', cat: 'health', text: '集中力を必要な時に発揮できた' },
    { id: 'W05', cat: 'health', text: '心身にエネルギーがあり、活動的に過ごせた' },
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
  var currentUser = null;
  var currentOrg = null;
  var departments = [];
  var consentedUsers = [];  // users who gave oh_sharing consent
  var triageData = [];      // enriched triage list

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

  function riskBadgeHtml(level) {
    var labels = { green: '良好', yellow: '注意', red: '要注意' };
    return '<span class="risk-badge risk-' + level + '"><span class="risk-dot risk-dot-' + level + '"></span>' + (labels[level] || '—') + '</span>';
  }

  // ============================================
  // INIT
  // ============================================
  function init() {
    var orgCode = getUrlParam('org');
    if (!orgCode || !sb) {
      $('#login-error').textContent = '有効な組織URLからアクセスしてください。';
      $('#login-error').style.display = 'block';
      return;
    }

    sb.from('organizations').select('*').eq('org_code', orgCode).eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効な組織コードです。';
          $('#login-error').style.display = 'block';
          return;
        }
        currentOrg = res.data[0];
        $('#topbar-org').textContent = currentOrg.org_name;

        // Check saved token
        var token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          return sb.from('corp_users').select('*')
            .eq('user_token', token).eq('role', 'occupational_health').eq('is_active', true).limit(1)
            .then(function (res2) {
              if (res2.data && res2.data.length > 0) {
                currentUser = res2.data[0];
                afterLogin();
              }
            });
        }
      });
  }

  // ============================================
  // LOGIN
  // ============================================
  $('#btn-login').addEventListener('click', function () {
    var token = $('#login-token').value.trim();
    if (!token || !sb) return;

    sb.from('corp_users').select('*')
      .eq('user_token', token).eq('role', 'occupational_health').eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効なトークンです。産業保健スタッフ権限が必要です。';
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
    // Audit log
    sb.from('audit_logs').insert([{
      actor_id: currentUser.id,
      actor_role: 'occupational_health',
      action: 'oh_dashboard_login',
      target_resource: 'oh_dashboard',
      details: { org_code: currentOrg.org_code },
    }]);

    showScreen('screen-triage');
    loadTriageData();
  }

  // ============================================
  // DATA LOADING
  // ============================================
  function loadTriageData() {
    var orgCode = currentOrg.org_code;

    Promise.all([
      sb.from('departments').select('*').eq('org_code', orgCode).order('sort_order'),
      // Get users who have granted oh_sharing consent
      sb.from('consents').select('user_id,shared_scopes').eq('consent_type', 'oh_sharing').eq('status', 'granted'),
      sb.from('corp_users').select('*').eq('org_code', orgCode).eq('role', 'employee').eq('is_active', true),
    ]).then(function (results) {
      departments = results[0].data || [];
      var consents = results[1].data || [];
      var allUsers = results[2].data || [];

      // Build set of consented user IDs
      var consentedIds = {};
      consents.forEach(function (c) { consentedIds[c.user_id] = c.shared_scopes || {}; });

      // Filter to only consented users in this org
      consentedUsers = allUsers.filter(function (u) { return consentedIds[u.id]; });
      consentedUsers.forEach(function (u) { u._scopes = consentedIds[u.id]; });

      if (consentedUsers.length === 0) {
        renderTriageList();
        return;
      }

      // Load latest checkin for each consented user
      var userIds = consentedUsers.map(function (u) { return u.id; });
      sb.from('weekly_checkins').select('*').in('user_id', userIds)
        .order('week_start', { ascending: false })
        .then(function (res) {
          var checkins = res.data || [];
          // Group by user - take latest
          var latestByUser = {};
          checkins.forEach(function (c) {
            if (!latestByUser[c.user_id]) latestByUser[c.user_id] = c;
          });

          // Build triage data
          triageData = consentedUsers.map(function (u) {
            var dept = departments.find(function (d) { return d.id === u.department_id; });
            var latest = latestByUser[u.id];
            return {
              user: u,
              department: dept,
              latest: latest || null,
              riskLevel: latest ? latest.risk_level : 'unknown',
            };
          });

          // Sort: red first, then yellow, then green, then unknown
          var order = { red: 0, yellow: 1, green: 2, unknown: 3 };
          triageData.sort(function (a, b) {
            return (order[a.riskLevel] || 3) - (order[b.riskLevel] || 3);
          });

          populateDepartmentFilter();
          renderTriageList();
        });
    });
  }

  function populateDepartmentFilter() {
    var sel = $('#filter-dept');
    sel.innerHTML = '<option value="">全部門</option>';
    departments.forEach(function (d) {
      var opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  }

  // ============================================
  // FILTERS
  // ============================================
  $('#filter-risk').addEventListener('change', renderTriageList);
  $('#filter-dept').addEventListener('change', renderTriageList);

  function getFilteredTriage() {
    var risk = $('#filter-risk').value;
    var dept = $('#filter-dept').value;

    return triageData.filter(function (t) {
      if (risk && t.riskLevel !== risk) return false;
      if (dept && (!t.user.department_id || t.user.department_id !== dept)) return false;
      return true;
    });
  }

  // ============================================
  // TRIAGE LIST
  // ============================================
  function renderTriageList() {
    var filtered = getFilteredTriage();

    // Summary counts
    var counts = { red: 0, yellow: 0, green: 0 };
    triageData.forEach(function (t) {
      if (counts[t.riskLevel] !== undefined) counts[t.riskLevel]++;
    });
    $('#sum-red').textContent = counts.red;
    $('#sum-yellow').textContent = counts.yellow;
    $('#sum-green').textContent = counts.green;
    $('#sum-consented').textContent = triageData.length;

    var tbody = $('#triage-table-body');
    if (filtered.length === 0) {
      tbody.innerHTML = '';
      $('#triage-empty').style.display = '';
      return;
    }
    $('#triage-empty').style.display = 'none';

    var rows = '';
    filtered.forEach(function (t) {
      var latest = t.latest;
      var dateStr = latest ? latest.week_start : '—';

      rows += '<tr>' +
        '<td>' + riskBadgeHtml(t.riskLevel) + '</td>' +
        '<td>' + t.user.display_name + '</td>' +
        '<td>' + (t.department ? t.department.name : '—') + '</td>' +
        '<td class="num">' + (latest ? Number(latest.total_score).toFixed(1) : '—') + '</td>' +
        '<td class="num">' + (latest ? Number(latest.stress_score).toFixed(1) : '—') + '</td>' +
        '<td class="num">' + (latest ? Number(latest.health_score).toFixed(1) : '—') + '</td>' +
        '<td>' + dateStr + '</td>' +
        '<td><button class="btn-detail" data-user-id="' + t.user.id + '">詳細</button></td>' +
        '</tr>';
    });

    tbody.innerHTML = rows;
  }

  // ============================================
  // INDIVIDUAL DETAIL
  // ============================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.btn-detail');
    if (!btn) return;
    var userId = btn.getAttribute('data-user-id');
    showIndividual(userId);
  });

  $('#btn-back-list').addEventListener('click', function () {
    $('#btn-back-list').style.display = 'none';
    showScreen('screen-triage');
  });

  function showIndividual(userId) {
    // Audit log: record that OH staff viewed individual data
    sb.from('audit_logs').insert([{
      actor_id: currentUser.id,
      actor_role: 'occupational_health',
      action: 'view_individual_data',
      target_user_id: userId,
      target_resource: 'oh_individual_detail',
      details: { org_code: currentOrg.org_code },
    }]);

    var triageEntry = triageData.find(function (t) { return t.user.id === userId; });
    if (!triageEntry) return;

    var user = triageEntry.user;
    var dept = triageEntry.department;

    $('#ind-name').textContent = user.display_name;
    $('#ind-dept').textContent = dept ? dept.name : '—';

    $('#btn-back-list').style.display = '';
    showScreen('screen-individual');

    // Load data for this individual
    Promise.all([
      sb.from('weekly_checkins').select('*').eq('user_id', userId).order('week_start', { ascending: false }).limit(8),
      sb.from('risk_signals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]).then(function (results) {
      var checkins = (results[0].data || []).reverse();
      var riskSignals = results[1].data || [];

      renderIndividualScores(checkins);
      renderIndividualTrend(checkins);
      renderCheckinDetail(checkins);
      renderRiskHistory(riskSignals);
    });
  }

  function renderIndividualScores(checkins) {
    if (checkins.length === 0) {
      $('#ind-total').textContent = '—';
      $('#ind-stress').textContent = '—';
      $('#ind-health').textContent = '—';
      $('#ind-risk-badge').innerHTML = '';
      return;
    }

    var latest = checkins[checkins.length - 1];
    $('#ind-total').textContent = Number(latest.total_score).toFixed(1);
    $('#ind-stress').textContent = Number(latest.stress_score).toFixed(1);
    $('#ind-health').textContent = Number(latest.health_score).toFixed(1);
    $('#ind-risk-badge').innerHTML = riskBadgeHtml(latest.risk_level);
  }

  // ============================================
  // INDIVIDUAL TREND CHART
  // ============================================
  function renderIndividualTrend(data) {
    var svg = $('#ind-trend-chart');
    if (data.length === 0) {
      svg.innerHTML = '<text x="350" y="100" text-anchor="middle" fill="#999" font-size="14">データがありません</text>';
      return;
    }

    var w = 700, h = 200, pad = 40;
    var n = data.length;
    var html = '';

    // Grid
    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee" stroke-width="1"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    var series = { total: [], stress: [], health: [] };
    data.forEach(function (c, i) {
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      var total = Number(c.total_score);
      var stress = Number(c.stress_score);
      var health = Number(c.health_score);

      series.total.push({ x: x, y: h - pad - ((total - 1) / 4) * (h - 2 * pad) });
      series.stress.push({ x: x, y: h - pad - ((stress - 1) / 4) * (h - 2 * pad) });
      series.health.push({ x: x, y: h - pad - ((health - 1) / 4) * (h - 2 * pad) });

      var parts = c.week_start.split('-');
      html += '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
    });

    var colors = { total: '#222', stress: '#c00', health: '#0a8f3c' };
    ['total', 'stress', 'health'].forEach(function (key) {
      if (series[key].length > 1) {
        var pathD = 'M' + series[key].map(function (p) { return p.x + ',' + p.y; }).join(' L');
        html += '<path d="' + pathD + '" fill="none" stroke="' + colors[key] + '" stroke-width="2" opacity="0.8"/>';
      }
      series[key].forEach(function (p) {
        html += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + colors[key] + '"/>';
      });
    });

    svg.innerHTML = html;
  }

  // ============================================
  // CHECKIN DETAIL
  // ============================================
  function renderCheckinDetail(checkins) {
    var container = $('#ind-checkin-detail');
    if (checkins.length === 0) {
      container.innerHTML = '<div class="loading">チェックインデータがありません</div>';
      return;
    }

    var latest = checkins[checkins.length - 1];
    var answers = latest.answers || {};

    var html = '<div style="font-size:12px;color:var(--gray-400);margin-bottom:12px;">Week: ' + latest.week_start + '</div>';
    WEEKLY_QUESTIONS.forEach(function (q) {
      var score = answers[q.id];
      var scoreClass = '';
      if (score !== undefined) {
        if (score <= 2) scoreClass = 'low';
        else if (score <= 3) scoreClass = 'mid';
        else scoreClass = 'high';
      }

      html += '<div class="checkin-detail-row">' +
        '<div class="checkin-q-text">' + q.text + '</div>' +
        '<div class="checkin-q-score ' + scoreClass + '">' + (score !== undefined ? score : '—') + '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // RISK HISTORY
  // ============================================
  function renderRiskHistory(signals) {
    var container = $('#ind-risk-history');
    if (signals.length === 0) {
      container.innerHTML = '<div class="loading">リスクシグナル履歴がありません</div>';
      return;
    }

    var html = '';
    signals.forEach(function (s) {
      var date = new Date(s.created_at);
      var dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });

      html += '<div class="risk-history-row">' +
        '<div class="risk-history-date">' + dateStr + '</div>' +
        '<div>' +
          riskBadgeHtml(s.risk_level) +
          '<div class="risk-history-msg">' + (s.message || '') + '</div>' +
          (s.resolved_at ? '<div class="risk-history-resolved">解決済み</div>' : '') +
        '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // BOOT
  // ============================================
  init();
})();

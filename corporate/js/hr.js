/* ================================================
   UNLOCK Corporate Wellness — HR Dashboard
   Department-level anonymous aggregation only.
   No individual data is accessible from this view.
   ================================================ */
(function () {
  'use strict';

  var K_ANONYMITY = 10; // minimum respondents per department to show data
  var TOKEN_KEY = 'unlock_corp_hr_token';

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
  var allCheckins = [];
  var allUsers = [];

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

  function getWeekStart(weeksAgo) {
    var d = new Date();
    d.setDate(d.getDate() - (weeksAgo || 0) * 7);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1);
    var mon = new Date(d.setDate(diff));
    return mon.toISOString().slice(0, 10);
  }

  // ============================================
  // POLICY TEMPLATES
  // ============================================
  var POLICIES = [
    {
      id: 'high_stress',
      title: '高ストレス対策パッケージ',
      trigger: 'ストレススコアの組織平均が3.0以下の場合',
      check: function (avg) { return avg.stress <= 3.0; },
      body: '<ul>' +
        '<li>管理職向け1on1ミーティングの質向上研修（月1回）</li>' +
        '<li>ノー残業デーの導入または強化（週1回）</li>' +
        '<li>外部EAP（従業員支援プログラム）の周知と利用促進</li>' +
        '<li>チーム単位のワークロード見直しミーティング</li>' +
        '</ul>'
    },
    {
      id: 'low_health',
      title: '脳の健康改善プログラム',
      trigger: '健康スコアの組織平均が3.0以下の場合',
      check: function (avg) { return avg.health <= 3.0; },
      body: '<ul>' +
        '<li>睡眠衛生ワークショップの開催（四半期に1回）</li>' +
        '<li>オフィス環境改善（照明・換気・休憩スペース）</li>' +
        '<li>ウォーキングミーティングの推奨</li>' +
        '<li>社内運動チャレンジ（歩数・瞑想等）の実施</li>' +
        '</ul>'
    },
    {
      id: 'general_wellness',
      title: '総合ウェルネス施策',
      trigger: '総合スコアが3.5以下の場合',
      check: function (avg) { return avg.total <= 3.5; },
      body: '<ul>' +
        '<li>経営層によるウェルネス方針の明文化と発信</li>' +
        '<li>健康経営優良法人認定に向けた取り組み強化</li>' +
        '<li>部門別の課題共有ミーティング（匿名集計結果ベース）</li>' +
        '<li>従業員サーベイとアクションプランのPDCAサイクル構築</li>' +
        '</ul>'
    },
    {
      id: 'maintenance',
      title: '好状態維持プログラム',
      trigger: '全スコアが3.5超の場合',
      check: function (avg) { return avg.total > 3.5 && avg.stress > 3.0 && avg.health > 3.0; },
      body: '<ul>' +
        '<li>現在の取り組みを継続し、好事例を社内共有</li>' +
        '<li>ピアサポート制度の導入検討</li>' +
        '<li>予防的なメンタルヘルス研修の定期開催</li>' +
        '<li>チーム対抗ウェルネスイベントの企画</li>' +
        '</ul>'
    }
  ];

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
            .eq('user_token', token).eq('role', 'hr_admin').eq('is_active', true).limit(1)
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
      .eq('user_token', token).eq('role', 'hr_admin').eq('is_active', true).limit(1)
      .then(function (res) {
        if (!res.data || res.data.length === 0) {
          $('#login-error').textContent = '無効なトークンです。HR管理者権限が必要です。';
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
      actor_role: 'hr_admin',
      action: 'hr_dashboard_login',
      target_resource: 'hr_dashboard',
      details: { org_code: currentOrg.org_code },
    }]);

    showScreen('screen-dashboard');
    loadData();
  }

  // ============================================
  // DATA LOADING
  // ============================================
  function loadData() {
    var orgCode = currentOrg.org_code;

    Promise.all([
      sb.from('departments').select('*').eq('org_code', orgCode).order('sort_order'),
      sb.from('corp_users').select('id,department_id').eq('org_code', orgCode).eq('role', 'employee').eq('is_active', true),
      sb.from('weekly_checkins').select('*').eq('org_code', orgCode).order('week_start', { ascending: false }),
    ]).then(function (results) {
      departments = results[0].data || [];
      allUsers = results[1].data || [];
      allCheckins = results[2].data || [];

      populateDepartments();
      renderDashboard();
    });
  }

  function populateDepartments() {
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
  $('#filter-dept').addEventListener('change', renderDashboard);
  $('#filter-period').addEventListener('change', renderDashboard);

  function getFilteredCheckins() {
    var weeks = parseInt($('#filter-period').value, 10) || 8;
    var deptId = $('#filter-dept').value;
    var cutoff = getWeekStart(weeks);

    return allCheckins.filter(function (c) {
      if (c.week_start < cutoff) return false;
      if (deptId && c.department_id !== deptId) return false;
      return true;
    });
  }

  // ============================================
  // RENDER
  // ============================================
  function renderDashboard() {
    var filtered = getFilteredCheckins();
    renderSummary(filtered);
    renderOrgTrend(filtered);
    renderDeptTable(filtered);
    renderDistribution(filtered);
    renderRiskSummary(filtered);
    renderPolicies(filtered);
  }

  function renderSummary(data) {
    // Unique respondents
    var respondents = {};
    data.forEach(function (c) { respondents[c.user_id] = true; });
    $('#sum-respondents').textContent = Object.keys(respondents).length;

    // Average score
    if (data.length > 0) {
      var sum = data.reduce(function (s, c) { return s + Number(c.total_score); }, 0);
      $('#sum-avg-score').textContent = (sum / data.length).toFixed(1);
    } else {
      $('#sum-avg-score').textContent = '—';
    }

    // Signals (yellow + red)
    var signals = data.filter(function (c) { return c.risk_level !== 'green'; }).length;
    $('#sum-signals').textContent = signals;

    // Response rate (unique respondents in latest week / total users)
    var deptId = $('#filter-dept').value;
    var deptUsers = allUsers.filter(function (u) { return !deptId || u.department_id === deptId; });
    if (data.length > 0 && deptUsers.length > 0) {
      var latestWeek = data[0].week_start;
      var latestRespondents = {};
      data.forEach(function (c) {
        if (c.week_start === latestWeek) latestRespondents[c.user_id] = true;
      });
      var rate = (Object.keys(latestRespondents).length / deptUsers.length * 100);
      $('#sum-response-rate').textContent = Math.round(rate) + '%';
    } else {
      $('#sum-response-rate').textContent = '—';
    }
  }

  // ============================================
  // ORG TREND CHART
  // ============================================
  function renderOrgTrend(data) {
    var svg = $('#org-trend-chart');
    if (data.length === 0) { svg.innerHTML = '<text x="350" y="100" text-anchor="middle" fill="#999" font-size="14">データがありません</text>'; return; }

    // Group by week
    var weeks = {};
    data.forEach(function (c) {
      if (!weeks[c.week_start]) weeks[c.week_start] = [];
      weeks[c.week_start].push(c);
    });
    var sortedWeeks = Object.keys(weeks).sort();

    var w = 700, h = 200, pad = 40;
    var n = sortedWeeks.length;
    var html = '';

    // Grid
    for (var g = 1; g <= 5; g++) {
      var gy = h - pad - ((g - 1) / 4) * (h - 2 * pad);
      html += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#eee" stroke-width="1"/>';
      html += '<text x="' + (pad - 4) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#999">' + g + '</text>';
    }

    // Calculate averages per week
    var series = { total: [], stress: [], health: [] };
    sortedWeeks.forEach(function (wk, i) {
      var records = weeks[wk];
      var x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
      var totalAvg = records.reduce(function (s, r) { return s + Number(r.total_score); }, 0) / records.length;
      var stressAvg = records.reduce(function (s, r) { return s + Number(r.stress_score); }, 0) / records.length;
      var healthAvg = records.reduce(function (s, r) { return s + Number(r.health_score); }, 0) / records.length;

      series.total.push({ x: x, y: h - pad - ((totalAvg - 1) / 4) * (h - 2 * pad), v: totalAvg });
      series.stress.push({ x: x, y: h - pad - ((stressAvg - 1) / 4) * (h - 2 * pad), v: stressAvg });
      series.health.push({ x: x, y: h - pad - ((healthAvg - 1) / 4) * (h - 2 * pad), v: healthAvg });

      // Week label
      var parts = wk.split('-');
      html += '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + parts[1] + '/' + parts[2] + '</text>';
    });

    // Lines
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
  // DEPARTMENT TABLE
  // ============================================
  function renderDeptTable(data) {
    var tbody = $('#dept-table-body');
    if (data.length === 0) {
      tbody.innerHTML = '';
      $('#dept-empty').style.display = '';
      return;
    }
    $('#dept-empty').style.display = 'none';

    // Get latest week
    var latestWeek = data.reduce(function (max, c) { return c.week_start > max ? c.week_start : max; }, '');
    var latestData = data.filter(function (c) { return c.week_start === latestWeek; });

    // Group by department
    var deptData = {};
    latestData.forEach(function (c) {
      var deptId = c.department_id || '_none';
      if (!deptData[deptId]) deptData[deptId] = [];
      deptData[deptId].push(c);
    });

    var showKNotice = false;
    var rows = '';
    departments.forEach(function (dept) {
      var records = deptData[dept.id] || [];
      var uniqueRespondents = {};
      records.forEach(function (r) { uniqueRespondents[r.user_id] = true; });
      var count = Object.keys(uniqueRespondents).length;

      if (count < K_ANONYMITY) {
        // k-anonymity: mask data
        showKNotice = true;
        rows += '<tr>' +
          '<td>' + dept.name + '</td>' +
          '<td class="num">' + count + '</td>' +
          '<td class="dept-masked" colspan="4">回答者が' + K_ANONYMITY + '名未満のため非表示</td>' +
          '</tr>';
      } else {
        var totalAvg = (records.reduce(function (s, r) { return s + Number(r.total_score); }, 0) / records.length).toFixed(1);
        var stressAvg = (records.reduce(function (s, r) { return s + Number(r.stress_score); }, 0) / records.length).toFixed(1);
        var healthAvg = (records.reduce(function (s, r) { return s + Number(r.health_score); }, 0) / records.length).toFixed(1);
        var reds = records.filter(function (r) { return r.risk_level === 'red'; }).length;
        var yellows = records.filter(function (r) { return r.risk_level === 'yellow'; }).length;

        var riskHtml = '';
        if (reds > 0) riskHtml += '<span class="risk-badge risk-red" style="margin-right:4px;"><span class="risk-dot risk-dot-red"></span>' + reds + '</span>';
        if (yellows > 0) riskHtml += '<span class="risk-badge risk-yellow"><span class="risk-dot risk-dot-yellow"></span>' + yellows + '</span>';
        if (reds === 0 && yellows === 0) riskHtml = '<span class="risk-badge risk-green"><span class="risk-dot risk-dot-green"></span>良好</span>';

        rows += '<tr>' +
          '<td>' + dept.name + '</td>' +
          '<td class="num">' + count + '</td>' +
          '<td class="num">' + totalAvg + '</td>' +
          '<td class="num">' + stressAvg + '</td>' +
          '<td class="num">' + healthAvg + '</td>' +
          '<td>' + riskHtml + '</td>' +
          '</tr>';
      }
    });

    tbody.innerHTML = rows;
    $('#k-notice').style.display = showKNotice ? '' : 'none';
  }

  // ============================================
  // SCORE DISTRIBUTION
  // ============================================
  function renderDistribution(data) {
    var container = $('#dist-chart');

    // Get latest week data
    var latestWeek = data.reduce(function (max, c) { return c.week_start > max ? c.week_start : max; }, '');
    var latestData = data.filter(function (c) { return c.week_start === latestWeek; });

    if (latestData.length === 0) {
      container.innerHTML = '<div class="loading">データがありません</div>';
      return;
    }

    // Bucket scores into ranges
    var buckets = { '1.0-1.9': 0, '2.0-2.9': 0, '3.0-3.9': 0, '4.0-4.4': 0, '4.5-5.0': 0 };
    var bucketKeys = Object.keys(buckets);
    latestData.forEach(function (c) {
      var s = Number(c.total_score);
      if (s < 2) buckets['1.0-1.9']++;
      else if (s < 3) buckets['2.0-2.9']++;
      else if (s < 4) buckets['3.0-3.9']++;
      else if (s < 4.5) buckets['4.0-4.4']++;
      else buckets['4.5-5.0']++;
    });

    var max = Math.max.apply(null, bucketKeys.map(function (k) { return buckets[k]; }));
    if (max === 0) max = 1;

    var barClasses = ['dist-bar-1', 'dist-bar-2', 'dist-bar-3', 'dist-bar-4', 'dist-bar-5'];
    var html = '';
    bucketKeys.forEach(function (key, i) {
      var pct = (buckets[key] / max * 100).toFixed(0);
      html += '<div class="dist-row">' +
        '<div class="dist-label">' + key + '</div>' +
        '<div class="dist-bar-wrap"><div class="dist-bar ' + barClasses[i] + '" style="width:' + pct + '%"></div></div>' +
        '<div class="dist-count">' + buckets[key] + '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // RISK SIGNAL SUMMARY
  // ============================================
  function renderRiskSummary(data) {
    var container = $('#risk-summary');

    // Group by week
    var weeks = {};
    data.forEach(function (c) {
      if (!weeks[c.week_start]) weeks[c.week_start] = { red: 0, yellow: 0, green: 0 };
      weeks[c.week_start][c.risk_level]++;
    });

    var sortedWeeks = Object.keys(weeks).sort();
    if (sortedWeeks.length === 0) {
      container.innerHTML = '<div class="loading">データがありません</div>';
      return;
    }

    var html = '';
    sortedWeeks.forEach(function (wk) {
      var w = weeks[wk];
      var total = w.red + w.yellow + w.green;
      if (total === 0) return;
      var parts = wk.split('-');

      html += '<div class="risk-week-row">' +
        '<div class="risk-week-label">' + parts[1] + '/' + parts[2] + '</div>' +
        '<div class="risk-bar-group">' +
          (w.red > 0 ? '<div class="risk-bar-seg red" style="width:' + (w.red / total * 100) + '%"></div>' : '') +
          (w.yellow > 0 ? '<div class="risk-bar-seg yellow" style="width:' + (w.yellow / total * 100) + '%"></div>' : '') +
          (w.green > 0 ? '<div class="risk-bar-seg green" style="width:' + (w.green / total * 100) + '%"></div>' : '') +
        '</div>' +
        '<div class="risk-counts">' +
          '<span style="color:var(--red)">' + w.red + '</span>/' +
          '<span style="color:var(--yellow)">' + w.yellow + '</span>/' +
          '<span style="color:var(--green)">' + w.green + '</span>' +
        '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // POLICY TEMPLATES
  // ============================================
  function renderPolicies(data) {
    var container = $('#policy-templates');

    // Calculate org-wide averages from latest week
    var latestWeek = data.reduce(function (max, c) { return c.week_start > max ? c.week_start : max; }, '');
    var latestData = data.filter(function (c) { return c.week_start === latestWeek; });

    var avg = { total: 0, stress: 0, health: 0 };
    if (latestData.length > 0) {
      avg.total = latestData.reduce(function (s, r) { return s + Number(r.total_score); }, 0) / latestData.length;
      avg.stress = latestData.reduce(function (s, r) { return s + Number(r.stress_score); }, 0) / latestData.length;
      avg.health = latestData.reduce(function (s, r) { return s + Number(r.health_score); }, 0) / latestData.length;
    }

    var html = '';
    POLICIES.forEach(function (p) {
      var isActive = latestData.length > 0 && p.check(avg);
      html += '<div class="policy-card' + (isActive ? ' active' : '') + '">' +
        '<div class="policy-card-title">' + (isActive ? '⚠ ' : '') + p.title + '</div>' +
        '<div class="policy-card-trigger">発動条件: ' + p.trigger + (isActive ? ' → 該当' : '') + '</div>' +
        '<div class="policy-card-body">' + p.body + '</div>' +
        '</div>';
    });

    container.innerHTML = html;
  }

  // ============================================
  // BOOT
  // ============================================
  init();
})();

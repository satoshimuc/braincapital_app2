/* ================================================
   UNLOCK — Brain Capital セルフ診断キット
   Application Logic
   ================================================ */

(function () {
  'use strict';

  // ============================================
  // DATA: 30 Assessment Questions
  // ============================================

  const CATEGORIES = [
    // Part 1: Brain Health (A–E)
    {
      id: 'A',
      part: 1,
      partLabel: 'Part 1: Brain Health',
      name: '睡眠と回復',
      nameEn: 'Sleep & Recovery',
      description: '脳のメンテナンスシステム（グリンパティックシステム）は睡眠中に最も活発に機能する。睡眠の質は脳のパフォーマンスの最大の規定因子。',
      questions: [
        { id: 'BH-01', text: '毎日7〜9時間の睡眠を確保できている' },
        { id: 'BH-02', text: '朝の起床時にすっきりした状態で目覚められる' },
        { id: 'BH-03', text: '日中に強い眠気を感じることなく過ごせている' },
      ],
      action: '今夜から就寝30分前のスマホ断ち。寝室の温度を18〜20℃に',
    },
    {
      id: 'B',
      part: 1,
      partLabel: 'Part 1: Brain Health',
      name: '運動と身体活動',
      nameEn: 'Exercise & Physical Activity',
      description: '有酸素運動はBDNF（脳由来神経栄養因子）の分泌を促し、海馬の体積維持と新しい神経回路の形成に直結する。',
      questions: [
        { id: 'BH-04', text: '週に150分以上の運動（ウォーキング含む）を行っている' },
        { id: 'BH-05', text: '1時間以上座り続けることなく、こまめに体を動かしている' },
        { id: 'BH-06', text: '運動後に頭がクリアになる感覚を定期的に体験している' },
      ],
      action: '明日から1日20分のウォーキングを追加。午前中が最も効果的',
    },
    {
      id: 'C',
      part: 1,
      partLabel: 'Part 1: Brain Health',
      name: 'ストレスとメンタルヘルス',
      nameEn: 'Stress & Mental Health',
      description: '慢性ストレスはコルチゾールの持続的上昇を招き、海馬の萎縮と前頭前皮質の機能低下を引き起こす。',
      questions: [
        { id: 'BH-07', text: '日常のストレスを適切にコントロールできていると感じる' },
        { id: 'BH-08', text: '不安や落ち込みが長期間（2週間以上）続くことがない' },
        { id: 'BH-09', text: '仕事やタスクに対する意欲（モチベーション）を維持できている' },
      ],
      action: '1日5分の呼吸法（4-7-8呼吸）を開始。ジャーナリング5分を追加',
    },
    {
      id: 'D',
      part: 1,
      partLabel: 'Part 1: Brain Health',
      name: '栄養と脳の燃料',
      nameEn: 'Nutrition & Brain Fuel',
      description: '脳は体重の2%しかないが全エネルギーの20%を消費する。何を食べるかが脳のパフォーマンスを直接左右する。',
      questions: [
        { id: 'BH-10', text: '魚、ナッツ、野菜、果物など脳に良い食材を意識的に摂っている' },
        { id: 'BH-11', text: '極端な空腹や血糖値の乱高下を避ける食事パターンができている' },
        { id: 'BH-12', text: '十分な水分補給を1日を通じて行えている' },
      ],
      action: '今週から「脳に良い食材」を1食1品追加。青魚・ナッツ・ブルーベリー',
    },
    {
      id: 'E',
      part: 1,
      partLabel: 'Part 1: Brain Health',
      name: '休息とリカバリー',
      nameEn: 'Rest & Recovery',
      description: 'デフォルトモードネットワーク（DMN）は「何もしていない時間」に活性化し、創造的なアイデアの生成と記憶の統合を行う。',
      questions: [
        { id: 'BH-13', text: '仕事の合間に意識的な休憩（5〜20分）を取れている' },
        { id: 'BH-14', text: 'スマホやSNSに頼らない「脳のオフタイム」を確保できている' },
        { id: 'BH-15', text: '週に1日以上、しっかりとリフレッシュできる日がある' },
      ],
      action: '90分ごとに10分のスマホなし休憩。週1日の完全オフを設定',
    },
    // Part 2: Brain Skills (F–J)
    {
      id: 'F',
      part: 2,
      partLabel: 'Part 2: Brain Skills',
      name: '認知力',
      nameEn: 'Cognitive Skills',
      description: '批判的思考、論理的推論、問題解決。AIの出力を正しく評価し、意思決定に活かす力。',
      questions: [
        { id: 'BS-01', text: '情報やニュースを見たとき「本当にそうか？」と立ち止まって考える習慣がある' },
        { id: 'BS-02', text: '複雑な問題を構造化し、要因を分解して考えることができる' },
        { id: 'BS-03', text: 'AIの出力に対して「前提は正しいか」「別の解釈はないか」を検証できる' },
      ],
      action: '毎日ニュース1つに「本当にそうか？別の視点は？」を問う習慣',
    },
    {
      id: 'G',
      part: 2,
      partLabel: 'Part 2: Brain Skills',
      name: '創造性',
      nameEn: 'Creativity',
      description: '既存の枠組みを超えた発想力。AIが生成できない「問い」を立てる力。',
      questions: [
        { id: 'BS-04', text: '異なる分野の知識や経験を結びつけて新しいアイデアを出せる' },
        { id: 'BS-05', text: '「答え」を探すだけでなく「そもそも何が問いか」を考えることが多い' },
        { id: 'BS-06', text: '前例がない状況でも「こうしてみたらどうか」と試行できる' },
      ],
      action: '普段読まない分野の記事を週2本読み、自分の仕事との接点を3つ見つける',
    },
    {
      id: 'H',
      part: 2,
      partLabel: 'Part 2: Brain Skills',
      name: '対人関係力',
      nameEn: 'Interpersonal Skills',
      description: '共感、コミュニケーション、チームワーク。AIにコピーできない人間関係の構築力。',
      questions: [
        { id: 'BS-07', text: '相手の立場や感情を理解し、それに配慮した対応ができる' },
        { id: 'BS-08', text: '自分の考えを分かりやすく伝え、建設的な議論ができる' },
        { id: 'BS-09', text: '異なる意見を持つ人とも協力して成果を出すことができる' },
      ],
      action: '週1回、意識的に「相手の立場で考える」会話を実践する',
    },
    {
      id: 'I',
      part: 2,
      partLabel: 'Part 2: Brain Skills',
      name: 'セルフリーダーシップ',
      nameEn: 'Self-Leadership',
      description: 'レジリエンス（回復力・適応力）、自律性、不確実な状況での意思決定力。',
      questions: [
        { id: 'BS-10', text: '予期しない変化や困難に直面しても、柔軟に対応できる' },
        { id: 'BS-11', text: '自分で目標を設定し、他人に言われなくても行動を起こせる' },
        { id: 'BS-12', text: '失敗した後に落ち込みすぎず、学びに変えて次に活かせる' },
      ],
      action: '毎朝「今日の最重要タスク1つ」を自分で決めて実行する',
    },
    {
      id: 'J',
      part: 2,
      partLabel: 'Part 2: Brain Skills',
      name: 'テクノロジーリテラシー',
      nameEn: 'Technology Literacy',
      description: 'AIを「道具」として使いこなし、自分の脳の拡張として活用する力。',
      questions: [
        { id: 'BS-13', text: 'AIツール（ChatGPT, Claude等）を日常的に活用している' },
        { id: 'BS-14', text: 'AIに「何をさせるか」を自分で設計し、適切なプロンプトを書ける' },
        { id: 'BS-15', text: '新しいテクノロジーに対して好奇心を持ち、積極的に試している' },
      ],
      action: '今日からAIに1日1回「思考の壁打ち」をさせる',
    },
  ];

  const LEVEL_MAP = [
    { min: 121, max: 150, grade: 'S', level: 'Elite', label: 'S: Elite' },
    { min: 91, max: 120, grade: 'A', level: 'Strong', label: 'A: Strong' },
    { min: 61, max: 90, grade: 'B', level: 'Developing', label: 'B: Developing' },
    { min: 31, max: 60, grade: 'C', level: 'At Risk', label: 'C: At Risk' },
    { min: 0, max: 30, grade: 'D', level: 'Critical', label: 'D: Critical' },
  ];

  const TYPE_INFO = {
    S: {
      name: '理想型',
      description: 'Health・Skills共に高い。脳の複利効果が最大に機能している状態。維持とさらなる成長のフェーズ。',
    },
    A: {
      name: '土台充実型',
      description: 'Brain Healthは整っているが、Brain Skillsの開発余地がある。脳のコンディションは良いので、スキルトレーニングに投資すれば大きく伸びる。',
    },
    B: {
      name: 'スキル偏重型',
      description: 'Brain Skillsは高いが、Brain Healthが低い。ハイパフォーマンスだが持続性にリスクがある。バーンアウト予備軍の可能性。Brain Healthの立て直しが急務。',
    },
    D: {
      name: '要改善型',
      description: '両方が低い状態。まずBrain Health（睡眠・運動・ストレス管理）から着手する。Health無くしてSkillsの向上は不可能。',
    },
  };

  // ============================================
  // SUPABASE CLIENT
  // ============================================

  var supabase = null;
  if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' &&
      SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ============================================
  // STATE
  // ============================================

  let currentCategoryIndex = 0;
  const answers = {}; // key: question id, value: 1–5

  // Unique session ID for this assessment attempt
  var sessionId = null;

  // LINE user profile (populated after LIFF login)
  var lineUser = {
    uid: null,
    displayName: null,
    pictureUrl: null,
  };

  // Generate a unique session ID
  function generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  // ============================================
  // QUESTION-ID TO CATEGORY-ID MAPPING
  // ============================================

  var questionCategoryMap = {};
  CATEGORIES.forEach(function (cat) {
    cat.questions.forEach(function (q) {
      questionCategoryMap[q.id] = cat.id;
    });
  });

  // ============================================
  // DOM REFERENCES
  // ============================================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screenLanding = $('#screen-landing');
  const screenAssessment = $('#screen-assessment');
  const screenResults = $('#screen-results');

  const btnStart = $('#btn-start');
  const btnPrev = $('#btn-prev');
  const btnNext = $('#btn-next');
  const btnRetry = $('#btn-retry');
  const btnCopyPrompt = $('#btn-copy-prompt');

  const progressBar = $('#progress-bar');
  const progressText = $('#progress-text');
  const partIndicator = $('#part-indicator');

  const categoryPartLabel = $('#category-part-label');
  const categoryId = $('#category-id');
  const categoryTitle = $('#category-title');
  const categoryDescription = $('#category-description');
  const questionsContainer = $('#questions-container');

  // ============================================
  // SCREEN MANAGEMENT
  // ============================================

  function showScreen(screen) {
    $$('.screen').forEach((s) => s.classList.remove('active'));
    screen.classList.add('active');
    window.scrollTo(0, 0);
  }

  // ============================================
  // ASSESSMENT LOGIC
  // ============================================

  function renderCategory(index) {
    const cat = CATEGORIES[index];
    categoryPartLabel.textContent = cat.partLabel;
    categoryId.textContent = 'カテゴリ' + cat.id;
    categoryTitle.textContent = cat.name;
    categoryDescription.textContent = cat.description;
    partIndicator.textContent = 'Part ' + cat.part;

    questionsContainer.innerHTML = '';
    cat.questions.forEach((q) => {
      const card = document.createElement('div');
      card.className = 'question-card' + (answers[q.id] ? ' answered' : '');
      card.innerHTML =
        '<div class="question-id">' + q.id + '</div>' +
        '<div class="question-text">' + q.text + '</div>' +
        '<div class="rating-group">' +
          [1, 2, 3, 4, 5].map(function (n) {
            return '<button type="button" class="rating-btn' + (answers[q.id] === n ? ' selected' : '') + '" data-qid="' + q.id + '" data-value="' + n + '">' + n + '</button>';
          }).join('') +
        '</div>' +
        '<div class="rating-labels">' +
          '<span class="rating-label-text">当てはまらない</span>' +
          '<span class="rating-label-text">非常に当てはまる</span>' +
        '</div>';
      questionsContainer.appendChild(card);
    });

    updateProgress();
    updateNavButtons();
  }

  // ============================================
  // SAVE INDIVIDUAL ANSWER TO DB
  // ============================================

  function saveAnswerToDB(questionId, value) {
    if (!supabase || !sessionId) return;

    var categoryId = questionCategoryMap[questionId] || '';

    supabase
      .from('assessment_answers')
      .upsert({
        session_id: sessionId,
        line_uid: lineUser.uid || null,
        question_id: questionId,
        category_id: categoryId,
        value: value,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'session_id,question_id'
      })
      .then(function (res) {
        if (res.error) {
          console.error('Answer save failed (' + questionId + '):', res.error.message);
        } else {
          console.log('Answer saved:', questionId, '=', value);
        }
      });
  }

  // Event delegation — handles all rating button clicks via a single listener
  questionsContainer.addEventListener('click', function (e) {
    var btn = e.target.closest('.rating-btn');
    if (!btn) return;

    var qid = btn.getAttribute('data-qid');
    var value = parseInt(btn.getAttribute('data-value'), 10);

    answers[qid] = value;

    // Save this individual answer to DB
    saveAnswerToDB(qid, value);

    // Update UI
    var card = btn.closest('.question-card');
    card.classList.add('answered');
    var siblings = card.querySelectorAll('.rating-btn');
    for (var i = 0; i < siblings.length; i++) {
      siblings[i].classList.remove('selected');
    }
    btn.classList.add('selected');

    updateProgress();
    updateNavButtons();
  });

  function updateProgress() {
    const totalAnswered = Object.keys(answers).length;
    const pct = (totalAnswered / 30) * 100;
    progressBar.style.width = pct + '%';
    progressText.textContent = totalAnswered + ' / 30';
  }

  function updateNavButtons() {
    btnPrev.disabled = currentCategoryIndex === 0;

    // Check if all questions in current category are answered
    const cat = CATEGORIES[currentCategoryIndex];
    const allAnswered = cat.questions.every((q) => answers[q.id]);

    if (currentCategoryIndex === CATEGORIES.length - 1) {
      btnNext.textContent = '結果を見る';
      btnNext.disabled = !allAnswered;
    } else {
      btnNext.textContent = '次へ';
      btnNext.disabled = !allAnswered;
    }
  }

  function transitionToCategory(newIndex) {
    // Fade out current content
    questionsContainer.classList.add('transitioning');
    setTimeout(function () {
      currentCategoryIndex = newIndex;
      renderCategory(currentCategoryIndex);
      window.scrollTo(0, 0);
      // Fade in new content (after a brief delay for DOM update)
      requestAnimationFrame(function () {
        questionsContainer.classList.remove('transitioning');
      });
    }, 200);
  }

  function goNext() {
    if (currentCategoryIndex < CATEGORIES.length - 1) {
      transitionToCategory(currentCategoryIndex + 1);
    } else {
      showResults();
    }
  }

  function goPrev() {
    if (currentCategoryIndex > 0) {
      transitionToCategory(currentCategoryIndex - 1);
    }
  }

  // ============================================
  // RESULTS CALCULATION
  // ============================================

  function calculateResults() {
    const results = {
      categories: {},
      healthTotal: 0,
      skillsTotal: 0,
      total: 0,
    };

    CATEGORIES.forEach((cat) => {
      let sum = 0;
      cat.questions.forEach((q) => {
        sum += answers[q.id] || 0;
      });
      results.categories[cat.id] = sum;
      if (cat.part === 1) results.healthTotal += sum;
      else results.skillsTotal += sum;
    });

    results.total = results.healthTotal + results.skillsTotal;
    return results;
  }

  function getLevel(total) {
    for (const l of LEVEL_MAP) {
      if (total >= l.min) return l;
    }
    return LEVEL_MAP[LEVEL_MAP.length - 1];
  }

  function getType(healthScore, skillsScore) {
    const healthHigh = healthScore >= 38; // midpoint = 37.5
    const skillsHigh = skillsScore >= 38;

    if (healthHigh && skillsHigh) return 'S';
    if (healthHigh && !skillsHigh) return 'A';
    if (!healthHigh && skillsHigh) return 'B';
    return 'D';
  }

  // ============================================
  // RESULTS RENDERING
  // ============================================

  function showResults() {
    showScreen(screenResults);
    const r = calculateResults();

    // Save results (localStorage + API)
    saveResults(r);

    // Date
    const now = new Date();
    $('#results-date').textContent =
      now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 実施';

    // Score ring animation
    const level = getLevel(r.total);
    animateScoreRing(r.total, level);

    // Health / Skills bars
    setTimeout(() => {
      $('#health-bar').style.width = ((r.healthTotal / 75) * 100).toFixed(1) + '%';
      $('#skills-bar').style.width = ((r.skillsTotal / 75) * 100).toFixed(1) + '%';
    }, 300);
    $('#health-score').textContent = r.healthTotal + ' / 75';
    $('#skills-score').textContent = r.skillsTotal + ' / 75';

    // Type
    const type = getType(r.healthTotal, r.skillsTotal);
    const typeInfo = TYPE_INFO[type];
    $('#type-badge').textContent = 'Type ' + type;
    $('#type-name').textContent = typeInfo.name;
    $('#type-description').textContent = typeInfo.description;

    // Matrix highlight
    $$('.matrix-cell').forEach((c) => c.classList.remove('active'));
    const matrixCell = $('#matrix-' + type);
    if (matrixCell) matrixCell.classList.add('active');

    // Interpretation highlight
    $$('.interp-row').forEach((row) => row.classList.remove('active'));
    const interpRow = $('#interp-' + level.grade);
    if (interpRow) interpRow.classList.add('active');

    // Radar chart
    drawRadarChart(r);

    // Category breakdowns
    renderBreakdown('health-breakdown', CATEGORIES.filter((c) => c.part === 1), r);
    renderBreakdown('skills-breakdown', CATEGORIES.filter((c) => c.part === 2), r);

    // Improvement actions
    renderImprovementActions(r);

    // AI prompt
    renderAIPrompt(r);

  }

  function animateScoreRing(total, level) {
    const circumference = 2 * Math.PI * 88; // r=88
    const offset = circumference - (total / 150) * circumference;
    const ring = $('#score-ring-progress');
    const numberEl = $('#score-ring-number');
    const levelEl = $('#score-ring-level');

    // Animate ring
    setTimeout(() => {
      ring.style.strokeDashoffset = offset;
      ring.style.transition = 'stroke-dashoffset 1.5s ease';
    }, 200);

    // Animate number
    let current = 0;
    const duration = 1500;
    const step = total / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= total) {
        current = total;
        clearInterval(timer);
      }
      numberEl.textContent = Math.round(current);
    }, 16);

    levelEl.textContent = level.label;
  }

  function renderBreakdown(containerId, categories, results) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    categories.forEach((cat) => {
      const score = results.categories[cat.id];
      const pct = ((score / 15) * 100).toFixed(1);
      let barClass = 'breakdown-bar';
      if (score <= 6) barClass += ' low';
      else if (score <= 10) barClass += ' mid';
      else barClass += ' high';

      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <div class="breakdown-header">
          <span class="breakdown-name">${cat.id}. ${cat.name}</span>
          <span class="breakdown-score">${score} / 15</span>
        </div>
        <div class="breakdown-bar-container">
          <div class="${barClass}" style="width: 0%"></div>
        </div>
      `;
      container.appendChild(item);

      // Animate bar
      setTimeout(() => {
        item.querySelector('.breakdown-bar').style.width = pct + '%';
      }, 100);
    });
  }

  function renderImprovementActions(results) {
    const container = document.getElementById('improvement-actions');
    container.innerHTML = '';

    // Find the 3 lowest scoring categories
    const sorted = CATEGORIES.map((cat) => ({
      ...cat,
      score: results.categories[cat.id],
    })).sort((a, b) => a.score - b.score);

    const worstThree = sorted.slice(0, 3);

    worstThree.forEach((cat) => {
      const card = document.createElement('div');
      card.className = 'action-card';
      card.innerHTML = `
        <div class="action-category">${cat.part === 1 ? 'Brain Health' : 'Brain Skills'} — カテゴリ${cat.id}</div>
        <div class="action-name">${cat.name}（${cat.score} / 15）</div>
        <div class="action-text">${cat.action}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderAIPrompt(results) {
    const catA = results.categories['A'];
    const catB = results.categories['B'];
    const catC = results.categories['C'];
    const catD = results.categories['D'];
    const catE = results.categories['E'];
    const catF = results.categories['F'];
    const catG = results.categories['G'];
    const catH = results.categories['H'];
    const catI = results.categories['I'];
    const catJ = results.categories['J'];

    const prompt = `私のBrain Capital セルフ診断の結果を分析し、
パーソナライズされた改善プランを作成してください。

■ Brain Health スコア
  A. 睡眠と回復:        ${catA} / 15
  B. 運動と身体活動:    ${catB} / 15
  C. ストレスとメンタル: ${catC} / 15
  D. 栄養と脳の燃料:    ${catD} / 15
  E. 休息とリカバリー:  ${catE} / 15
  → 合計:               ${results.healthTotal} / 75

■ Brain Skills スコア
  F. 認知力:            ${catF} / 15
  G. 創造性:            ${catG} / 15
  H. 対人関係力:        ${catH} / 15
  I. セルフリーダーシップ: ${catI} / 15
  J. テクノロジーリテラシー: ${catJ} / 15
  → 合計:               ${results.skillsTotal} / 75

■ 総合スコア: ${results.total} / 150

以下の形式で回答してください:

1. 総合診断（現状の強みと最大のリスク）
2. 最優先で取り組むべき3つのアクション（理由付き）
3. 4週間の改善スケジュール（Week 1〜4の段階的プラン）
4. 改善効果の予測（4週間後に期待できる変化）

脳科学のエビデンスに基づいて分析してください。`;

    $('#ai-prompt').textContent = prompt;
  }

  // ============================================
  // RADAR CHART (SVG)
  // ============================================

  function drawRadarChart(results) {
    const svg = document.getElementById('radar-chart');
    const cx = 200;
    const cy = 200;
    const maxR = 150;
    const labels = CATEGORIES.map((c) => c.id + '. ' + c.name);
    const values = CATEGORIES.map((c) => results.categories[c.id] / 15);
    const n = labels.length;

    let html = '';

    // Grid circles
    for (let ring = 1; ring <= 5; ring++) {
      const r = (ring / 5) * maxR;
      html += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E0E0E0" stroke-width="${ring === 5 ? 1.5 : 0.5}"/>`;
    }

    // Grid lines
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + maxR * Math.cos(angle);
      const y = cy + maxR * Math.sin(angle);
      html += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E8E8E8" stroke-width="0.5"/>`;
    }

    // Data polygon
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = values[i] * maxR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    html += `<polygon points="${points.join(' ')}" fill="rgba(50,50,50,0.1)" stroke="#333" stroke-width="2"/>`;

    // Data points
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = values[i] * maxR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      html += `<circle cx="${x}" cy="${y}" r="4" fill="#333" stroke="#fff" stroke-width="1.5"/>`;
    }

    // Labels
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const labelR = maxR + 28;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);

      const score = results.categories[CATEGORIES[i].id];
      let anchor = 'middle';
      if (Math.cos(angle) > 0.3) anchor = 'start';
      else if (Math.cos(angle) < -0.3) anchor = 'end';

      html += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central"
                style="font-family: var(--font-sans); font-size: 10px; fill: #666; font-weight: 500;">${CATEGORIES[i].id}</text>`;
      html += `<text x="${x}" y="${y + 13}" text-anchor="${anchor}" dominant-baseline="central"
                style="font-family: var(--font-sans); font-size: 9px; fill: #999;">${score}/15</text>`;
    }

    // Score numbers on rings
    for (let ring = 1; ring <= 5; ring++) {
      const r = (ring / 5) * maxR;
      const score = ring * 3;
      html += `<text x="${cx + 4}" y="${cy - r - 3}" text-anchor="start"
                style="font-family: var(--font-sans); font-size: 8px; fill: #BBB;">${score}</text>`;
    }

    svg.innerHTML = html;
  }

  // ============================================
  // LIFF PROFILE & LINE UID
  // ============================================

  // Check URL parameters for LINE uid (fallback for external integration)
  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function applyUrlParams() {
    // Support ?uid=xxx or ?line_uid=xxx from external integrations
    var uid = getUrlParam('uid') || getUrlParam('line_uid');
    var name = getUrlParam('display_name') || getUrlParam('name');
    var pic = getUrlParam('picture_url');

    if (uid) {
      lineUser.uid = uid;
      console.log('LINE UID from URL param:', uid);
    }
    if (name) {
      lineUser.displayName = name;
    }
    if (pic) {
      lineUser.pictureUrl = pic;
    }
  }

  function fetchLineProfile() {
    if (typeof liff === 'undefined') return;

    var liffId = (typeof LIFF_ID !== 'undefined') ? LIFF_ID : '';
    if (!liffId || liffId === 'LIFF_ID_PLACEHOLDER') {
      console.info('LIFF ID not configured — skipping LIFF profile fetch');
      return;
    }

    try {
      if (!liff.isInClient() && !liff.isLoggedIn()) {
        // Outside LINE app and not logged in — don't force login
        console.info('Not in LINE client and not logged in — using URL params or anonymous');
        return;
      }
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      liff.getProfile().then(function (profile) {
        lineUser.uid = profile.userId;
        lineUser.displayName = profile.displayName;
        lineUser.pictureUrl = profile.pictureUrl || null;
        console.log('LINE profile loaded:', lineUser.displayName, '(uid:', lineUser.uid + ')');
      }).catch(function (err) {
        console.warn('getProfile failed:', err);
      });
    } catch (e) {
      console.warn('LIFF not ready:', e);
    }
  }

  // 1. First try URL params (works anywhere)
  applyUrlParams();

  // 2. Then try LIFF (overwrites URL params if available)
  if (typeof liff !== 'undefined' && liff.ready) {
    liff.ready.then(fetchLineProfile);
  } else {
    setTimeout(fetchLineProfile, 1500);
  }

  // ============================================
  // RESULT SAVING (Supabase)
  // ============================================

  function buildResultRecord(results) {
    var level = getLevel(results.total);
    var type = getType(results.healthTotal, results.skillsTotal);
    return {
      session_id: sessionId || 'unknown',
      line_uid: lineUser.uid || 'anonymous_' + Date.now(),
      display_name: lineUser.displayName || '未ログイン',
      picture_url: lineUser.pictureUrl || null,
      total: results.total,
      health_total: results.healthTotal,
      skills_total: results.skillsTotal,
      level: level.grade,
      level_label: level.label,
      type: type,
      categories: results.categories,
      answers: Object.assign({}, answers),
    };
  }

  function saveResults(results) {
    var record = buildResultRecord(results);

    if (!supabase) {
      console.warn('Supabase not configured — results not saved');
      return;
    }

    supabase
      .from('assessment_results')
      .insert([record])
      .then(function (res) {
        if (res.error) {
          console.error('Supabase save failed:', res.error.message);
        } else {
          console.log('Results saved to Supabase');
        }
      });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  btnStart.addEventListener('click', () => {
    currentCategoryIndex = 0;
    sessionId = generateSessionId();
    console.log('Assessment started, session:', sessionId);
    showScreen(screenAssessment);
    renderCategory(0);
  });

  btnNext.addEventListener('click', goNext);
  btnPrev.addEventListener('click', goPrev);

  btnRetry.addEventListener('click', () => {
    // Reset
    Object.keys(answers).forEach((k) => delete answers[k]);
    currentCategoryIndex = 0;
    sessionId = null;
    showScreen(screenLanding);
  });

  btnCopyPrompt.addEventListener('click', () => {
    const text = $('#ai-prompt').textContent;
    navigator.clipboard.writeText(text).then(() => {
      btnCopyPrompt.textContent = 'コピーしました';
      btnCopyPrompt.classList.add('copied');
      setTimeout(() => {
        btnCopyPrompt.textContent = 'コピー';
        btnCopyPrompt.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      // Fallback for environments without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      btnCopyPrompt.textContent = 'コピーしました';
      btnCopyPrompt.classList.add('copied');
      setTimeout(() => {
        btnCopyPrompt.textContent = 'コピー';
        btnCopyPrompt.classList.remove('copied');
      }, 2000);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!screenAssessment.classList.contains('active')) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      if (!btnNext.disabled) goNext();
    } else if (e.key === 'ArrowLeft') {
      if (!btnPrev.disabled) goPrev();
    }
  });
})();

/* ================================================
   UNLOCK — Brain Capital セルフ診断キット
   Application Logic
   ================================================ */

(function () {
  'use strict';

  // ============================================
  // DATA: Assessment Questions
  // Part 1: Brain Health (A-E, 15 questions)
  // Part 2: Brain Skills (F-J, 15 questions)
  // Part 3: Brain Type  (K-N, 16 questions) — bipolar
  // ============================================

  // ============================================
  // I18N: Translations
  // ============================================

  var currentLang = 'ja'; // 'ja' or 'en'
  var currentMode = 'both'; // 'type', 'capital', or 'both'

  var I18N = {
    ja: {
      // Mode select
      'mode-title': '診断モードを選んでください',
      'mode-type-name': '脳タイプ検定',
      'mode-type-desc': 'あなたのBrain Typeを判定',
      'mode-capital-name': '脳資本測定',
      'mode-capital-desc': 'Brain Health + Brain Skillsを測定',
      'mode-both-name': '両方まとめて',
      'mode-both-desc': 'フル診断',
      'mode-both-badge': 'おすすめ',
      // Landing
      'hero-title': 'Brain Capital<br>セルフ診断キット',
      'hero-subtitle-both': 'Brain Health + Brain Skills + Brain Type',
      'hero-subtitle-capital': 'Brain Health + Brain Skills',
      'hero-subtitle-type': 'Brain Type — 脳の使い方タイプ判定',
      'lead-text': 'あなたの「脳の資産」は<br/>今、どんな状態だろうか？',
      'body-text': '金融資産なら残高を見れば分かる。<br/>しかし<strong>脳の資産（Brain Capital）</strong>は、意識的に「測定」しなければ現状が見えない。',
      'info-items-label': '診断項目',
      'info-minutes-unit': '分',
      'info-time-label': '所要時間',
      'info-scale-label': '段階',
      'info-scale-sublabel': '評価スケール',
      'guide-title': '評価基準',
      'guide-1': 'まったく当てはまらない',
      'guide-2': 'あまり当てはまらない',
      'guide-3': 'どちらとも言えない',
      'guide-4': 'やや当てはまる',
      'guide-5': '非常に当てはまる',
      'note-text': '正直に、直感で答えること。「こうありたい」ではなく「今の自分」を評価する。',
      'btn-start': '診断を開始する',
      'btn-prev': '戻る',
      'btn-next': '次へ',
      'btn-next-finish': '結果を見る',
      'btn-retry': 'もう一度診断する',
      'btn-copy': 'コピー',
      'btn-copy-done': 'コピーしました',
      // Results
      'results-main-title': 'Brain Capital 総合診断結果',
      'section-balance-type': 'バランスタイプ',
      'matrix-skills-high': 'Brain Skills 高い',
      'matrix-skills-low': 'Brain Skills 低い',
      'matrix-health-low': 'Brain Health 低い',
      'matrix-health-high': 'Brain Health 高い',
      'matrix-label-S': '理想型',
      'matrix-label-A': '土台充実',
      'matrix-label-B': 'スキル偏重',
      'matrix-label-D': '要改善',
      'section-category-scores': 'カテゴリ別スコア',
      'section-health-breakdown': 'Brain Health — カテゴリ別',
      'section-skills-breakdown': 'Brain Skills — カテゴリ別',
      'section-score-guide': 'スコア解釈ガイド',
      'interp-desc-S': '脳の資産が十分に蓄積されている。維持とさらなる成長を',
      'interp-desc-A': '良好な状態。弱い領域を特定し、戦略的に強化すれば大幅に伸びる',
      'interp-desc-B': '伸びしろが大きい。優先順位をつけて改善に取り組むフェーズ',
      'interp-desc-C': '脳の資本が消耗している可能性。まずBrain Healthの立て直しが最優先',
      'interp-desc-D': '早急な対策が必要。睡眠・ストレス管理から着手を',
      'section-narrative': 'あなたの脳の「今」を読み解く',
      'section-brain-type': 'Brain Type — 脳の使い方タイプ',
      'section-compat': 'タイプ相性 — あなたと好相性のBrain Type',
      'section-compat-desc': '脳の使い方が異なるパートナーとの組み合わせが、チームのパフォーマンスを最大化する。',
      'section-improvement': '改善アクション',
      'section-ai-prompt': 'AIパーソナル分析',
      'section-ai-prompt-desc': '以下のプロンプトをChatGPTまたはClaudeに入力すると、パーソナライズされた改善プランが手に入る。',
      'line-cta-title': '診断結果を活かすための<br>無料サポートを受け取る',
      'line-cta-desc': 'LINE公式アカウントに登録すると、あなたのBrain Typeに合わせたパーソナライズド改善プランと、4週間の実践ガイドを無料でお届けします。',
      'line-cta-b1': 'あなた専用の改善アクションプラン',
      'line-cta-b2': '週1回の脳科学Tipsを配信',
      'line-cta-b3': '次回診断のリマインド通知',
      'line-cta-btn-text': 'LINE友だち追加で受け取る',
      'line-cta-note': '※ 無料・いつでもブロック可能',
      'section-share': '結果をシェアする',
      'btn-share-line-text': 'LINEでシェア',
      'btn-share-x-text': 'Xでシェア',
      'footer-brand': 'Brain Capital — 脳が、最大の資産になる時代。',
      // Assessment labels
      'rating-low': '当てはまらない',
      'rating-high': '非常に当てはまる',
      'category-prefix': 'カテゴリ',
      'axis-prefix': '軸 ',
    },
    en: {
      'mode-title': 'Select Assessment Mode',
      'mode-type-name': 'Brain Type Test',
      'mode-type-desc': 'Determine your Brain Type',
      'mode-capital-name': 'Brain Capital Assessment',
      'mode-capital-desc': 'Brain Health + Brain Skills assessment',
      'mode-both-name': 'Full Assessment',
      'mode-both-desc': 'Complete full assessment',
      'mode-both-badge': 'RECOMMENDED',
      'hero-title': 'Brain Capital<br>Self-Assessment Kit',
      'hero-subtitle-both': 'Brain Health + Brain Skills + Brain Type',
      'hero-subtitle-capital': 'Brain Health + Brain Skills',
      'hero-subtitle-type': 'Brain Type — Identify Your Cognitive Style',
      'lead-text': 'What is the state of<br/>your "brain assets" right now?',
      'body-text': 'You can check your bank balance at a glance.<br/>But your <strong>Brain Capital</strong> remains invisible unless you consciously measure it.',
      'info-items-label': 'Questions',
      'info-minutes-unit': 'min',
      'info-time-label': 'Duration',
      'info-scale-label': 'Levels',
      'info-scale-sublabel': 'Rating Scale',
      'guide-title': 'Rating Guide',
      'guide-1': 'Strongly disagree',
      'guide-2': 'Disagree',
      'guide-3': 'Neutral',
      'guide-4': 'Agree',
      'guide-5': 'Strongly agree',
      'note-text': 'Answer honestly and intuitively. Rate "who you are now", not "who you want to be".',
      'btn-start': 'Start Assessment',
      'btn-prev': 'Back',
      'btn-next': 'Next',
      'btn-next-finish': 'View Results',
      'btn-retry': 'Take Again',
      'btn-copy': 'Copy',
      'btn-copy-done': 'Copied!',
      'results-main-title': 'Brain Capital Assessment Results',
      'section-balance-type': 'Balance Type',
      'matrix-skills-high': 'Brain Skills High',
      'matrix-skills-low': 'Brain Skills Low',
      'matrix-health-low': 'Brain Health Low',
      'matrix-health-high': 'Brain Health High',
      'matrix-label-S': 'Ideal',
      'matrix-label-A': 'Strong Foundation',
      'matrix-label-B': 'Skill-Heavy',
      'matrix-label-D': 'Needs Improvement',
      'section-category-scores': 'Category Scores',
      'section-health-breakdown': 'Brain Health — By Category',
      'section-skills-breakdown': 'Brain Skills — By Category',
      'section-score-guide': 'Score Interpretation Guide',
      'interp-desc-S': 'Brain capital is well-accumulated. Focus on maintenance and further growth.',
      'interp-desc-A': 'Good condition. Identify weak areas and strategically strengthen them for major gains.',
      'interp-desc-B': 'Large room for growth. Prioritize and work on improvements.',
      'interp-desc-C': 'Brain capital may be depleted. Rebuilding Brain Health is the top priority.',
      'interp-desc-D': 'Urgent action needed. Start with sleep and stress management.',
      'section-narrative': 'Reading Your Brain\'s Current State',
      'section-brain-type': 'Brain Type — Your Cognitive Style',
      'section-compat': 'Type Compatibility — Your Best Brain Type Partners',
      'section-compat-desc': 'Partnering with people who use their brains differently maximizes team performance.',
      'section-improvement': 'Improvement Actions',
      'section-ai-prompt': 'AI Personal Analysis',
      'section-ai-prompt-desc': 'Paste the prompt below into ChatGPT or Claude to get a personalized improvement plan.',
      'line-cta-title': 'Get Free Support<br>Based on Your Results',
      'line-cta-desc': 'Register with our LINE official account to receive a personalized improvement plan and a 4-week practical guide tailored to your Brain Type.',
      'line-cta-b1': 'Your personalized action plan',
      'line-cta-b2': 'Weekly neuroscience tips',
      'line-cta-b3': 'Next assessment reminder',
      'line-cta-btn-text': 'Add LINE Friend',
      'line-cta-note': '* Free — block anytime',
      'section-share': 'Share Your Results',
      'btn-share-line-text': 'Share on LINE',
      'btn-share-x-text': 'Share on X',
      'footer-brand': 'Brain Capital — The era when your brain becomes your greatest asset.',
      'rating-low': 'Disagree',
      'rating-high': 'Strongly agree',
      'category-prefix': 'Category ',
      'axis-prefix': 'Axis ',
    },
  };

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || key;
  }

  function applyI18N() {
    var dict = I18N[currentLang];
    if (!dict) return;
    Object.keys(dict).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        if (dict[id].indexOf('<') !== -1) {
          el.innerHTML = dict[id];
        } else {
          el.textContent = dict[id];
        }
      }
    });
    // Update buttons
    var btnStartEl = document.getElementById('btn-start');
    if (btnStartEl) btnStartEl.textContent = t('btn-start');
    var btnRetryEl = document.getElementById('btn-retry');
    if (btnRetryEl) btnRetryEl.textContent = t('btn-retry');
    var btnPrevEl = document.getElementById('btn-prev');
    if (btnPrevEl) btnPrevEl.textContent = t('btn-prev');
    var btnCopyEl = document.getElementById('btn-copy-prompt');
    if (btnCopyEl) btnCopyEl.textContent = t('btn-copy');

    // Update mode card dynamic items/time/desc
    var modes = ['type', 'capital', 'both'];
    modes.forEach(function (mode) {
      var cfg = MODE_CONFIG[mode];
      var detailEl = document.querySelector('#btn-mode-' + mode + ' .mode-card-detail');
      if (detailEl) detailEl.textContent = cfg.items + (currentLang === 'en' ? ' items' : '問');
      var timeEl = document.getElementById('mode-' + mode + '-time');
      if (timeEl) timeEl.textContent = '~' + cfg.minutes + ' min';
      // Update desc with count prefix
      var descEl = document.getElementById('mode-' + mode + '-desc');
      if (descEl) {
        var prefix = currentLang === 'en' ? cfg.items + ' Qs — ' : cfg.items + '問で';
        descEl.textContent = prefix + t('mode-' + mode + '-desc');
      }
    });
  }

  // ============================================
  // MODE CONFIG: question counts & timing
  // ============================================

  // Items/minutes computed after CATEGORIES are defined
  var MODE_CONFIG = {
    type: { parts: [3], items: 0, minutes: 5 },
    capital: { parts: [1, 2], items: 0, minutes: 10 },
    both: { parts: [1, 2, 3], items: 0, minutes: 15 },
  };

  function getActiveCategories() {
    var cfg = MODE_CONFIG[currentMode] || MODE_CONFIG.both;
    return CATEGORIES.filter(function (c) {
      return cfg.parts.indexOf(c.part) !== -1;
    });
  }

  function getTotalQuestions() {
    var total = 0;
    getActiveCategories().forEach(function (cat) {
      total += cat.questions.length;
    });
    return total;
  }

  var TOTAL_QUESTIONS = 78; // will be updated dynamically

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
    // Part 3: Brain Type (K–N) — bipolar questions
    {
      id: 'K',
      part: 3,
      partLabel: 'Part 3: Brain Type',
      name: '知覚スタイル',
      nameEn: 'Perception',
      description: '情報をどう取り込むか。感覚皮質（具体的事実の処理）と前頭前皮質（抽象化・パターン認識）のどちらを優先的に使うかの傾向。',
      bipolar: true,
      axis: { left: 'S', right: 'N', leftLabel: 'Sensor（具体・事実）', rightLabel: 'iNtuitor（抽象・直感）' },
      questions: [
        { id: 'BT-01', leftText: '具体的なデータや事実から考え始める', rightText: '全体のビジョンやコンセプトから考え始める' },
        { id: 'BT-02', leftText: '過去の経験や実績をベースに判断する', rightText: 'まだ試されていない可能性に惹かれる' },
        { id: 'BT-03', leftText: '具体的な数字や事例がないと納得しにくい', rightText: '抽象的なコンセプトでもピンとくることが多い' },
        { id: 'BT-04', leftText: '今ある現実を正確に把握することが大事だ', rightText: '将来あるべき姿を描くことが大事だ' },
      ],
    },
    {
      id: 'L',
      part: 3,
      partLabel: 'Part 3: Brain Type',
      name: '処理スタイル',
      nameEn: 'Processing',
      description: '情報をどう処理するか。左脳的な逐次・分析処理と、右脳的な並列・統合処理のどちらが優勢かの傾向。',
      bipolar: true,
      axis: { left: 'A', right: 'H', leftLabel: 'Analyzer（分析・論理）', rightLabel: 'Holistic（統合・直感）' },
      questions: [
        { id: 'BT-05', leftText: '要素を分解して一つずつ論理的に整理する', rightText: '全体のパターンや関連性を直感的に把握する' },
        { id: 'BT-06', leftText: '順序立てて一つずつ説明する方が得意だ', rightText: '全体像を示してから要点を伝える方が得意だ' },
        { id: 'BT-07', leftText: '情報を整理し筋道を立てているときにひらめく', rightText: 'リラックスして自由に連想しているときにひらめく' },
        { id: 'BT-08', leftText: '結論に至るプロセスを明確に説明できる', rightText: '「なんとなくこれが正しい」と感じて後から理由を見つける' },
      ],
    },
    {
      id: 'M',
      part: 3,
      partLabel: 'Part 3: Brain Type',
      name: '判断スタイル',
      nameEn: 'Judgment',
      description: '意思決定の基準。背外側前頭前皮質（論理的推論）と腹内側前頭前皮質＋ミラーニューロン系（共感・価値判断）のバランス。',
      bipolar: true,
      axis: { left: 'L', right: 'E', leftLabel: 'Logical（論理・データ）', rightLabel: 'Empathic（共感・関係性）' },
      questions: [
        { id: 'BT-09', leftText: '意見が対立したら論理的に正しい方を選ぶべきだ', rightText: 'メンバーの感情や関係性も考慮して決めるべきだ' },
        { id: 'BT-10', leftText: 'フィードバックは事実に基づき率直に伝えるのが誠実だ', rightText: '相手の気持ちに配慮した伝え方を優先するのが誠実だ' },
        { id: 'BT-11', leftText: '成果は数値目標の達成度で測るのが公平だ', rightText: 'プロセスやチームへの貢献も同じくらい重要だ' },
        { id: 'BT-12', leftText: '難しい決断では感情を排除して合理的に判断する', rightText: '自分や周囲の感情も重要な判断材料だと思う' },
      ],
    },
    {
      id: 'N',
      part: 3,
      partLabel: 'Part 3: Brain Type',
      name: '行動スタイル',
      nameEn: 'Action',
      description: 'タスクへの取り組み方。基底核の習慣回路（計画・ルーティン）とドーパミン系の探索回路（即興・適応）のバランス。',
      bipolar: true,
      axis: { left: 'P', right: 'F', leftLabel: 'Planner（計画・構造）', rightLabel: 'Flexer（即興・適応）' },
      questions: [
        { id: 'BT-13', leftText: 'しっかり計画を立ててから動き始める', rightText: 'まず動いてみて途中で軌道修正する' },
        { id: 'BT-14', leftText: '予定通りに進むと安心する', rightText: '余白があって柔軟に動ける方が心地いい' },
        { id: 'BT-15', leftText: '変化は事前に予測して備えたい', rightText: '変化が来たらその場で対応する方が得意だ' },
        { id: 'BT-16', leftText: '完成度を高めてからアウトプットしたい', rightText: '早く出してフィードバックで磨く方が効率的だ' },
      ],
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
  // NARRATIVE FEEDBACK: Score-dependent personal insights
  // ============================================

  var NARRATIVE = {
    A: {
      low: 'あなたの睡眠は脳が求めるレベルに達していない。グリンパティックシステムが十分に機能せず、日中の認知パフォーマンスに直接影響している可能性が高い。ここを放置すると、他のどの努力も効果が半減する。',
      mid: '睡眠の土台はある程度できている。ただし「寝ている」と「質の高い睡眠」は別物だ。起床時の爽快感に注目してほしい。もう一段上げることで、日中の集中力が目に見えて変わるはず。',
      high: '睡眠の質は非常に高い水準にある。脳のクリーニングシステムが十分に機能している証拠。この習慣は最大の資産だ。何があっても崩さないでほしい。',
    },
    B: {
      low: '身体がほとんど動いていない状態。BDNFの分泌が不足し、海馬の新しい神経回路の生成が滞っている可能性がある。激しい運動は不要——まず「1日20分のウォーキング」から始めるだけで、脳への血流と神経栄養因子が大きく変わる。',
      mid: 'ある程度の運動習慣がある。ただし「座りっぱなし時間」が長いと、運動の効果が相殺される。ポイントは「まとめて動く」より「こまめに動く」。90分ごとの短い歩行が効果的。',
      high: '運動習慣が定着している。BDNF分泌が活発で、海馬の体積維持に大きく貢献しているはず。運動後の「頭がクリアになる感覚」を感じているなら、それは脳が確実に応えている証拠。',
    },
    C: {
      low: 'ストレスが慢性化している可能性がある。コルチゾールの持続的な上昇は、海馬の萎縮と前頭前皮質の機能低下を招く。これは「気合いで乗り越える」問題ではない。構造的な対策——呼吸法、環境調整、必要なら専門家への相談が必要。',
      mid: 'ストレスとの付き合い方はある程度身についている。ただし「耐えている」と「管理できている」は違う。自覚症状がなくても慢性的な微小ストレスが蓄積していないか、定期的に自分を観察する習慣をつけてほしい。',
      high: 'ストレスマネジメントが非常にうまくいっている。前頭前皮質が正常に機能し、意欲も維持できている状態。このコンディションは、Brain Skillsを伸ばすための最高の土台となる。',
    },
    D: {
      low: '脳の燃料供給が不足している。脳は体重の2%で全エネルギーの20%を消費する。食事の質は、あなたが思っている以上に認知機能を左右している。まずオメガ3脂肪酸（青魚、ナッツ）と抗酸化物質（ベリー類、緑黄色野菜）を1食1品追加することから。',
      mid: '基本的な栄養は摂れているが、「脳に最適な食事」にはまだ改善の余地がある。血糖値の乱高下を避け、水分補給を意識するだけで、午後の集中力が大きく変わる。',
      high: '栄養面は申し分ない。脳に必要な燃料が安定供給されている状態。これは長期的な脳の健康維持にとって非常に大きなアドバンテージとなる。',
    },
    E: {
      low: '脳のデフォルトモードネットワーク（DMN）が休まる時間がほとんどない。「常にオン」の状態が続くと、創造性の源泉が枯渇し、記憶の統合も阻害される。「何もしない時間」は怠惰ではない——脳が最も重要な仕事をする時間だ。',
      mid: '休息の意識はあるが、「質の高い休息」になっているかがポイント。スマホを見ながらの休憩はDMNを活性化しない。5分でいい、窓の外を見るだけの「本当の空白時間」を意識してみてほしい。',
      high: '休息とリカバリーが十分に確保されている。DMNが活性化する時間があることで、無意識下のアイデア生成と記憶統合が進んでいるはず。「いいアイデアが突然降ってくる」体験が多いのでは。',
    },
    F: {
      low: '情報を受動的に消費する傾向が強い。これはAI時代に最もリスクの高いパターン。AIの出力を鵜呑みにすると、誤った前提に基づく判断を重ねてしまう。「本当にそうか？」と3秒立ち止まる習慣だけで、認知力は劇的に変わる。',
      mid: '論理的思考の素地はある。ここからは「構造化」のスキルを意識してほしい。複雑な問題を「要素に分解→優先順位→仮説→検証」のフレームで考える練習が効果的。',
      high: '批判的思考力が高い水準にある。情報の真偽を見抜き、AIの出力を適切に評価できている。この力は今後ますます希少になる。周囲の判断を助ける「知的コーチ」としての役割も意識してみては。',
    },
    G: {
      low: '既存の枠組みの中で考える傾向が強い。創造性は才能ではなく、異なるインプットの掛け合わせで生まれる。普段読まない分野の本やポッドキャストを1日10分。異分野の知識が結びつく瞬間が、あなたの創造性を解放する。',
      mid: 'アイデアの種は持っている。ここからは「問いを立てる力」を磨いてほしい。「答えを探す」から「そもそもの問い自体を変える」にシフトすると、創造性が一段上がる。',
      high: '創造性が高い水準にある。異なる知識を結びつけ、既存の枠を超えた発想ができている。AIが代替できない「問いを立てる力」——これがあなたの最大の武器。どんどん活かしてほしい。',
    },
    H: {
      low: '対人関係のスキルに伸びしろがある。共感力とコミュニケーション力は、AIが最もコピーできない領域だ。まず「相手の話を最後まで聞く」ことから始めてみてほしい。理解してから話す——この順序が信頼関係の基盤になる。',
      mid: '基本的な対人スキルはある。次のレベルは「異なる意見を持つ人との建設的な対話」。意見が違う相手とこそ、新しい価値が生まれる。不快感を感じたときこそ、成長のチャンス。',
      high: '対人関係力が非常に高い。共感力とコミュニケーション力は、AI時代において最大の差別化要因となる。チームのパフォーマンスを何倍にも引き上げる力を持っている。',
    },
    I: {
      low: '変化や困難に対して受動的になりがちかもしれない。レジリエンスは筋力と同じで、鍛えられる。毎朝「今日の最重要タスク1つ」を自分で決めて実行する。この小さな自律の積み重ねが、やがて大きなセルフリーダーシップに育つ。',
      mid: '一定の自律性はある。ここからは「不確実な状況での意思決定力」がテーマ。正解がない中で「不完全でも決める→動く→修正する」サイクルを回す練習が、次のステージへの鍵になる。',
      high: 'セルフリーダーシップが高い水準にある。失敗を学びに変え、自律的に行動できている。この力は、不確実性が高い時代に最も求められる能力の一つ。',
    },
    J: {
      low: 'テクノロジーとの距離がある。AI時代において、AIを「使いこなす側」に回るか「置いていかれる側」になるかの分岐点にいる。難しく考える必要はない。今日からChatGPTかClaudeに1日1回話しかけてみる。それだけで世界が変わる。',
      mid: 'AIツールはある程度使えている。次のステップは「AIに何をさせるかを設計する力」。プロンプトの質が結果の質を決める。自分の思考を構造化してAIに渡す練習が、テクノロジーリテラシーを飛躍的に高める。',
      high: 'テクノロジーリテラシーが高い。AIを道具として使いこなし、新しいテクノロジーにも積極的に向き合えている。あなたの脳とAIの協働は、すでに「拡張知能」として機能しているはず。',
    },
  };

  function getNarrativeLevel(score) {
    if (score <= 6) return 'low';
    if (score <= 10) return 'mid';
    return 'high';
  }

  // ============================================
  // BRAIN TYPE COMPATIBILITY
  // ============================================

  var BRAIN_TYPE_COMPAT = {
    best: {
      SALP: 'NHEF', SALF: 'NHEP', SAEP: 'NHLF', SAEF: 'NHLP',
      SHLP: 'NAEF', SHLF: 'NAEP', SHEP: 'NALF', SHEF: 'NALP',
      NALP: 'SHEF', NALF: 'SHEP', NAEP: 'SHLF', NAEF: 'SHLP',
      NHLP: 'SAEF', NHLF: 'SAEP', NHEP: 'SALF', NHEF: 'SALP',
    },
    good: {
      SALP: 'NAEP', SALF: 'NAEF', SAEP: 'SALP', SAEF: 'SALF',
      SHLP: 'NHLP', SHLF: 'NHLF', SHEP: 'NHEP', SHEF: 'NHEF',
      NALP: 'SALP', NALF: 'SALF', NAEP: 'SALP', NAEF: 'SALF',
      NHLP: 'SHLP', NHLF: 'SHLF', NHEP: 'SHEP', NHEF: 'SHEF',
    },
    grow: {
      SALP: 'SHLF', SALF: 'SALP', SAEP: 'SAEF', SAEF: 'SAEP',
      SHLP: 'SHLF', SHLF: 'SHLP', SHEP: 'SHEF', SHEF: 'SHEP',
      NALP: 'NALF', NALF: 'NALP', NAEP: 'NAEF', NAEF: 'NAEP',
      NHLP: 'NHLF', NHLF: 'NHLP', NHEP: 'NHEF', NHEF: 'NHEP',
    },
  };

  var COMPAT_LABELS = {
    best: { title: '最高の補完パートナー', desc: '真逆の強みで互いを最大化する「凸凹コンビ」。発想の幅が倍になり、盲点をカバーし合える。' },
    good: { title: '信頼の共創パートナー', desc: '軸を一部共有しつつ違いもある。安心感と適度な刺激が共存し、一緒に仕事がしやすい。' },
    grow: { title: '成長を引き出す刺激パートナー', desc: '隣り合う軸が逆のため、自分にない視点をくれる。最初は衝突しやすいが、最も成長させてくれる相手。' },
  };

  // ============================================
  // BRAIN TYPE: 16 Types
  // ============================================

  const BRAIN_TYPE_INFO = {
    SALP: { name: '精密設計者', description: '事実を分析し、論理に基づいて緻密な計画を立てる。データドリブンな戦略家。' },
    SALF: { name: '実践検証者', description: '事実とデータを武器に、仮説を素早く検証する。スピード×精度のバランサー。' },
    SAEP: { name: '調和分析者', description: '人の気持ちもデータも見逃さない。チームの中で信頼される参謀役。' },
    SAEF: { name: '現場適応者', description: '現場の空気を読みながら、データに基づいて即座に最適解を出す。' },
    SHLP: { name: '堅実統合者', description: '経験を体系化し、確実に成果を積み上げる。組織の背骨となる存在。' },
    SHLF: { name: '感覚適応者', description: '五感で状況を掴み、全体を俯瞰して合理的に動く。臨機応変の達人。' },
    SHEP: { name: '共鳴守護者', description: '人と現場を守る安定のまとめ役。チームの心理的安全性を高める。' },
    SHEF: { name: '場づくりの達人', description: '空気を読み、場の力を最大化する。自然体でチームを活性化させる。' },
    NALP: { name: '戦略構築者', description: 'ビジョンを論理で設計図に落とし込む。構想力と実行力を兼ね備えた司令塔。' },
    NALF: { name: '革新実験者', description: '仮説と実験を高速で回す変革者。未知の領域を切り拓くパイオニア。' },
    NAEP: { name: '理念設計者', description: '人を動かすビジョンを緻密に設計する。理念と戦略を両立させるリーダー。' },
    NAEF: { name: '創発触媒者', description: '異なる人と知を繋ぎ、化学反応を起こす。イノベーションの火付け役。' },
    NHLP: { name: '構想実現者', description: '大きな構想を現実に着地させる。直感で見えた未来を計画で形にする。' },
    NHLF: { name: '変革推進者', description: '閃きと行動力でゲームチェンジする。既存の枠を壊し新しい流れを作る。' },
    NHEP: { name: '理想共創者', description: '理想の未来をチームで形にする。ビジョンと共感力で人を巻き込む。' },
    NHEF: { name: '自由創造者', description: '枠にとらわれず、人と共に新しい世界を描く。最も自由で創造的なタイプ。' },
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

  // Compute MODE_CONFIG items from actual data
  Object.keys(MODE_CONFIG).forEach(function (mode) {
    var cfg = MODE_CONFIG[mode];
    var count = 0;
    CATEGORIES.forEach(function (cat) {
      if (cfg.parts.indexOf(cat.part) !== -1) {
        count += cat.questions.length;
      }
    });
    cfg.items = count;
    cfg.minutes = Math.ceil(count * 0.3); // ~18 seconds per question
  });

  // ============================================
  // DOM REFERENCES
  // ============================================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screenLang = $('#screen-lang');
  const screenMode = $('#screen-mode');
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
    var activeCats = getActiveCategories();
    const cat = activeCats[index];
    categoryPartLabel.textContent = cat.partLabel;
    categoryId.textContent = cat.bipolar ? t('axis-prefix') + cat.id : t('category-prefix') + cat.id;
    categoryTitle.textContent = currentLang === 'en' ? (cat.nameEn || cat.name) : cat.name;
    categoryDescription.textContent = cat.description;
    partIndicator.textContent = 'Part ' + cat.part;

    questionsContainer.innerHTML = '';

    if (cat.bipolar) {
      // Bipolar questions (Brain Type) — two opposing statements
      cat.questions.forEach((q) => {
        var card = document.createElement('div');
        card.className = 'question-card bipolar-card' + (answers[q.id] ? ' answered' : '');
        card.innerHTML =
          '<div class="question-id">' + q.id + '</div>' +
          '<div class="bipolar-statements">' +
            '<div class="bipolar-left">' + q.leftText + '</div>' +
            '<div class="bipolar-vs">←→</div>' +
            '<div class="bipolar-right">' + q.rightText + '</div>' +
          '</div>' +
          '<div class="rating-group">' +
            [1, 2, 3, 4, 5].map(function (n) {
              return '<button type="button" class="rating-btn' + (answers[q.id] === n ? ' selected' : '') + '" data-qid="' + q.id + '" data-value="' + n + '">' + n + '</button>';
            }).join('') +
          '</div>' +
          '<div class="rating-labels">' +
            '<span class="rating-label-text">' + cat.axis.leftLabel.split('（')[0] + '</span>' +
            '<span class="rating-label-text">' + cat.axis.rightLabel.split('（')[0] + '</span>' +
          '</div>';
        questionsContainer.appendChild(card);
      });
    } else {
      // Standard questions (Brain Health / Skills) — single statement
      cat.questions.forEach((q) => {
        var card = document.createElement('div');
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
            '<span class="rating-label-text">' + t('rating-low') + '</span>' +
            '<span class="rating-label-text">' + t('rating-high') + '</span>' +
          '</div>';
        questionsContainer.appendChild(card);
      });
    }

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
    var activeTotal = getTotalQuestions();
    // Count only answers for active categories
    var activeCats = getActiveCategories();
    var activeQuestionIds = {};
    activeCats.forEach(function (cat) {
      cat.questions.forEach(function (q) { activeQuestionIds[q.id] = true; });
    });
    var totalAnswered = 0;
    Object.keys(answers).forEach(function (k) {
      if (activeQuestionIds[k]) totalAnswered++;
    });
    const pct = (totalAnswered / activeTotal) * 100;
    progressBar.style.width = pct + '%';
    progressText.textContent = totalAnswered + ' / ' + activeTotal;
  }

  function updateNavButtons() {
    var activeCats = getActiveCategories();
    btnPrev.disabled = currentCategoryIndex === 0;

    // Check if all questions in current category are answered
    const cat = activeCats[currentCategoryIndex];
    const allAnswered = cat.questions.every((q) => answers[q.id]);

    if (currentCategoryIndex === activeCats.length - 1) {
      btnNext.textContent = t('btn-next-finish');
      btnNext.disabled = !allAnswered;
    } else {
      btnNext.textContent = t('btn-next');
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
    var activeCats = getActiveCategories();
    if (currentCategoryIndex < activeCats.length - 1) {
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
      else if (cat.part === 2) results.skillsTotal += sum;
      // Part 3 (Brain Type) scores stored in categories but not in totals
    });

    results.total = results.healthTotal + results.skillsTotal;
    return results;
  }

  // ============================================
  // BRAIN TYPE CALCULATION
  // ============================================

  function calculateBrainType() {
    var axes = {};
    var typeCode = '';

    // Each Part 3 category is one axis
    CATEGORIES.filter(function (c) { return c.part === 3; }).forEach(function (cat) {
      var sum = 0;
      cat.questions.forEach(function (q) {
        sum += answers[q.id] || 3; // default to middle
      });
      // sum range: 4-20, midpoint = 12
      // ≤ 12 → left pole, > 12 → right pole
      var letter = sum <= 12 ? cat.axis.left : cat.axis.right;
      axes[cat.id] = {
        sum: sum,
        max: 20,
        leftLabel: cat.axis.leftLabel,
        rightLabel: cat.axis.rightLabel,
        leftLetter: cat.axis.left,
        rightLetter: cat.axis.right,
        result: letter,
        pct: ((sum - 4) / 16) * 100, // 0% = full left, 100% = full right
      };
      typeCode += letter;
    });

    return {
      code: typeCode,
      info: BRAIN_TYPE_INFO[typeCode] || { name: '—', description: '' },
      axes: axes,
    };
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

    // Show/hide sections based on mode
    var sections = document.querySelectorAll('[data-mode]');
    sections.forEach(function (sec) {
      var secMode = sec.getAttribute('data-mode');
      if (currentMode === 'both') {
        sec.style.display = '';
      } else if (secMode === currentMode) {
        sec.style.display = '';
      } else {
        sec.style.display = 'none';
      }
    });

    const r = calculateResults();
    var bt = calculateBrainType();

    // Save results (localStorage + API)
    saveResults(r);

    // Date
    const now = new Date();
    if (currentLang === 'en') {
      $('#results-date').textContent =
        now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else {
      $('#results-date').textContent =
        now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 実施';
    }

    // Capital-related results
    if (currentMode === 'capital' || currentMode === 'both') {
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

      // Narrative Feedback (personal insights)
      renderNarrativeFeedback(r);

      // AI prompt (include brain type)
      renderAIPrompt(r, bt);
    }

    // Brain Type results
    if (currentMode === 'type' || currentMode === 'both') {
      renderBrainType(bt);
      renderBrainTypeCompat(bt);
    }

    // Wire up share buttons
    var btnShareLine = document.getElementById('btn-share-line');
    var btnShareX = document.getElementById('btn-share-x');

    // Remove old listeners by cloning
    if (btnShareLine) {
      var newLine = btnShareLine.cloneNode(true);
      btnShareLine.parentNode.replaceChild(newLine, btnShareLine);
      newLine.addEventListener('click', function () { shareLine(r, bt); });
    }
    if (btnShareX) {
      var newX = btnShareX.cloneNode(true);
      btnShareX.parentNode.replaceChild(newX, btnShareX);
      newX.addEventListener('click', function () { shareX(r, bt); });
    }

  }

  // ============================================
  // BRAIN TYPE RESULTS RENDERING
  // ============================================

  function renderBrainType(bt) {
    // Type card
    $('#brain-type-code').textContent = bt.code;
    $('#brain-type-name').textContent = bt.info.name;
    $('#brain-type-description').textContent = bt.info.description;

    // 4-axis bars
    var axesContainer = document.getElementById('brain-type-axes');
    axesContainer.innerHTML = '';
    var axisOrder = ['K', 'L', 'M', 'N'];
    axisOrder.forEach(function (catId) {
      var ax = bt.axes[catId];
      if (!ax) return;
      var item = document.createElement('div');
      item.className = 'bt-axis-item';
      var leftActive = ax.pct <= 50 ? ' active' : '';
      var rightActive = ax.pct > 50 ? ' active' : '';
      item.innerHTML =
        '<div class="bt-axis-labels">' +
          '<span class="bt-axis-label' + leftActive + '">' + ax.leftLetter + ' ' + ax.leftLabel.split('（')[0] + '</span>' +
          '<span class="bt-axis-label' + rightActive + '">' + ax.rightLetter + ' ' + ax.rightLabel.split('（')[0] + '</span>' +
        '</div>' +
        '<div class="bt-axis-bar-container">' +
          '<div class="bt-axis-bar" style="width: 0%"></div>' +
          '<div class="bt-axis-midline"></div>' +
        '</div>';
      axesContainer.appendChild(item);

      // Animate bar
      setTimeout(function () {
        item.querySelector('.bt-axis-bar').style.width = ax.pct.toFixed(1) + '%';
      }, 200);
    });
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

  // ============================================
  // NARRATIVE FEEDBACK RENDERING
  // ============================================

  function renderNarrativeFeedback(results) {
    var container = document.getElementById('narrative-feedback');
    container.innerHTML = '';

    // Find 2 lowest + 1 highest to create a compelling story
    var part1cats = CATEGORIES.filter(function (c) { return c.part === 1; });
    var part2cats = CATEGORIES.filter(function (c) { return c.part === 2; });

    var allCats = part1cats.concat(part2cats).map(function (cat) {
      return { id: cat.id, name: cat.name, nameEn: cat.nameEn, part: cat.part, score: results.categories[cat.id] };
    }).sort(function (a, b) { return a.score - b.score; });

    var weakest = allCats.slice(0, 2);
    var strongest = allCats.slice(-1)[0];

    // Opening narrative
    var openDiv = document.createElement('div');
    openDiv.className = 'narrative-opening';

    var total = results.total;
    var openText = '';
    if (total >= 121) {
      openText = 'あなたのBrain Capitalは非常に高い水準にある。脳の「複利効果」が機能し、健康な脳がスキルを伸ばし、高いスキルがさらに脳を活性化する好循環が回っている状態だ。';
    } else if (total >= 91) {
      openText = 'あなたのBrain Capitalは良好な状態にある。ただし「良好」は「最適」ではない。あと数カ所を戦略的に改善するだけで、パフォーマンスが大きく跳ね上がる可能性がある。';
    } else if (total >= 61) {
      openText = 'あなたのBrain Capitalには大きな伸びしろがある。これはネガティブな意味ではない。改善の方向性が明確だということは、効率的に成長できるということ。どこに集中すべきかを見てみよう。';
    } else {
      openText = 'あなたのBrain Capitalは立て直しのフェーズにある。しかし、ここに気づけたこと自体が最初の一歩だ。脳の回復力は想像以上に高い。正しい順序で手を打てば、短期間で大きな変化が起こる。';
    }
    openDiv.innerHTML = '<p class="narrative-text narrative-bold">' + openText + '</p>';
    container.appendChild(openDiv);

    // Strongest point
    var strongDiv = document.createElement('div');
    strongDiv.className = 'narrative-block narrative-strength';
    var strongLevel = getNarrativeLevel(strongest.score);
    strongDiv.innerHTML =
      '<div class="narrative-label strength-label">YOUR STRENGTH</div>' +
      '<h4 class="narrative-cat-name">' + strongest.id + '. ' + strongest.name + '<span class="narrative-cat-score">' + strongest.score + ' / 15</span></h4>' +
      '<p class="narrative-text">' + NARRATIVE[strongest.id][strongLevel] + '</p>';
    container.appendChild(strongDiv);

    // Weak points
    weakest.forEach(function (cat) {
      var weakDiv = document.createElement('div');
      weakDiv.className = 'narrative-block narrative-weakness';
      var weakLevel = getNarrativeLevel(cat.score);
      weakDiv.innerHTML =
        '<div class="narrative-label weakness-label">FOCUS AREA</div>' +
        '<h4 class="narrative-cat-name">' + cat.id + '. ' + cat.name + '<span class="narrative-cat-score">' + cat.score + ' / 15</span></h4>' +
        '<p class="narrative-text">' + NARRATIVE[cat.id][weakLevel] + '</p>';
      container.appendChild(weakDiv);
    });

    // Closing call-to-action
    var closeDiv = document.createElement('div');
    closeDiv.className = 'narrative-closing';
    closeDiv.innerHTML = '<p class="narrative-text narrative-italic">脳は筋肉と同じ。正しい負荷をかければ成長する。上の弱点をひとつ選び、今日から1つだけアクションを起こしてほしい。小さな一歩が、4週間後には大きな違いを生む。</p>';
    container.appendChild(closeDiv);
  }

  // ============================================
  // BRAIN TYPE COMPATIBILITY RENDERING
  // ============================================

  function renderBrainTypeCompat(bt) {
    var container = document.getElementById('brain-type-compat');
    container.innerHTML = '';

    var code = bt.code;
    var compatTypes = ['best', 'good', 'grow'];

    compatTypes.forEach(function (type) {
      var partnerCode = BRAIN_TYPE_COMPAT[type][code];
      if (!partnerCode) return;
      var partnerInfo = BRAIN_TYPE_INFO[partnerCode] || { name: '—', description: '' };
      var label = COMPAT_LABELS[type];

      var card = document.createElement('div');
      card.className = 'compat-card compat-' + type;
      card.innerHTML =
        '<div class="compat-header">' +
          '<span class="compat-relation">' + label.title + '</span>' +
        '</div>' +
        '<div class="compat-body">' +
          '<div class="compat-partner-code">' + partnerCode + '</div>' +
          '<div class="compat-partner-name">' + partnerInfo.name + '</div>' +
          '<p class="compat-desc">' + label.desc + '</p>' +
          '<p class="compat-partner-detail">' + partnerInfo.description + '</p>' +
        '</div>';
      container.appendChild(card);
    });
  }

  // ============================================
  // SHARE & SAVE FUNCTIONS
  // ============================================

  function getShareText(results, bt) {
    var level = getLevel(results.total);
    return 'Brain Capital 診断結果\n' +
      '総合スコア: ' + results.total + '/150（' + level.label + '）\n' +
      'Brain Type: ' + bt.code + '（' + bt.info.name + '）\n' +
      '#BrainCapital #UNLOCK診断';
  }

  function shareLine(results, bt) {
    var text = getShareText(results, bt);
    var url = window.location.href.split('?')[0];
    var lineUrl = 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
    window.open(lineUrl, '_blank', 'width=600,height=500');
  }

  function shareX(results, bt) {
    var text = getShareText(results, bt);
    var url = window.location.href.split('?')[0];
    var xUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    window.open(xUrl, '_blank', 'width=600,height=400');
  }

  function renderImprovementActions(results) {
    const container = document.getElementById('improvement-actions');
    container.innerHTML = '';

    // Find the 3 lowest scoring categories (Part 1 & 2 only)
    const sorted = CATEGORIES.filter(function (c) { return c.part <= 2; }).map((cat) => ({
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

  function renderAIPrompt(results, brainType) {
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

■ Brain Type: ${brainType ? brainType.code : '—'}（${brainType ? brainType.info.name : '—'}）

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
    // Only Part 1 & 2 categories (A-J) for the radar chart
    const radarCategories = CATEGORIES.filter(function (c) { return c.part <= 2; });
    const labels = radarCategories.map((c) => c.id + '. ' + c.name);
    const values = radarCategories.map((c) => results.categories[c.id] / 15);
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

      const score = results.categories[radarCategories[i].id];
      let anchor = 'middle';
      if (Math.cos(angle) > 0.3) anchor = 'start';
      else if (Math.cos(angle) < -0.3) anchor = 'end';

      html += `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="central"
                style="font-family: var(--font-sans); font-size: 10px; fill: #666; font-weight: 500;">${radarCategories[i].id}</text>`;
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
    var bt = calculateBrainType();
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
      brain_type: bt.code,
      brain_type_name: bt.info.name,
      brain_type_axes: bt.axes,
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

  // ============================================
  // LANGUAGE SELECT
  // ============================================

  function selectLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang === 'ja' ? 'ja' : 'en';
    applyI18N();
    showScreen(screenMode);
  }

  $('#btn-lang-ja').addEventListener('click', function () { selectLanguage('ja'); });
  $('#btn-lang-en').addEventListener('click', function () { selectLanguage('en'); });

  // ============================================
  // MODE SELECT
  // ============================================

  function selectMode(mode) {
    currentMode = mode;
    TOTAL_QUESTIONS = getTotalQuestions();

    // Update landing page info based on mode
    var cfg = MODE_CONFIG[mode];
    var infoItems = document.getElementById('info-items');
    var infoMinutes = document.getElementById('info-minutes');
    var heroSubtitle = document.getElementById('hero-subtitle');

    if (infoItems) infoItems.textContent = cfg.items;
    if (infoMinutes) infoMinutes.textContent = cfg.minutes;
    if (heroSubtitle) {
      heroSubtitle.innerHTML = t('hero-subtitle-' + mode);
    }

    showScreen(screenLanding);
  }

  $('#btn-mode-type').addEventListener('click', function () { selectMode('type'); });
  $('#btn-mode-capital').addEventListener('click', function () { selectMode('capital'); });
  $('#btn-mode-both').addEventListener('click', function () { selectMode('both'); });

  // ============================================
  // ASSESSMENT START / NAV
  // ============================================

  btnStart.addEventListener('click', () => {
    currentCategoryIndex = 0;
    sessionId = generateSessionId();
    console.log('Assessment started, session:', sessionId, 'mode:', currentMode, 'lang:', currentLang);
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
    showScreen(screenLang);
  });

  btnCopyPrompt.addEventListener('click', () => {
    const text = $('#ai-prompt').textContent;
    navigator.clipboard.writeText(text).then(() => {
      btnCopyPrompt.textContent = t('btn-copy-done');
      btnCopyPrompt.classList.add('copied');
      setTimeout(() => {
        btnCopyPrompt.textContent = t('btn-copy');
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
      btnCopyPrompt.textContent = t('btn-copy-done');
      btnCopyPrompt.classList.add('copied');
      setTimeout(() => {
        btnCopyPrompt.textContent = t('btn-copy');
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

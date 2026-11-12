// ==========================================================================
// MUGDHO'S ENGLISH MASTER - MAIN APPLICATION ENGINE (v2.0)
// Complete 9 Subjects (9,000 Questions) with Persistent Live Activity History
// ==========================================================================

const SUBJECT_MAP = {
  verbs: { name: "Right Form of Verbs", bn: "Right Form of Verbs", icon: "⚡", dataVar: "MUGDHO_VERBS" },
  rearrange: { name: "Rearrange Sentences", bn: "Rearrange Sentences", icon: "🧩", dataVar: "MUGDHO_REARRANGE" },
  articles: { name: "Articles (A, An, The)", bn: "Articles (A, An, The)", icon: "🅰️", dataVar: "MUGDHO_ARTICLES" },
  prepositions: { name: "Prepositions", bn: "Prepositions", icon: "📍", dataVar: "MUGDHO_PREPOSITIONS" },
  changing_sentences: { name: "Changing Sentences", bn: "Changing Sentences (Assertive ↔ Interrogative)", icon: "🔄", dataVar: "MUGDHO_CHANGING_SENTENCES" },
  punctuations: { name: "Punctuations & Capitals", bn: "Punctuations & Capital Letters", icon: "✍️", dataVar: "MUGDHO_PUNCTUATIONS" },
  tense_change: { name: "Tense Change", bn: "Tense Change (Past & Future)", icon: "⏳", dataVar: "MUGDHO_TENSE_CHANGE" },
  parts_of_speech: { name: "Parts of Speech", bn: "Parts of Speech Identification", icon: "🏷️", dataVar: "MUGDHO_PARTS_OF_SPEECH" },
  verb_forms: { name: "Verb Forms (V1, V2, V3)", bn: "Verb Forms (V1, V2, V3 Conjugation)", icon: "📖", dataVar: "MUGDHO_VERB_FORMS" }
};

class MugdhoApp {
  constructor() {
    this.currentScreen = 'home';
    this.currentSubject = 'verbs';
    this.currentUnitFilter = 'all';
    this.practiceList = [];
    this.practiceIndex = 0;
    this.isAnswered = false;

    // History filter states
    this.historyFilterDate = 'all';
    this.historyFilterSubject = 'all';
    this.historyFilterStatus = 'all';
    
    // Rearrange state
    this.rearrangePool = [];
    this.rearrangePlaced = [];
    
    // Exam state
    this.examState = {
      active: false,
      questions: [],
      currentIndex: 0,
      userAnswers: {},
      totalTime: 600,
      timeRemaining: 600,
      timerHandle: null
    };

    // Load user state & persistent activity history
    this.loadState();
    this.updateStreak();
  }

  init() {
    console.log("Initializing Mugdho English Master App v2.0 (9,000 Questions)...");
    this.bindEvents();
    this.updateHeaderStats();
    this.selectSubject('verbs', false); // default subject
    this.updateDashboard();
    this.renderMistakes();
    this.renderHistory();
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // -------------------------------------------------------------
  // STATE MANAGEMENT & LOCAL STORAGE PERSISTENCE
  // -------------------------------------------------------------
  loadState() {
    const defaultData = {
      streak: 1,
      lastActiveDate: new Date().toISOString().split('T')[0],
      stars: 0,
      history: {
        attempted: 0,
        correct: 0,
        wrong: 0
      },
      subjectStats: {
        verbs: { attempted: 0, correct: 0 },
        rearrange: { attempted: 0, correct: 0 },
        articles: { attempted: 0, correct: 0 },
        prepositions: { attempted: 0, correct: 0 },
        changing_sentences: { attempted: 0, correct: 0 },
        punctuations: { attempted: 0, correct: 0 },
        tense_change: { attempted: 0, correct: 0 },
        parts_of_speech: { attempted: 0, correct: 0 },
        verb_forms: { attempted: 0, correct: 0 }
      },
      mistakes: [],
      bookmarks: []
    };

    const saved = localStorage.getItem('mugdho_app_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.userData = Object.assign(defaultData, parsed);
        // Ensure all 9 subjectStats exist
        Object.keys(SUBJECT_MAP).forEach(k => {
          if (!this.userData.subjectStats[k]) {
            this.userData.subjectStats[k] = { attempted: 0, correct: 0 };
          }
        });
      } catch (e) {
        this.userData = defaultData;
      }
    } else {
      this.userData = defaultData;
      this.saveState();
    }

    // Load Dedicated Full Activity History Ledger
    try {
      const savedHistory = localStorage.getItem('mugdho_full_history');
      this.fullHistory = savedHistory ? JSON.parse(savedHistory) : [];
      if (!Array.isArray(this.fullHistory)) this.fullHistory = [];
    } catch (e) {
      console.error("Error loading activity history:", e);
      this.fullHistory = [];
    }
  }

  saveState() {
    try {
      localStorage.setItem('mugdho_app_data', JSON.stringify(this.userData));
    } catch (e) {
      console.warn("Error saving userData to localStorage:", e);
    }
    this.updateHeaderStats();
  }

  saveFullHistory() {
    try {
      localStorage.setItem('mugdho_full_history', JSON.stringify(this.fullHistory));
    } catch (e) {
      console.warn("Storage quota exceeded, keeping latest 2000 entries:", e);
      this.fullHistory = this.fullHistory.slice(0, 2000);
      try {
        localStorage.setItem('mugdho_full_history', JSON.stringify(this.fullHistory));
      } catch (err) {}
    }
  }

  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const last = this.userData.lastActiveDate;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (last === yesterday) {
        this.userData.streak += 1;
      } else {
        this.userData.streak = 1;
      }
      this.userData.lastActiveDate = today;
      this.saveState();
    }
  }

  updateHeaderStats() {
    const streakEl = document.getElementById('headerStreak');
    const starsEl = document.getElementById('headerStars');
    const homeMistakesEl = document.getElementById('homeMistakesCount');
    const homeHistoryEl = document.getElementById('homeHistoryCount');
    
    if (streakEl) streakEl.textContent = this.userData.streak;
    if (starsEl) starsEl.textContent = this.userData.stars;
    
    const unmastered = (this.userData.mistakes || []).filter(m => !m.mastered).length;
    if (homeMistakesEl) homeMistakesEl.textContent = `${unmastered}টি প্রশ্ন রিভিশন`;

    const totalHistory = (this.fullHistory || []).length;
    if (homeHistoryEl) homeHistoryEl.textContent = `${totalHistory}টি প্রশ্ন সংরক্ষিত`;
  }

  toggleSound() {
    const isMuted = window.soundFx.toggleMute();
    const btn = document.getElementById('soundToggleBtn');
    if (btn) {
      btn.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  // -------------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------------
  navigate(screenId) {
    if (window.soundFx) window.soundFx.playClick();
    
    if (this.currentScreen === 'exam' && screenId !== 'exam' && this.examState.active) {
      if (!confirm("তুমি কি পরীক্ষা ছেড়ে অন্য পেজে যেতে চাও? তোমার বর্তমান পরীক্ষা বাতিল হবে।")) {
        return;
      }
      this.abortExam();
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenId;
    }

    const navMap = {
      home: 0,
      practice: 1,
      exam: 2,
      mistakes: 3,
      history: 4,
      dashboard: 5
    };
    const navButtons = document.querySelectorAll('.bottom-nav .nav-item');
    if (navMap[screenId] !== undefined && navButtons[navMap[screenId]]) {
      navButtons[navMap[screenId]].classList.add('active');
    }

    if (screenId === 'dashboard') this.updateDashboard();
    if (screenId === 'mistakes') this.renderMistakes();
    if (screenId === 'history') this.renderHistory();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // -------------------------------------------------------------
  // SUBJECT SELECTION & DATA ACCESS (9 SUBJECTS)
  // -------------------------------------------------------------
  getRawSubjectData(subject) {
    switch (subject) {
      case 'verbs': return window.MUGDHO_VERBS || [];
      case 'rearrange': return window.MUGDHO_REARRANGE || [];
      case 'articles': return window.MUGDHO_ARTICLES || [];
      case 'prepositions': return window.MUGDHO_PREPOSITIONS || [];
      case 'changing_sentences': return window.MUGDHO_CHANGING_SENTENCES || [];
      case 'punctuations': return window.MUGDHO_PUNCTUATIONS || [];
      case 'tense_change': return window.MUGDHO_TENSE_CHANGE || [];
      case 'parts_of_speech': return window.MUGDHO_PARTS_OF_SPEECH || [];
      case 'verb_forms': return window.MUGDHO_VERB_FORMS || [];
      default: return window.MUGDHO_VERBS || [];
    }
  }

  getSubjectDisplayName(subjectKey) {
    return (SUBJECT_MAP[subjectKey] && SUBJECT_MAP[subjectKey].bn) || subjectKey;
  }

  selectSubject(subjectKey, shouldNavigate = true) {
    this.currentSubject = subjectKey;
    this.currentUnitFilter = 'all';
    this.resetUnitChipsUI();
    this.filterQuestions();
    
    if (shouldNavigate) {
      this.navigate('practice');
    }
  }

  startQuickPractice() {
    const subjects = Object.keys(SUBJECT_MAP);
    const randomSub = subjects[Math.floor(Math.random() * subjects.length)];
    this.selectSubject(randomSub, true);
  }

  resetUnitChipsUI() {
    const chips = document.querySelectorAll('#unitScroller .unit-chip');
    chips.forEach((c, idx) => {
      if (idx === 0) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  filterUnit(unitName) {
    if (window.soundFx) window.soundFx.playClick();
    this.currentUnitFilter = unitName;
    
    const chips = document.querySelectorAll('#unitScroller .unit-chip');
    chips.forEach(c => {
      if ((unitName === 'all' && c.textContent.includes('সকল')) || c.textContent.includes(unitName)) {
        c.classList.add('active');
      } else {
        c.classList.remove('active');
      }
    });

    this.filterQuestions();
  }

  filterQuestions() {
    const allItems = this.getRawSubjectData(this.currentSubject);
    if (this.currentUnitFilter === 'all') {
      this.practiceList = [...allItems];
    } else {
      this.practiceList = allItems.filter(item => item.unit && item.unit.includes(this.currentUnitFilter));
      if (this.practiceList.length === 0) this.practiceList = [...allItems];
    }
    
    this.practiceIndex = 0;
    this.renderCurrentQuestion();
  }

  // -------------------------------------------------------------
  // PRACTICE QUESTION RENDERING
  // -------------------------------------------------------------
  renderCurrentQuestion() {
    if (!this.practiceList || this.practiceList.length === 0) {
      return;
    }

    const q = this.practiceList[this.practiceIndex];
    this.isAnswered = false;

    const unitBadge = document.getElementById('practiceUnitBadge');
    const ruleTag = document.getElementById('practiceRuleTag');
    const progText = document.getElementById('practiceProgressText');
    const qText = document.getElementById('practiceQuestionText');
    const optionsGrid = document.getElementById('optionsGrid');
    const expCard = document.getElementById('explanationCard');
    const rearrangeZone = document.getElementById('rearrangeZone');

    const subInfo = SUBJECT_MAP[this.currentSubject] || { bn: "English", icon: "📖" };
    if (unitBadge) unitBadge.textContent = `${subInfo.icon} ${subInfo.bn} • ${q.unit || 'Class 4'}`;
    if (ruleTag) ruleTag.textContent = q.rule_tag || "Grammar Rule";
    if (progText) progText.textContent = `প্রশ্ন: ${this.practiceIndex + 1}/${this.practiceList.length}`;
    if (qText) qText.innerHTML = q.question.replace(/________/g, '<span class="blank">________</span>');

    if (expCard) expCard.classList.remove('active');

    if (this.currentSubject === 'rearrange') {
      if (rearrangeZone) rearrangeZone.style.display = 'block';
      this.setupRearrangeInteractive(q);
    } else {
      if (rearrangeZone) rearrangeZone.style.display = 'none';
    }

    if (optionsGrid) {
      optionsGrid.innerHTML = '';
      const opts = q.options || [];
      opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerHTML = `<span>${opt}</span><span class="icon-indicator"></span>`;
        btn.onclick = () => this.handleOptionClick(opt, btn, q);
        optionsGrid.appendChild(btn);
      });
    }

    const starBtn = document.getElementById('starQuestionBtn');
    if (starBtn) {
      const isStarred = this.userData.bookmarks.includes(`${this.currentSubject}_${q.id}`);
      starBtn.textContent = isStarred ? '⭐ স্টার দেওয়া আছে' : '⭐ স্টার দাও';
      starBtn.style.color = isStarred ? '#ea580c' : 'inherit';
    }
  }

  // -------------------------------------------------------------
  // REARRANGE INTERACTIVE WORD CHIPS
  // -------------------------------------------------------------
  setupRearrangeInteractive(q) {
    const answerSlot = document.getElementById('answerSlotBox');
    const chipPool = document.getElementById('chipPool');
    
    this.rearrangePlaced = [];
    this.rearrangePool = (q.words && q.words.length > 0) ? [...q.words] : q.answer.replace(/[.?!]/g, '').split(' ');
    this.rearrangePool.sort(() => Math.random() - 0.5);

    this.renderRearrangeChips();
  }

  renderRearrangeChips() {
    const answerSlot = document.getElementById('answerSlotBox');
    const chipPool = document.getElementById('chipPool');
    if (!answerSlot || !chipPool) return;

    answerSlot.innerHTML = '';
    if (this.rearrangePlaced.length === 0) {
      answerSlot.innerHTML = '<span style="color:#94a3b8; font-size:13px;">নিচের শব্দগুলোতে ক্লিক করে বাক্য সাজাও...</span>';
    } else {
      this.rearrangePlaced.forEach((word, idx) => {
        const chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = word;
        chip.onclick = () => this.removePlacedRearrangeWord(idx);
        answerSlot.appendChild(chip);
      });
    }

    chipPool.innerHTML = '';
    this.rearrangePool.forEach((word, idx) => {
      const chip = document.createElement('span');
      chip.className = 'word-chip';
      chip.textContent = word;
      chip.onclick = () => this.placeRearrangeWord(word, idx);
      chipPool.appendChild(chip);
    });
  }

  placeRearrangeWord(word, poolIndex) {
    if (this.isAnswered) return;
    if (window.soundFx) window.soundFx.playClick();
    this.rearrangePlaced.push(word);
    this.rearrangePool.splice(poolIndex, 1);
    this.renderRearrangeChips();
  }

  removePlacedRearrangeWord(placedIndex) {
    if (this.isAnswered) return;
    if (window.soundFx) window.soundFx.playClick();
    const word = this.rearrangePlaced.splice(placedIndex, 1)[0];
    this.rearrangePool.push(word);
    this.renderRearrangeChips();
  }

  undoRearrange() {
    if (this.isAnswered || this.rearrangePlaced.length === 0) return;
    if (window.soundFx) window.soundFx.playClick();
    const word = this.rearrangePlaced.pop();
    this.rearrangePool.push(word);
    this.renderRearrangeChips();
  }

  clearRearrange() {
    if (this.isAnswered) return;
    const q = this.practiceList[this.practiceIndex];
    this.setupRearrangeInteractive(q);
  }

  submitRearrangeTap() {
    if (this.isAnswered) return;
    if (this.rearrangePlaced.length === 0) {
      alert("আগে নিচের শব্দগুলো নির্বাচন করে বাক্য সাজাও!");
      return;
    }

    const constructed = this.rearrangePlaced.join(' ').toLowerCase().replace(/[.?!,]/g, '').trim();
    const q = this.practiceList[this.practiceIndex];
    const target = q.answer.toLowerCase().replace(/[.?!,]/g, '').trim();

    const isCorrect = constructed === target;
    this.processAnswer(isCorrect, constructed, q);
  }

  // -------------------------------------------------------------
  // ANSWER PROCESSING & LIVE HISTORY RECORDING
  // -------------------------------------------------------------
  handleOptionClick(selectedOption, buttonEl, q) {
    if (this.isAnswered) return;
    
    const isCorrect = selectedOption.trim().toLowerCase() === q.answer.trim().toLowerCase();
    
    const allButtons = document.querySelectorAll('#optionsGrid .option-btn');
    allButtons.forEach(btn => {
      const btnText = btn.querySelector('span').textContent.trim().toLowerCase();
      if (btnText === q.answer.trim().toLowerCase()) {
        btn.classList.add('reveal-correct');
      }
    });

    if (isCorrect) {
      buttonEl.classList.add('selected-correct');
    } else {
      buttonEl.classList.add('selected-wrong');
    }

    this.processAnswer(isCorrect, selectedOption, q);
  }

  processAnswer(isCorrect, chosenText, q) {
    this.isAnswered = true;

    // 1. Update High-level Stats
    this.userData.history.attempted += 1;
    if (!this.userData.subjectStats[this.currentSubject]) {
      this.userData.subjectStats[this.currentSubject] = { attempted: 0, correct: 0 };
    }
    this.userData.subjectStats[this.currentSubject].attempted += 1;

    // 2. Prepare Formatted Date & Time Strings
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateDisplay = now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeDisplay = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 3. Construct Live History Ledger Entry
    const historyItem = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: now.getTime(),
      dateKey: dateKey,
      dateDisplay: dateDisplay,
      timeDisplay: timeDisplay,
      subjectKey: this.currentSubject,
      subjectName: this.getSubjectDisplayName(this.currentSubject),
      unit: q.unit || 'Class 4',
      mode: this.examState.active ? 'মডেল টেস্ট (Exam)' : 'অনুশীলন (Practice)',
      question: q.question,
      userChoice: chosenText,
      correctAnswer: q.answer,
      isCorrect: isCorrect,
      translation: q.translation || '',
      explanation: q.explanation || '',
      ruleTag: q.rule_tag || '',
      examples: q.examples || []
    };

    // 4. Prepend to Activity History & Live Save
    this.fullHistory.unshift(historyItem);
    this.saveFullHistory();

    // 5. Update Feedback UI
    const expCard = document.getElementById('explanationCard');
    const expStatusPill = document.getElementById('expStatusPill');
    const expAnswerText = document.getElementById('expAnswerText');
    const expTransText = document.getElementById('expTranslationText');
    const expRuleText = document.getElementById('expRuleText');

    if (isCorrect) {
      if (window.soundFx) window.soundFx.playCorrect();
      this.userData.history.correct += 1;
      this.userData.subjectStats[this.currentSubject].correct += 1;
      this.userData.stars += 10;

      if (expStatusPill) {
        expStatusPill.className = 'exp-status-pill exp-status-correct';
        expStatusPill.innerHTML = '<span>✅ অসাধারণ মুগ্ধ! সঠিক উত্তর! (+১০ স্টার)</span>';
      }

      const mistakeIdx = (this.userData.mistakes || []).findIndex(m => m.id === q.id && m.subject === this.currentSubject);
      if (mistakeIdx !== -1) {
        this.userData.mistakes[mistakeIdx].mastered = true;
      }
    } else {
      if (window.soundFx) window.soundFx.playWrong();
      this.userData.history.wrong += 1;

      if (expStatusPill) {
        expStatusPill.className = 'exp-status-pill exp-status-wrong';
        expStatusPill.innerHTML = '<span>❌ ভুল হয়েছে! সঠিক নিয়মটি নিচে দেখে নাও:</span>';
      }

      this.recordMistake(q, chosenText);
    }

    if (expAnswerText) expAnswerText.textContent = q.answer;
    if (expTransText) expTransText.textContent = q.translation || "বাংলা অনুবাদ উপলব্ধ।";
    if (expRuleText) expRuleText.textContent = q.explanation || "নিয়ম অনুযায়ী সঠিক বিকল্পটি নির্বাচন করা হয়েছে।";

    const expExamplesSection = document.getElementById('expExamplesSection');
    const expExamplesList = document.getElementById('expExamplesList');
    if (expExamplesSection && expExamplesList) {
      if (Array.isArray(q.examples) && q.examples.length > 0) {
        expExamplesList.innerHTML = q.examples.map((ex, idx) => `
          <div class="exp-example-item">
            <span class="exp-example-num">${idx + 1}</span>
            <span class="exp-example-text">${this.escapeHtml(ex)}</span>
          </div>
        `).join('');
        expExamplesSection.style.display = 'block';
      } else {
        expExamplesSection.style.display = 'none';
      }
    }

    if (expCard) expCard.classList.add('active');

    // 6. Live Save Everything
    this.saveState();
  }

  recordMistake(q, chosenOption) {
    if (!this.userData.mistakes) this.userData.mistakes = [];
    const existing = this.userData.mistakes.find(m => m.id === q.id && m.subject === this.currentSubject);
    if (!existing) {
      this.userData.mistakes.unshift({
        id: q.id,
        subject: this.currentSubject,
        unit: q.unit,
        question: q.question,
        wrongChoice: chosenOption,
        answer: q.answer,
        translation: q.translation,
        explanation: q.explanation,
        examples: q.examples || [],
        rule_tag: q.rule_tag,
        date: new Date().toLocaleDateString('bn-BD'),
        mastered: false
      });
      this.saveState();
    }
  }

  nextQuestion() {
    if (window.soundFx) window.soundFx.playClick();
    if (this.practiceIndex < this.practiceList.length - 1) {
      this.practiceIndex += 1;
      this.renderCurrentQuestion();
    } else {
      alert("অভিনন্দন মুগ্ধ! তুমি এই বিষয়ের সব প্রশ্ন শেষ করেছ!");
      this.practiceIndex = 0;
      this.renderCurrentQuestion();
    }
  }

  toggleBookmarkCurrent() {
    if (window.soundFx) window.soundFx.playClick();
    const q = this.practiceList[this.practiceIndex];
    const key = `${this.currentSubject}_${q.id}`;
    const idx = this.userData.bookmarks.indexOf(key);
    
    if (idx !== -1) {
      this.userData.bookmarks.splice(idx, 1);
    } else {
      this.userData.bookmarks.push(key);
    }
    
    this.saveState();
    
    const starBtn = document.getElementById('starQuestionBtn');
    if (starBtn) {
      const isStarred = this.userData.bookmarks.includes(key);
      starBtn.textContent = isStarred ? '⭐ স্টার দেওয়া আছে' : '⭐ স্টার দাও';
      starBtn.style.color = isStarred ? '#ea580c' : 'inherit';
    }
  }

  // -------------------------------------------------------------
  // DEDICATED FULL ACTIVITY HISTORY (CUSTOM FILTERS)
  // -------------------------------------------------------------
  renderHistory() {
    const container = document.getElementById('historyListContainer');
    const dateSelect = document.getElementById('historyDateFilter');
    const subjectSelect = document.getElementById('historySubjectFilter');
    const statusSelect = document.getElementById('historyStatusFilter');

    const totalEl = document.getElementById('histTotalCount');
    const corrEl = document.getElementById('histCorrectCount');
    const wrongEl = document.getElementById('histWrongCount');
    const accEl = document.getElementById('histAccuracy');
    const showingCountEl = document.getElementById('histShowingCount');

    if (!container) return;

    const list = this.fullHistory || [];

    // 1. Populate Date Filter Dropdown with Unique Dates
    if (dateSelect) {
      const currentSelectedDate = dateSelect.value || 'all';
      const uniqueDates = [...new Set(list.map(item => item.dateKey))].filter(Boolean);
      dateSelect.innerHTML = '<option value="all">📅 সকল তারিখ (All Dates)</option>';
      uniqueDates.forEach(dKey => {
        const sampleItem = list.find(it => it.dateKey === dKey);
        const opt = document.createElement('option');
        opt.value = dKey;
        opt.textContent = sampleItem ? sampleItem.dateDisplay : dKey;
        dateSelect.appendChild(opt);
      });
      dateSelect.value = currentSelectedDate;
    }

    // 2. Read Active Filter Values
    const filterDate = dateSelect ? dateSelect.value : 'all';
    const filterSub = subjectSelect ? subjectSelect.value : 'all';
    const filterStatus = statusSelect ? statusSelect.value : 'all';

    // 3. Apply Filters
    let filtered = list.filter(item => {
      // Date filter
      if (filterDate !== 'all' && item.dateKey !== filterDate) return false;
      // Subject filter
      if (filterSub !== 'all' && item.subjectKey !== filterSub) return false;
      // Status filter
      if (filterStatus === 'correct' && !item.isCorrect) return false;
      if (filterStatus === 'wrong' && item.isCorrect) return false;
      return true;
    });

    // 4. Update Stats Bar
    const totalCount = filtered.length;
    const correctCount = filtered.filter(it => it.isCorrect).length;
    const wrongCount = totalCount - correctCount;
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    if (totalEl) totalEl.textContent = totalCount;
    if (corrEl) corrEl.textContent = correctCount;
    if (wrongEl) wrongEl.textContent = wrongCount;
    if (accEl) accEl.textContent = `${accuracy}%`;
    if (showingCountEl) showingCountEl.textContent = `মোট ${list.length}টির মধ্যে ${totalCount}টি প্রদর্শিত`;

    // 5. Render History Cards
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; background: white; border-radius: var(--radius-lg); border: 1px dashed #cbd5e1;">
          <div style="font-size: 40px; margin-bottom: 8px;">📜</div>
          <h4 style="font-size: 16px; font-weight: 700; color: #1e293b;">কোনো হিস্ট্রি রেকর্ড পাওয়া যায়নি</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">মুগ্ধ প্রশ্ন সমাধান করলেই সাথে সাথে এখানে বিস্তারিত লগ যুক্ত হয়ে যাবে!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    // Show up to 200 items in view for ultra-fast mobile rendering
    filtered.slice(0, 200).forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `history-card ${item.isCorrect ? 'correct' : 'wrong'}`;
      card.innerHTML = `
        <div class="history-meta">
          <span>📅 ${item.dateDisplay} • ${item.timeDisplay}</span>
          <span class="history-badge-mode">${item.mode || 'অনুশীলন'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="font-size:11px; font-weight:700; color:#4f46e5;">${item.subjectName || 'English'} • ${item.ruleTag || item.unit || ''}</span>
          <span style="font-size:12px; font-weight:800; color:${item.isCorrect ? '#10b981' : '#ef4444'};">
            ${item.isCorrect ? '✅ সঠিক' : '❌ ভুল'}
          </span>
        </div>
        <div class="history-q">${idx + 1}. ${item.question}</div>
        <div class="history-choices">
          <div>তোমার উত্তর: <strong style="color:${item.isCorrect ? '#059669' : '#dc2626'};">${item.userChoice || 'অনুত্তরিত'}</strong></div>
          ${!item.isCorrect ? `<div>সঠিক উত্তর: <strong style="color:#059669;">${item.correctAnswer}</strong></div>` : ''}
        </div>
        ${item.translation ? `<div style="font-size:12px; color:#0284c7; font-weight:600; margin-bottom:4px;">অনুবাদ: ${item.translation}</div>` : ''}
        <div class="history-exp">
          💡 <strong>কেন এই উত্তর?</strong> ${item.explanation || 'ব্যাকরণগত নিয়ম অনুযায়ী সঠিক।'}
        </div>
        ${Array.isArray(item.examples) && item.examples.length > 0 ? `
          <div class="history-examples-box">
            <div style="font-size:11px; font-weight:700; color:#4f46e5; margin-bottom:4px;">📚 আরও ৫টি সহজ উদাহরণ:</div>
            ${item.examples.map((ex, i) => `<div style="font-size:11.5px; color:#334155; margin-bottom:3px; padding-left:4px; line-height:1.4;">• ${this.escapeHtml(ex)}</div>`).join('')}
          </div>
        ` : ''}
      `;
      container.appendChild(card);
    });
  }

  exportHistoryCSV() {
    if (!this.fullHistory || this.fullHistory.length === 0) {
      alert("ডাউনলোড করার মতো কোনো হিস্ট্রি নেই!");
      return;
    }

    let csvContent = "\uFEFF"; // UTF-8 BOM for Bangla characters in Excel
    csvContent += "ID,Date,Time,Subject,Mode,Question,User Choice,Correct Answer,Status,Translation,Explanation\n";

    this.fullHistory.forEach(item => {
      const row = [
        item.id,
        item.dateKey,
        item.timeDisplay,
        item.subjectName,
        item.mode,
        `"${(item.question || '').replace(/"/g, '""')}"`,
        `"${(item.userChoice || '').replace(/"/g, '""')}"`,
        `"${(item.correctAnswer || '').replace(/"/g, '""')}"`,
        item.isCorrect ? "CORRECT" : "WRONG",
        `"${(item.translation || '').replace(/"/g, '""')}"`,
        `"${(item.explanation || '').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mugdho_english_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  clearHistory() {
    if (confirm("মুগ্ধ, তুমি কি নিশ্চিতভাবে তোমার সমস্ত প্র্যাকটিস হিস্ট্রি ও রেকর্ড মুছে ফেলতে চাও?")) {
      this.fullHistory = [];
      localStorage.removeItem('mugdho_full_history');
      this.updateHeaderStats();
      this.renderHistory();
      alert("সমস্ত হিস্ট্রি সফলভাবে ক্লিয়ার করা হয়েছে!");
    }
  }

  // -------------------------------------------------------------
  // MISTAKES NOTEBOOK
  // -------------------------------------------------------------
  renderMistakes() {
    const container = document.getElementById('mistakesListContainer');
    const countEl = document.getElementById('mistakesTotalCount');
    if (!container) return;

    const list = this.userData.mistakes || [];
    if (countEl) countEl.textContent = `মোট ভুল: ${list.length}টি`;

    if (list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; background: white; border-radius: var(--radius-lg); border: 1px dashed #cbd5e1;">
          <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
          <h4 style="font-size: 16px; font-weight: 700; color: #1e293b;">কোনো ভুল নেই!</h4>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">মুগ্ধ, তোমার ভুল খাতা একদম খালি। চমৎকার প্রস্তুতি চলছে!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    list.forEach((m, idx) => {
      const card = document.createElement('div');
      card.className = `mistake-card ${m.mastered ? 'mastered' : ''}`;
      card.innerHTML = `
        <div class="mistake-header">
          <span>${m.unit || 'Class 4'} • ${m.rule_tag || 'Grammar'}</span>
          <span>${m.mastered ? '✅ সংশোধিত' : '⚠️ রিভিশন প্রয়োজন'}</span>
        </div>
        <div class="mistake-q">${idx + 1}. ${m.question}</div>
        <div class="mistake-choices">
          <div>❌ তোমার উত্তর: <span class="choice-wrong">${m.wrongChoice || 'অনুত্তরিত'}</span></div>
          <div>✅ সঠিক উত্তর: <span class="choice-correct">${m.answer}</span></div>
        </div>
        <div style="font-size: 12px; color: #0284c7; font-weight: 600; margin-bottom: 4px;">অনুবাদ: ${m.translation}</div>
        <div class="mistake-exp">
          💡 <strong>কেন এই উত্তর?</strong> ${m.explanation}
        </div>
        ${Array.isArray(m.examples) && m.examples.length > 0 ? `
          <div class="mistake-examples-box">
            <div style="font-size:11px; font-weight:700; color:#15803d; margin-bottom:4px;">📚 আরও ৫টি সহজ উদাহরণ:</div>
            ${m.examples.map((ex, i) => `<div style="font-size:11.5px; color:#1e293b; margin-bottom:3px; padding-left:4px; line-height:1.4;">• ${this.escapeHtml(ex)}</div>`).join('')}
          </div>
        ` : ''}
      `;
      container.appendChild(card);
    });
  }

  practiceMistakesOnly() {
    const unmastered = (this.userData.mistakes || []).filter(m => !m.mastered);
    if (unmastered.length === 0) {
      alert("কোনো অমীমাংসিত ভুল প্রশ্ন নেই! দারুণ কাজ মুগ্ধ!");
      return;
    }

    this.practiceList = unmastered.map(m => ({
      id: m.id,
      unit: m.unit,
      topic: m.subject,
      rule_tag: m.rule_tag,
      question: m.question,
      options: [m.answer, m.wrongChoice, "Option C", "Option D"].sort(() => Math.random() - 0.5),
      answer: m.answer,
      translation: m.translation,
      explanation: m.explanation,
      examples: m.examples || []
    }));

    this.practiceIndex = 0;
    this.navigate('practice');
    this.renderCurrentQuestion();
  }

  // -------------------------------------------------------------
  // EXAM / MODEL TEST ENGINE (9 SUBJECTS)
  // -------------------------------------------------------------
  startExam() {
    if (window.soundFx) window.soundFx.playClick();
    
    const subject = document.getElementById('examSubjectSelect').value;
    const count = parseInt(document.getElementById('examCountSelect').value, 10) || 20;
    const timeMinutes = parseInt(document.getElementById('examTimeSelect').value, 10) || 10;

    let pool = [];
    if (subject === 'mixed') {
      // Sample questions from all 9 subjects
      Object.keys(SUBJECT_MAP).forEach(k => {
        const data = this.getRawSubjectData(k);
        pool.push(...data.slice(0, 100));
      });
    } else {
      pool = this.getRawSubjectData(subject);
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    this.examState = {
      active: true,
      questions: selected,
      currentIndex: 0,
      userAnswers: {},
      totalTime: timeMinutes * 60,
      timeRemaining: timeMinutes * 60,
      timerHandle: null
    };

    document.getElementById('examSetupSection').style.display = 'none';
    document.getElementById('examActiveSection').style.display = 'block';

    this.startExamTimer();
    this.renderExamQuestion();
  }

  startExamTimer() {
    if (this.examState.timerHandle) clearInterval(this.examState.timerHandle);
    
    const display = document.getElementById('examTimerDisplay');
    
    this.examState.timerHandle = setInterval(() => {
      this.examState.timeRemaining -= 1;
      
      const m = Math.floor(this.examState.timeRemaining / 60);
      const s = this.examState.timeRemaining % 60;
      if (display) {
        display.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }

      if (this.examState.timeRemaining <= 0) {
        clearInterval(this.examState.timerHandle);
        alert("পরীক্ষার নির্ধারিত সময় শেষ! উত্তর জমা হচ্ছে...");
        this.submitExam();
      }
    }, 1000);
  }

  renderExamQuestion() {
    const q = this.examState.questions[this.examState.currentIndex];
    const total = this.examState.questions.length;
    
    const subjectBadge = document.getElementById('examSubjectBadge');
    const qText = document.getElementById('examQuestionText');
    const progDisp = document.getElementById('examProgressDisplay');
    const optionsGrid = document.getElementById('examOptionsGrid');

    if (subjectBadge) subjectBadge.textContent = `${q.topic || 'English'} • ${q.unit || 'Class 4'}`;
    if (progDisp) progDisp.textContent = `${this.examState.currentIndex + 1}/${total}`;
    if (qText) qText.innerHTML = q.question.replace(/________/g, '<span class="blank">________</span>');

    if (optionsGrid) {
      optionsGrid.innerHTML = '';
      const opts = q.options || [];
      const currentChoice = this.examState.userAnswers[this.examState.currentIndex];

      opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = `option-btn ${currentChoice === opt ? 'selected-correct' : ''}`;
        btn.innerHTML = `<span>${opt}</span>`;
        btn.onclick = () => {
          if (window.soundFx) window.soundFx.playClick();
          this.examState.userAnswers[this.examState.currentIndex] = opt;
          setTimeout(() => {
            if (this.examState.currentIndex < total - 1) {
              this.examState.currentIndex += 1;
              this.renderExamQuestion();
            } else {
              this.renderExamQuestion();
            }
          }, 200);
        };
        optionsGrid.appendChild(btn);
      });
    }
  }

  skipExamQuestion() {
    if (window.soundFx) window.soundFx.playClick();
    if (this.examState.currentIndex < this.examState.questions.length - 1) {
      this.examState.currentIndex += 1;
      this.renderExamQuestion();
    } else {
      alert("এটিই মডেল টেস্টের শেষ প্রশ্ন! নিচে 'পরীক্ষা জমা দাও' বাটনে ক্লিক করো।");
    }
  }

  confirmSubmitExam() {
    const answeredCount = Object.keys(this.examState.userAnswers).length;
    const total = this.examState.questions.length;
    if (confirm(`তুমি ${total}টির মধ্যে ${answeredCount}টি প্রশ্নের উত্তর দিয়েছ। নিশ্চিত জমা দিতে চাও?`)) {
      this.submitExam();
    }
  }

  submitExam() {
    clearInterval(this.examState.timerHandle);
    this.examState.active = false;

    let score = 0;
    const total = this.examState.questions.length;
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];
    const dateDisplay = now.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeDisplay = now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.examState.questions.forEach((q, idx) => {
      const userChoice = this.examState.userAnswers[idx];
      const isCorrect = userChoice && (userChoice.trim().toLowerCase() === q.answer.trim().toLowerCase());
      
      this.userData.history.attempted += 1;
      if (this.userData.subjectStats[q.topic]) {
        this.userData.subjectStats[q.topic].attempted += 1;
      }

      if (isCorrect) {
        score += 1;
        this.userData.history.correct += 1;
        this.userData.stars += 15;
        if (this.userData.subjectStats[q.topic]) {
          this.userData.subjectStats[q.topic].correct += 1;
        }
      } else {
        this.userData.history.wrong += 1;
        this.recordMistake(q, userChoice || 'অনুত্তরিত');
      }

      // Log to Full Activity History Ledger
      this.fullHistory.unshift({
        id: 'exam_' + Date.now() + '_' + idx,
        timestamp: now.getTime(),
        dateKey: dateKey,
        dateDisplay: dateDisplay,
        timeDisplay: timeDisplay,
        subjectKey: q.topic || 'mixed',
        subjectName: this.getSubjectDisplayName(q.topic) || 'মডেল টেস্ট',
        unit: q.unit || 'Class 4',
        mode: 'মডেল টেস্ট (Exam)',
        question: q.question,
        userChoice: userChoice || 'অনুত্তরিত',
        correctAnswer: q.answer,
        isCorrect: Boolean(isCorrect),
        translation: q.translation || '',
        explanation: q.explanation || '',
        ruleTag: q.rule_tag || '',
        examples: q.examples || []
      });
    });

    this.saveState();
    this.saveFullHistory();

    const pct = Math.round((score / total) * 100);
    let grade = "C";
    if (pct >= 80) grade = "A+ (অসাধারণ!)";
    else if (pct >= 70) grade = "A (খুব ভালো!)";
    else if (pct >= 60) grade = "B (ভালো)";
    else grade = "প্র্যাকটিস প্রয়োজন";

    const timeSpent = this.examState.totalTime - this.examState.timeRemaining;
    const m = Math.floor(timeSpent / 60);
    const s = timeSpent % 60;

    const modalScore = document.getElementById('modalScoreDisplay');
    const modalPct = document.getElementById('modalPercentDisplay');
    const modalTime = document.getElementById('modalTimeDisplay');
    const modalIcon = document.getElementById('modalResultIcon');
    const modal = document.getElementById('examResultModal');

    if (modalScore) modalScore.textContent = `${score}/${total}`;
    if (modalPct) modalPct.textContent = `${pct}% স্কোর • গ্রেড: ${grade}`;
    if (modalTime) modalTime.textContent = `সময় লেগেছে: ${m} মিনিট ${s} সেকেন্ড`;
    if (modalIcon) modalIcon.textContent = pct >= 80 ? '🏆' : '👍';

    if (pct >= 70 && window.soundFx) {
      window.soundFx.playFanfare();
    }

    if (modal) modal.classList.add('active');

    document.getElementById('examSetupSection').style.display = 'block';
    document.getElementById('examActiveSection').style.display = 'none';
  }

  abortExam() {
    clearInterval(this.examState.timerHandle);
    this.examState.active = false;
    document.getElementById('examSetupSection').style.display = 'block';
    document.getElementById('examActiveSection').style.display = 'none';
  }

  closeResultModal() {
    const modal = document.getElementById('examResultModal');
    if (modal) modal.classList.remove('active');
  }

  closeResultModalAndShowMistakes() {
    this.closeResultModal();
    this.navigate('mistakes');
  }

  // -------------------------------------------------------------
  // DASHBOARD (9 SUBJECT PROGRESS BARS)
  // -------------------------------------------------------------
  updateDashboard() {
    const h = this.userData.history;
    const total = h.attempted;
    const acc = total > 0 ? Math.round((h.correct / total) * 100) : 0;

    const totalEl = document.getElementById('dashTotalAttempted');
    const accEl = document.getElementById('dashAccuracy');
    const corrEl = document.getElementById('dashTotalCorrect');
    const wrongEl = document.getElementById('dashTotalWrong');

    if (totalEl) totalEl.textContent = total;
    if (accEl) accEl.textContent = `${acc}%`;
    if (corrEl) corrEl.textContent = h.correct;
    if (wrongEl) wrongEl.textContent = h.wrong;

    // Render Progress for all 9 Subjects
    Object.keys(SUBJECT_MAP).forEach(sub => {
      const stats = this.userData.subjectStats[sub] || { attempted: 0, correct: 0 };
      const subTotal = 1000;
      const subPct = Math.min(100, Math.round((stats.attempted / subTotal) * 100));
      
      const progLbl = document.getElementById(`dash${this.formatSubId(sub)}Prog`);
      const barFill = document.getElementById(`dash${this.formatSubId(sub)}Bar`);
      
      if (progLbl) progLbl.textContent = `${stats.attempted}/${subTotal} (${subPct}%)`;
      if (barFill) barFill.style.width = `${subPct}%`;
    });

    const badgeStreak = document.getElementById('badge-streak');
    const badgeVerbs = document.getElementById('badge-verbs');
    const badgeRearrange = document.getElementById('badge-rearrange');
    const badgeArticles = document.getElementById('badge-articles');
    const badgePreps = document.getElementById('badge-prepositions');
    const badgeMaster = document.getElementById('badge-master');

    if (badgeStreak) badgeStreak.classList.toggle('locked', this.userData.streak < 3);
    if (badgeVerbs) badgeVerbs.classList.toggle('locked', (this.userData.subjectStats.verbs || {}).attempted < 10);
    if (badgeRearrange) badgeRearrange.classList.toggle('locked', (this.userData.subjectStats.rearrange || {}).attempted < 10);
    if (badgeArticles) badgeArticles.classList.toggle('locked', (this.userData.subjectStats.articles || {}).attempted < 10);
    if (badgePreps) badgePreps.classList.toggle('locked', (this.userData.subjectStats.prepositions || {}).attempted < 10);
    if (badgeMaster) badgeMaster.classList.toggle('locked', total < 50);
  }

  formatSubId(subKey) {
    // converts 'changing_sentences' -> 'Changing'
    return subKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  resetAllData() {
    if (confirm("মুগ্ধ, তুমি কি নিশ্চিতভাবে তোমার সমস্ত স্টার ও প্র্যাকটিস স্কোর রিসেট করতে চাও?")) {
      localStorage.removeItem('mugdho_app_data');
      localStorage.removeItem('mugdho_full_history');
      this.fullHistory = [];
      this.loadState();
      this.updateHeaderStats();
      this.updateDashboard();
      this.renderMistakes();
      this.renderHistory();
      alert("ডাটা ও ইতিহাস সফলভাবে রিসেট করা হয়েছে!");
    }
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'practice' && e.key === 'ArrowRight') {
        this.nextQuestion();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new MugdhoApp();
  window.app.init();
});

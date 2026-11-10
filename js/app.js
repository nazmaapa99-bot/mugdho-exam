// ==========================================================================
// MUGDHO'S ENGLISH MASTER - MAIN APPLICATION ENGINE
// Responsive, Offline-First, Class 4 Exam & Practice System
// ==========================================================================

class MugdhoApp {
  constructor() {
    this.currentScreen = 'home';
    this.currentSubject = 'verbs';
    this.currentUnitFilter = 'all';
    this.practiceList = [];
    this.practiceIndex = 0;
    this.isAnswered = false;
    
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

    // Load or initialize user state from localStorage
    this.loadState();
    this.updateStreak();
  }

  init() {
    console.log("Initializing Mugdho English Master App...");
    this.bindEvents();
    this.updateHeaderStats();
    this.selectSubject('verbs', false); // default subject
    this.updateDashboard();
    this.renderMistakes();
  }

  // -------------------------------------------------------------
  // STATE MANAGEMENT & LOCAL STORAGE
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
        prepositions: { attempted: 0, correct: 0 }
      },
      mistakes: [], // list of mistake objects
      bookmarks: []  // list of starred IDs
    };

    const saved = localStorage.getItem('mugdho_app_data');
    if (saved) {
      try {
        this.userData = Object.assign(defaultData, JSON.parse(saved));
      } catch (e) {
        this.userData = defaultData;
      }
    } else {
      this.userData = defaultData;
      this.saveState();
    }
  }

  saveState() {
    localStorage.setItem('mugdho_app_data', JSON.stringify(this.userData));
    this.updateHeaderStats();
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
    
    if (streakEl) streakEl.textContent = this.userData.streak;
    if (starsEl) starsEl.textContent = this.userData.stars;
    
    const unmastered = this.userData.mistakes.filter(m => !m.mastered).length;
    if (homeMistakesEl) homeMistakesEl.textContent = `${unmastered}টি প্রশ্ন রিভিশন`;
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
    
    // Stop exam timer if navigating away during active exam
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

    // Update bottom nav active state
    const navMap = {
      home: 0,
      practice: 1,
      exam: 2,
      mistakes: 3,
      dashboard: 4
    };
    const navButtons = document.querySelectorAll('.bottom-nav .nav-item');
    if (navMap[screenId] !== undefined && navButtons[navMap[screenId]]) {
      navButtons[navMap[screenId]].classList.add('active');
    }

    if (screenId === 'dashboard') this.updateDashboard();
    if (screenId === 'mistakes') this.renderMistakes();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // -------------------------------------------------------------
  // SUBJECT SELECTION & PRACTICE SETUP
  // -------------------------------------------------------------
  getRawSubjectData(subject) {
    switch (subject) {
      case 'verbs': return window.MUGDHO_VERBS || [];
      case 'rearrange': return window.MUGDHO_REARRANGE || [];
      case 'articles': return window.MUGDHO_ARTICLES || [];
      case 'prepositions': return window.MUGDHO_PREPOSITIONS || [];
      default: return window.MUGDHO_VERBS || [];
    }
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
    const subjects = ['verbs', 'rearrange', 'articles', 'prepositions'];
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
    
    // Highlight chip
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
    }
    
    // Shuffle slightly or keep in order
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

    // Badges & Labels
    const unitBadge = document.getElementById('practiceUnitBadge');
    const ruleTag = document.getElementById('practiceRuleTag');
    const progText = document.getElementById('practiceProgressText');
    const qText = document.getElementById('practiceQuestionText');
    const optionsGrid = document.getElementById('optionsGrid');
    const expCard = document.getElementById('explanationCard');
    const rearrangeZone = document.getElementById('rearrangeZone');

    if (unitBadge) unitBadge.textContent = q.unit || "English for Today";
    if (ruleTag) ruleTag.textContent = q.rule_tag || "Grammar Rule";
    if (progText) progText.textContent = `প্রশ্ন: ${this.practiceIndex + 1}/${this.practiceList.length}`;
    if (qText) qText.innerHTML = q.question.replace(/________/g, '<span class="blank">________</span>');

    // Hide explanation card
    if (expCard) expCard.classList.remove('active');

    // Rearrange Mode vs Normal Mode
    if (this.currentSubject === 'rearrange') {
      if (rearrangeZone) rearrangeZone.style.display = 'block';
      this.setupRearrangeInteractive(q);
    } else {
      if (rearrangeZone) rearrangeZone.style.display = 'none';
    }

    // Render Options
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

    // Bookmark Star State
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
    
    // Shuffle pool words for challenge
    this.rearrangePool.sort(() => Math.random() - 0.5);

    this.renderRearrangeChips();
  }

  renderRearrangeChips() {
    const answerSlot = document.getElementById('answerSlotBox');
    const chipPool = document.getElementById('chipPool');
    if (!answerSlot || !chipPool) return;

    // Render Placed Words
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

    // Render Pool
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
  // OPTION CLICK & EVALUATION
  // -------------------------------------------------------------
  handleOptionClick(selectedOption, buttonEl, q) {
    if (this.isAnswered) return;
    
    // Normalize string compare
    const isCorrect = selectedOption.trim().toLowerCase() === q.answer.trim().toLowerCase();
    
    // UI Feedback
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

    // Record stats
    this.userData.history.attempted += 1;
    this.userData.subjectStats[this.currentSubject].attempted += 1;

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

      // Check if was in mistakes, mark mastered
      const mistakeIdx = this.userData.mistakes.findIndex(m => m.id === q.id && m.subject === this.currentSubject);
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

      // Record to Mistakes Notebook
      this.recordMistake(q, chosenText);
    }

    // Populate explanation
    if (expAnswerText) expAnswerText.textContent = q.answer;
    if (expTransText) expTransText.textContent = q.translation || "বাংলা অনুবাদ উপলব্ধ।";
    if (expRuleText) expRuleText.textContent = q.explanation || "নিয়ম অনুযায়ী সঠিক বিকল্পটি নির্বাচন করা হয়েছে।";
    if (expCard) expCard.classList.add('active');

    this.saveState();
  }

  recordMistake(q, chosenOption) {
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
      alert("অভিনন্দন মুগ্ধ! তুমি এই অধ্যায়ের সব প্রশ্ন শেষ করেছ!");
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
      `;
      container.appendChild(card);
    });
  }

  practiceMistakesOnly() {
    const unmastered = this.userData.mistakes.filter(m => !m.mastered);
    if (unmastered.length === 0) {
      alert("কোনো অমীমাংসিত ভুল প্রশ্ন নেই! দারুণ কাজ মুগ্ধ!");
      return;
    }

    // Map mistake items to practice list format
    this.practiceList = unmastered.map(m => ({
      id: m.id,
      unit: m.unit,
      topic: m.subject,
      rule_tag: m.rule_tag,
      question: m.question,
      options: [m.answer, m.wrongChoice, "Option C", "Option D"].sort(() => Math.random() - 0.5),
      answer: m.answer,
      translation: m.translation,
      explanation: m.explanation
    }));

    this.practiceIndex = 0;
    this.navigate('practice');
    this.renderCurrentQuestion();
  }

  // -------------------------------------------------------------
  // EXAM / MODEL TEST ENGINE
  // -------------------------------------------------------------
  startExam() {
    if (window.soundFx) window.soundFx.playClick();
    
    const subject = document.getElementById('examSubjectSelect').value;
    const count = parseInt(document.getElementById('examCountSelect').value, 10) || 20;
    const timeMinutes = parseInt(document.getElementById('examTimeSelect').value, 10) || 10;

    let pool = [];
    if (subject === 'mixed') {
      const v = (window.MUGDHO_VERBS || []).slice(0, 150);
      const r = (window.MUGDHO_REARRANGE || []).slice(0, 150);
      const a = (window.MUGDHO_ARTICLES || []).slice(0, 150);
      const p = (window.MUGDHO_PREPOSITIONS || []).slice(0, 150);
      pool = [...v, ...r, ...a, ...p];
    } else {
      pool = this.getRawSubjectData(subject);
    }

    // Pick random N questions
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

    // UI Toggle
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
          // Auto advance to next question smoothly after a short beat
          setTimeout(() => {
            if (this.examState.currentIndex < total - 1) {
              this.examState.currentIndex += 1;
              this.renderExamQuestion();
            } else {
              this.renderExamQuestion(); // refresh to show selection
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

    this.examState.questions.forEach((q, idx) => {
      const userChoice = this.examState.userAnswers[idx];
      const isCorrect = userChoice && (userChoice.trim().toLowerCase() === q.answer.trim().toLowerCase());
      
      this.userData.history.attempted += 1;
      if (isCorrect) {
        score += 1;
        this.userData.history.correct += 1;
        this.userData.stars += 15;
      } else {
        this.userData.history.wrong += 1;
        this.recordMistake(q, userChoice || 'অনুত্তরিত');
      }
    });

    this.saveState();

    // Show Result Modal
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

    // Reset Exam UI to Setup
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
  // DASHBOARD
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

    // Subject Bars
    const subjects = ['verbs', 'rearrange', 'articles', 'prepositions'];
    subjects.forEach(sub => {
      const stats = this.userData.subjectStats[sub] || { attempted: 0, correct: 0 };
      const subTotal = 1000;
      const subPct = Math.min(100, Math.round((stats.attempted / subTotal) * 100));
      
      const progLbl = document.getElementById(`dash${sub.charAt(0).toUpperCase() + sub.slice(1)}Prog`);
      const barFill = document.getElementById(`dash${sub.charAt(0).toUpperCase() + sub.slice(1)}Bar`);
      
      if (progLbl) progLbl.textContent = `${stats.attempted}/${subTotal} (${subPct}%)`;
      if (barFill) barFill.style.width = `${subPct}%`;
    });

    // Badges unlock
    const badgeStreak = document.getElementById('badge-streak');
    const badgeVerbs = document.getElementById('badge-verbs');
    const badgeRearrange = document.getElementById('badge-rearrange');
    const badgeArticles = document.getElementById('badge-articles');
    const badgePreps = document.getElementById('badge-prepositions');
    const badgeMaster = document.getElementById('badge-master');

    if (badgeStreak) badgeStreak.classList.toggle('locked', this.userData.streak < 3);
    if (badgeVerbs) badgeVerbs.classList.toggle('locked', this.userData.subjectStats.verbs.attempted < 10);
    if (badgeRearrange) badgeRearrange.classList.toggle('locked', this.userData.subjectStats.rearrange.attempted < 10);
    if (badgeArticles) badgeArticles.classList.toggle('locked', this.userData.subjectStats.articles.attempted < 10);
    if (badgePreps) badgePreps.classList.toggle('locked', this.userData.subjectStats.prepositions.attempted < 10);
    if (badgeMaster) badgeMaster.classList.toggle('locked', total < 50);
  }

  resetAllData() {
    if (confirm("মুগ্ধ, তুমি কি নিশ্চিতভাবে তোমার সমস্ত স্টার ও প্র্যাকটিস স্কোর রিসেট করতে চাও?")) {
      localStorage.removeItem('mugdho_app_data');
      this.loadState();
      this.updateHeaderStats();
      this.updateDashboard();
      this.renderMistakes();
      alert("ডাটা সফলভাবে রিসেট করা হয়েছে!");
    }
  }

  bindEvents() {
    // Keyboard navigation (Enter / Space for next)
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'practice' && e.key === 'ArrowRight') {
        this.nextQuestion();
      }
    });
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MugdhoApp();
  window.app.init();
});

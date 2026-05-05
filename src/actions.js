// Mode controllers — start/finish flows, answer recording, navigation.
// These mutate STATE and call render(); the view modules dispatch user actions here.

import {
  VIEWS, MAX_HEARTS, MOCK_DURATION_MS, XP_PER_CORRECT, XP_PERFECT_BONUS,
  SR_EASE_DEFAULT
} from "./constants.js";
import { QBYID } from "./data.js";
import {
  STATE, saveState, compState, maybeBumpStreak
} from "./state.js";
import { announce, fmtTime } from "./helpers.js";
import { buildLessonDeck, buildMockDeck, buildPracticeDeck, buildReviewDeck, buildOrder } from "./decks.js";
import { updateSR } from "./spaced-rep.js";
import { showConfetti } from "./effects.js";
import { showAlert, showConfirm, showOutOfHearts } from "./modals.js";
import { render, setView } from "./router.js";

// ── Mode entry points ─────────────────────────────────────────
export function startMode(mode) {
  if (mode === "mock") startMock();
  else if (mode === "practice") startPractice(null);
  else if (mode === "review") startReview();
  else if (mode === "digcomp3") setView(VIEWS.DIGCOMP3);
}

export function startLesson(comp) {
  if (STATE.user.hearts <= 0) { showOutOfHearts(); return; }
  const e = STATE.ephemeral;
  e.currentMode = VIEWS.LESSON;
  e.lessonComp = comp;
  e.deck = buildLessonDeck(comp);
  if (e.deck.length === 0) { showAlert("No questions for this competence."); return; }
  e.cursor = 0;
  e.lessonResults = [];
  e.startingHearts = STATE.user.hearts;
  e.currentAnswer = null;
  e.sessionStreak = 0;
  e.order = buildOrder(e.deck, false);
  e.mockAnswers = {};
  e.view = VIEWS.LESSON;
  render();
}

export function startMock() {
  showConfirm(
    "Start a 40-question mock test? You will have 30 minutes. The mock does not use hearts.",
    () => {
      const e = STATE.ephemeral;
      e.currentMode = VIEWS.MOCK;
      e.deck = buildMockDeck();
      e.cursor = 0;
      e.lessonResults = [];
      e.mockStart = Date.now();
      e.mockEnd = Date.now() + MOCK_DURATION_MS;
      e.currentAnswer = null;
      e.sessionStreak = 0;
      e.order = buildOrder(e.deck, true);
      e.mockAnswers = {};
      e.view = VIEWS.MOCK;
      startMockTimer();
      render();
    },
    "Start test", "Cancel"
  );
}

export function startPractice(comp) {
  const e = STATE.ephemeral;
  e.currentMode = VIEWS.PRACTICE;
  e.lessonComp = comp;
  e.deck = buildPracticeDeck(comp);
  if (e.deck.length === 0) { showAlert("No questions available."); return; }
  e.cursor = 0;
  e.lessonResults = [];
  e.currentAnswer = null;
  e.sessionStreak = 0;
  e.order = buildOrder(e.deck, false);
  e.mockAnswers = {};
  e.view = VIEWS.PRACTICE;
  render();
}

export function startReview() {
  const e = STATE.ephemeral;
  e.deck = buildReviewDeck();
  if (e.deck.length === 0) { showAlert("Nothing to review yet."); return; }
  e.currentMode = VIEWS.REVIEW;
  e.cursor = 0;
  e.lessonResults = [];
  e.currentAnswer = null;
  e.sessionStreak = 0;
  e.order = buildOrder(e.deck, false);
  e.mockAnswers = {};
  e.view = VIEWS.REVIEW;
  render();
}

// ── Mock timer ────────────────────────────────────────────────
export function startMockTimer() {
  const e = STATE.ephemeral;
  if (e.mockTimer) clearInterval(e.mockTimer);
  e.mockTimer = setInterval(() => {
    const remaining = e.mockEnd - Date.now();
    const t = document.querySelector(".timer");
    if (t) {
      t.textContent = fmtTime(remaining);
      t.classList.toggle("warn", remaining < 5 * 60 * 1000 && remaining >= 60 * 1000);
      t.classList.toggle("crit", remaining < 60 * 1000);
    }
    if (remaining <= 0) {
      clearInterval(e.mockTimer);
      e.mockTimer = null;
      finishMock();
    }
  }, 500);
}

export function stopMockTimer() {
  if (STATE.ephemeral.mockTimer) {
    clearInterval(STATE.ephemeral.mockTimer);
    STATE.ephemeral.mockTimer = null;
  }
}

// ── Answer / advance / quit ───────────────────────────────────
/**
 * Record a candidate's selection.
 *
 * Lesson / practice / review: locks the answer, awards XP / deducts hearts,
 * and shows immediate feedback (existing study-mode behaviour, preserved).
 *
 * Mock test: stores the displayed-position selection in `mockAnswers[id]`
 * without revealing correctness, advancing the cursor, or scoring. The
 * candidate may revise the choice freely until they tap Submit. Scoring
 * happens once in `submitMock()`.
 *
 * `chosen` is the **displayed** option index (0–3) the user clicked.
 *
 * @param {number} chosen
 */
export function recordAnswer(chosen) {
  const e = STATE.ephemeral;
  const id = e.deck[e.cursor];
  if (id == null) return;

  const q = QBYID[id];
  const perm = e.order && e.order[id];
  const originalChosen = perm ? perm[chosen] : chosen;

  if (e.currentMode === VIEWS.MOCK) {
    if (chosen < 0) {
      delete e.mockAnswers[id];
    } else {
      e.mockAnswers[id] = chosen;
    }
    render();
    return;
  }

  if (e.currentAnswer !== null) return;

  const correct = originalChosen === q.a;
  e.currentAnswer = chosen;
  e.lessonResults.push({ id, chosen: originalChosen, correct });

  if (!STATE.qStats[id]) {
    STATE.qStats[id] = { seen: 0, correct: 0, ease: SR_EASE_DEFAULT, interval: 1, due: null };
  }
  STATE.qStats[id].seen += 1;
  if (correct) STATE.qStats[id].correct += 1;
  updateSR(id, correct);

  // Session streak — consecutive correct answers since the mode started
  e.sessionStreak = correct ? (e.sessionStreak || 0) + 1 : 0;
  const streakMultiplier = e.sessionStreak >= 7 ? 2 : e.sessionStreak >= 3 ? 1.5 : 1;

  if (e.currentMode === VIEWS.LESSON) {
    if (!correct) {
      const wasFull = STATE.user.hearts === MAX_HEARTS;
      STATE.user.hearts = Math.max(0, STATE.user.hearts - 1);
      if (wasFull) STATE.user.heartsLastRegen = Date.now();
    } else {
      const xp = Math.round(XP_PER_CORRECT * streakMultiplier);
      STATE.user.xp += xp;
      STATE.user.xpToday += xp;
    }
  } else if (e.currentMode === VIEWS.PRACTICE || e.currentMode === VIEWS.REVIEW) {
    if (correct) {
      const xp = Math.round(Math.floor(XP_PER_CORRECT / 2) * streakMultiplier);
      STATE.user.xp += xp;
      STATE.user.xpToday += xp;
    }
  }
  saveState();

  render();
  announce(correct ? "Correct." : "Incorrect. The correct answer is " + displayedLetter(id, q.a) + ".");
}

/** Letter (A–D) at which the original-index `originalIdx` is displayed for `id`. */
function displayedLetter(id, originalIdx) {
  const perm = STATE.ephemeral.order && STATE.ephemeral.order[id];
  const k = perm ? perm.indexOf(originalIdx) : originalIdx;
  return String.fromCharCode(65 + k);
}

/**
 * Jump to a specific question index. Mock-mode only — other modes are linear.
 * Out-of-range indices are clamped.
 *
 * @param {number} idx
 */
export function gotoQuestion(idx) {
  const e = STATE.ephemeral;
  if (e.currentMode !== VIEWS.MOCK) return;
  if (e.deck.length === 0) return;
  const clamped = Math.max(0, Math.min(e.deck.length - 1, idx));
  if (clamped === e.cursor) return;
  e.cursor = clamped;
  e.currentAnswer = null;
  render();
}

/** Move one question back. Mock-mode only. */
export function previousQuestion() {
  const e = STATE.ephemeral;
  if (e.currentMode !== VIEWS.MOCK) return;
  if (e.cursor > 0) {
    e.cursor -= 1;
    e.currentAnswer = null;
    render();
  }
}

/**
 * Move one question forward. In MOCK mode this only navigates — no submit.
 * Other modes still call `advance()` which handles end-of-deck.
 */
export function nextQuestion() {
  const e = STATE.ephemeral;
  if (e.currentMode !== VIEWS.MOCK) return;
  if (e.cursor < e.deck.length - 1) {
    e.cursor += 1;
    e.currentAnswer = null;
    render();
  }
}

/**
 * Confirm and finalise a mock test. Walks the deck to compute the score
 * from `mockAnswers` (mapping displayed → original indices) and produces
 * the same lessonResults shape the results screen already consumes.
 */
export function submitMock() {
  const e = STATE.ephemeral;
  if (e.currentMode !== VIEWS.MOCK) return;
  const answered = Object.keys(e.mockAnswers).length;
  const total = e.deck.length;
  const remaining = total - answered;
  const msg = remaining > 0
    ? "You are about to submit your test. " + remaining + " of " + total + " questions are unanswered. Are you sure you want to finish?"
    : "You are about to submit your test. Are you sure you want to finish?";
  showConfirm(msg, () => finalizeMock(), "Submit test", "Keep going");
}

/** Internal: compile lessonResults from mockAnswers and call finishMock. */
function finalizeMock() {
  const e = STATE.ephemeral;
  e.lessonResults = e.deck.map(id => {
    const q = QBYID[id];
    const perm = e.order && e.order[id];
    const displayed = e.mockAnswers[id];
    if (displayed === undefined) {
      return { id, chosen: -1, correct: false };
    }
    const originalChosen = perm ? perm[displayed] : displayed;
    return { id, chosen: originalChosen, correct: originalChosen === q.a };
  });
  // Update qStats once at submission (so hearts/SR don't track in-progress edits)
  e.lessonResults.forEach(r => {
    if (r.chosen < 0) return;
    if (!STATE.qStats[r.id]) {
      STATE.qStats[r.id] = { seen: 0, correct: 0, ease: SR_EASE_DEFAULT, interval: 1, due: null };
    }
    STATE.qStats[r.id].seen += 1;
    if (r.correct) STATE.qStats[r.id].correct += 1;
    updateSR(r.id, r.correct);
  });
  saveState();
  finishMock();
}

export function toggleFlag(id) {
  if (STATE.flagged[id]) delete STATE.flagged[id];
  else STATE.flagged[id] = true;
  saveState();
  render();
}

export function advance() {
  const e = STATE.ephemeral;
  // Mock mode no longer auto-advances on answer; nav is explicit via Prev/Next.
  if (e.currentMode === VIEWS.MOCK) {
    if (e.cursor < e.deck.length - 1) nextQuestion();
    return;
  }
  if (e.currentMode === VIEWS.LESSON && STATE.user.hearts <= 0) {
    finishLesson(false);
    return;
  }
  if (e.cursor < e.deck.length - 1) {
    e.cursor++;
    e.currentAnswer = null;
    render();
  } else {
    if (e.currentMode === VIEWS.LESSON) finishLesson(true);
    else finishPracticeOrReview();
  }
}

export function quitMode() {
  const e = STATE.ephemeral;
  if (e.currentMode === VIEWS.MOCK) {
    showConfirm("Leave the mock test? Your selections will be discarded and the test ended without scoring.", goHome, "Leave test", "Keep going");
  } else if (e.currentMode === VIEWS.LESSON) {
    showConfirm("Quit the lesson? Progress in this lesson will not count.", goHome, "Quit", "Keep going");
  } else {
    goHome();
  }
}

export function goHome() {
  stopMockTimer();
  const e = STATE.ephemeral;
  e.currentMode = null;
  e.deck = [];
  e.cursor = 0;
  e.currentAnswer = null;
  e.order = {};
  e.mockAnswers = {};
  setView(VIEWS.HOME);
}

// ── Lesson / mock / practice end flows ────────────────────────
export function finishLesson(completedFully) {
  const e = STATE.ephemeral;
  const comp = e.lessonComp;
  const cs = compState(comp);
  const correctN = e.lessonResults.filter(r => r.correct).length;
  const perfect = completedFully && correctN === e.deck.length;
  const prevCrown = cs.crown;

  if (completedFully) {
    cs.completedLessons += 1;
    if (perfect) {
      cs.perfectLessons += 1;
      STATE.user.xp += XP_PERFECT_BONUS;
      STATE.user.xpToday += XP_PERFECT_BONUS;
    }
    if (perfect && cs.crown < 4) {
      cs.crown = Math.min(4, cs.crown + 1);
    } else if (!perfect && cs.crown === 0 && correctN >= 3) {
      cs.crown = 1;
    }
  }
  if (cs.crown > prevCrown) showConfetti();
  saveState();
  maybeBumpStreak();

  e.view = VIEWS.LESSON_END;
  e.lessonEnd = {
    completedFully,
    perfect,
    correctN,
    totalQuestions: e.deck.length,
    newCrown: cs.crown,
    bonus: perfect ? "+" + XP_PERFECT_BONUS + " perfect bonus" : "",
    xpEarned: correctN * XP_PER_CORRECT + (perfect ? XP_PERFECT_BONUS : 0)
  };
  render();
}

export function finishPracticeOrReview() {
  const e = STATE.ephemeral;
  const r = e.lessonResults;
  const correct = r.filter(x => x.correct).length;
  e.lessonEnd = {
    completedFully: true,
    perfect: correct === r.length,
    correctN: correct,
    totalQuestions: r.length,
    newCrown: e.lessonComp ? compState(e.lessonComp).crown : 0,
    bonus: "",
    xpEarned: correct * Math.floor(XP_PER_CORRECT / 2)
  };
  e.view = VIEWS.LESSON_END;
  maybeBumpStreak();
  saveState();
  render();
}

export function finishMock() {
  stopMockTimer();
  const e = STATE.ephemeral;
  const score = e.lessonResults.filter(r => r.correct).length;
  const total = e.deck.length;
  const mockXp = score * 5;
  STATE.user.xp += mockXp;
  STATE.user.xpToday += mockXp;
  saveState();
  maybeBumpStreak();
  e.mockResult = { score, total, xp: mockXp, elapsed: Date.now() - e.mockStart };
  e.view = VIEWS.MOCK_END;
  render();
}

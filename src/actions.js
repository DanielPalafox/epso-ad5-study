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
import { buildLessonDeck, buildMockDeck, buildPracticeDeck, buildReviewDeck } from "./decks.js";
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
export function recordAnswer(chosen) {
  const e = STATE.ephemeral;
  const id = e.deck[e.cursor];
  if (id == null) return;
  if (e.currentAnswer !== null) return;

  const q = QBYID[id];
  const correct = chosen === q.a;
  e.currentAnswer = chosen;
  e.lessonResults.push({ id, chosen, correct });

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

  if (e.currentMode === VIEWS.MOCK) {
    advance();
  } else {
    render();
    announce(correct ? "Correct." : "Incorrect. The correct answer is " + String.fromCharCode(65 + q.a) + ".");
  }
}

export function toggleFlag(id) {
  if (STATE.flagged[id]) delete STATE.flagged[id];
  else STATE.flagged[id] = true;
  saveState();
  render();
}

export function advance() {
  const e = STATE.ephemeral;
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
    else if (e.currentMode === VIEWS.MOCK) finishMock();
    else finishPracticeOrReview();
  }
}

export function quitMode() {
  const e = STATE.ephemeral;
  if (e.currentMode === VIEWS.MOCK) {
    showConfirm("End the mock test now? Unanswered questions will count as wrong.", finishMock, "End test", "Keep going");
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

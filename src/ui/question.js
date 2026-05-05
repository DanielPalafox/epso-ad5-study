// Question view — renders the qbar, card, options, and answer panel.
//
// Two layouts share this file:
//   - Study layout (lesson, practice, review): immediate feedback, single
//     forward-only flow, hearts on the qbar.
//   - Exam layout (mock test): no feedback, freely changeable selections,
//     question-number bar, Previous/Next, and a final Submit button.

import { VIEWS, MAX_HEARTS, CORRECT_MSGS, WRONG_MSGS } from "../constants.js";
import { QBYID, COMP_NAMES } from "../data.js";
import { STATE } from "../state.js";
import { escapeHTML, fmtTime, pickRandom } from "../helpers.js";
import { heartRow } from "../html.js";
import {
  recordAnswer, advance, quitMode, toggleFlag, goHome,
  previousQuestion, nextQuestion, gotoQuestion, submitMock
} from "../actions.js";

export function renderQuestion() {
  const e = STATE.ephemeral;
  if (e.currentMode === VIEWS.MOCK) return renderMockQuestion();
  return renderStudyQuestion();
}

// ── Shared helpers ────────────────────────────────────────────

/**
 * Returns the displayed-order options array and the displayed-position of the
 * correct answer. Falls back to original order if no permutation is set
 * (defensive — every active mode now sets `order` at start).
 */
function displayedOptions(id) {
  const q = QBYID[id];
  const perm = STATE.ephemeral.order && STATE.ephemeral.order[id];
  if (!perm || perm.length !== 4) {
    return { options: q.o, correctDisplayed: q.a };
  }
  return {
    options: perm.map(i => q.o[i]),
    correctDisplayed: perm.indexOf(q.a)
  };
}

// ── Study layout (lesson / practice / review) ────────────────

function renderStudyQuestion() {
  const wrap = document.createElement("div");
  wrap.className = "qview";
  const e = STATE.ephemeral;
  const id = e.deck[e.cursor];
  if (id == null) {
    wrap.innerHTML = '<div class="empty">No more questions.</div><div class="empty-actions"><button class="btn primary" data-act="home">Back home</button></div>';
    wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
    return wrap;
  }

  const q = QBYID[id];
  const { options, correctDisplayed } = displayedOptions(id);
  const answered = e.currentAnswer !== null;
  const showFeedback = answered;
  const progress = ((e.cursor + (answered ? 1 : 0)) / e.deck.length) * 100;

  // qbar
  let qbarHtml = '<div class="qbar"><div class="qbar-left">';
  qbarHtml += '<button class="quit" data-act="quit" aria-label="Quit">×</button>';
  qbarHtml += '<div class="progress-bar"><div class="fill" style="width:' + progress + '%"></div></div>';
  qbarHtml += '</div><div class="qbar-right">';
  if (e.currentMode === VIEWS.LESSON) {
    qbarHtml += heartRow(STATE.user.hearts, STATE.user.hearts + ' hearts remaining');
  }
  if (e.sessionStreak >= 3) {
    qbarHtml += '<span class="streak-counter" title="' + e.sessionStreak + ' in a row! XP bonus active">';
    qbarHtml += (e.sessionStreak >= 7 ? '🔥×2 ' : '🔥×1.5 ') + e.sessionStreak;
    qbarHtml += '</span>';
  }
  qbarHtml += '<span class="qbar-counter">' + (e.cursor + 1) + '/' + e.deck.length + '</span>';
  qbarHtml += '</div></div>';
  wrap.insertAdjacentHTML("beforeend", qbarHtml);

  // card
  const card = document.createElement("div");
  card.className = "qcard";
  const isFlagged = !!STATE.flagged[id];

  let h = '';
  h += '<div class="qmeta">';
  h += '<span><span class="competence-tag">' + q.c + '</span> · ' + escapeHTML(COMP_NAMES[q.c] || q.c) + ' · <em>' + escapeHTML(q.t) + '</em></span>';
  h += '<button class="flag-btn ' + (isFlagged ? 'flagged' : '') + '" data-act="flag" title="Flag (F)">' + (isFlagged ? '★ Flagged' : '☆ Flag') + '</button>';
  h += '</div>';
  h += '<h2 class="qstem">' + escapeHTML(q.q) + '</h2>';

  h += '<ul class="opts" role="radiogroup" aria-label="Answer options">';
  options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    let cls = "opt";
    if (showFeedback) {
      cls += " locked";
      if (idx === correctDisplayed) cls += " correct";
      if (e.currentAnswer === idx && idx !== correctDisplayed) cls += " wrong";
    } else if (answered && e.currentAnswer === idx) {
      cls += " selected locked";
    }
    const marker = showFeedback ? (idx === correctDisplayed ? "✓" : (e.currentAnswer === idx ? "✕" : "")) : "";
    h += '<li class="' + cls + '" data-idx="' + idx + '" tabindex="' + (showFeedback ? -1 : 0) + '" role="radio" aria-checked="' + (e.currentAnswer === idx) + '">';
    h += '<span class="key">' + letter + '</span>';
    h += '<span class="body">' + escapeHTML(opt) + '</span>';
    if (marker) h += '<span class="marker">' + marker + '</span>';
    h += '</li>';
  });
  h += '</ul>';

  h += '<div class="qfoot">';
  h += '<div class="left">Press <kbd>1</kbd>–<kbd>4</kbd> · <kbd>F</kbd> flag · <kbd>Enter</kbd> next</div>';
  h += '<div class="right"></div>';
  h += '</div>';

  card.innerHTML = h;
  if (answered) wrap.classList.add("answered");
  wrap.appendChild(card);

  // answer panel (slides up on mobile)
  const panel = document.createElement("div");
  if (showFeedback) {
    const correct = e.currentAnswer === correctDisplayed;
    const isLast = e.cursor === e.deck.length - 1;
    panel.className = "answer-panel " + (correct ? "correct" : "wrong") + " visible";
    panel.setAttribute("role", "region");
    const feedbackHead = correct
      ? pickRandom(CORRECT_MSGS)
      : pickRandom(WRONG_MSGS) + " Correct answer: " + String.fromCharCode(65 + correctDisplayed);
    panel.innerHTML =
      '<div class="panel-body">' +
      '<div class="panel-head">' + feedbackHead + '</div>' +
      '<div class="panel-text">' + escapeHTML(q.e) + '</div>' +
      '</div>' +
      '<button class="btn primary wide" data-act="next">' + (isLast ? "Finish" : "Continue →") + '</button>';
  } else {
    panel.className = "answer-panel";
  }
  wrap.appendChild(panel);

  // wiring
  wrap.querySelector("[data-act='quit']")?.addEventListener("click", quitMode);
  card.querySelectorAll(".opt:not(.locked)").forEach(el => {
    const li = /** @type {HTMLElement} */ (el);
    li.addEventListener("click", () => recordAnswer(parseInt(li.dataset.idx || "0", 10)));
    li.addEventListener("keydown", evt => {
      const ev = /** @type {KeyboardEvent} */ (evt);
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        recordAnswer(parseInt(li.dataset.idx || "0", 10));
      }
    });
  });
  card.querySelector("[data-act='flag']")?.addEventListener("click", () => toggleFlag(id));
  panel.querySelector("[data-act='next']")?.addEventListener("click", advance);

  return wrap;
}

// ── Exam layout (mock test) ──────────────────────────────────

function renderMockQuestion() {
  const wrap = document.createElement("div");
  wrap.className = "qview qview--exam";
  const e = STATE.ephemeral;
  const id = e.deck[e.cursor];
  if (id == null) {
    wrap.innerHTML = '<div class="empty">No more questions.</div><div class="empty-actions"><button class="btn primary" data-act="home">Back home</button></div>';
    wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
    return wrap;
  }

  const q = QBYID[id];
  const total = e.deck.length;
  const answeredCount = Object.keys(e.mockAnswers).length;
  const remaining = total - answeredCount;
  const selectedDisplayed = e.mockAnswers[id];
  const isFlagged = !!STATE.flagged[id];
  const { options } = displayedOptions(id);

  // qbar (exit + timer + counter — no hearts/streak in mock)
  let qbarHtml = '<div class="qbar"><div class="qbar-left">';
  qbarHtml += '<button class="quit" data-act="quit" aria-label="Quit">×</button>';
  qbarHtml += '<span class="exam-progress" aria-live="polite">Answered: <strong>' + answeredCount + '</strong> / ' + total + ' · Remaining: <strong>' + remaining + '</strong></span>';
  qbarHtml += '</div><div class="qbar-right">';
  qbarHtml += '<div class="timer">' + fmtTime(e.mockEnd - Date.now()) + '</div>';
  qbarHtml += '<span class="qbar-counter">Q ' + (e.cursor + 1) + '/' + total + '</span>';
  qbarHtml += '</div></div>';
  wrap.insertAdjacentHTML("beforeend", qbarHtml);

  // question-number bar (jump-to-any)
  const navBar = document.createElement("nav");
  navBar.className = "qnum-bar";
  navBar.setAttribute("aria-label", "Question navigation");
  let navHtml = '';
  for (let i = 0; i < total; i++) {
    const idAtIdx = e.deck[i];
    const answered = e.mockAnswers[idAtIdx] !== undefined;
    const flagged = !!STATE.flagged[idAtIdx];
    const isCurrent = i === e.cursor;
    let cls = "qnum";
    if (isCurrent) cls += " current";
    if (answered) cls += " answered";
    else cls += " unanswered";
    if (flagged) cls += " flagged";
    const aria = (answered ? "answered" : "unanswered") + (flagged ? ", flagged" : "") + (isCurrent ? ", current" : "");
    navHtml += '<button type="button" class="' + cls + '" data-goto="' + i + '" aria-label="Question ' + (i + 1) + ', ' + aria + '" aria-current="' + (isCurrent ? "true" : "false") + '">' + (i + 1) + '</button>';
  }
  navBar.innerHTML = navHtml;
  wrap.appendChild(navBar);

  // card
  const card = document.createElement("div");
  card.className = "qcard";
  let h = '';
  h += '<div class="qmeta">';
  h += '<span><span class="competence-tag">' + q.c + '</span> · ' + escapeHTML(COMP_NAMES[q.c] || q.c) + ' · <em>' + escapeHTML(q.t) + '</em></span>';
  h += '<button class="flag-btn ' + (isFlagged ? 'flagged' : '') + '" data-act="flag" title="Flag (F)">' + (isFlagged ? '★ Flagged' : '☆ Flag') + '</button>';
  h += '</div>';
  h += '<h2 class="qstem">' + escapeHTML(q.q) + '</h2>';

  h += '<ul class="opts" role="radiogroup" aria-label="Answer options">';
  options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    let cls = "opt";
    if (selectedDisplayed === idx) cls += " selected";
    h += '<li class="' + cls + '" data-idx="' + idx + '" tabindex="0" role="radio" aria-checked="' + (selectedDisplayed === idx) + '">';
    h += '<span class="key">' + letter + '</span>';
    h += '<span class="body">' + escapeHTML(opt) + '</span>';
    h += '</li>';
  });
  h += '</ul>';

  card.innerHTML = h;
  wrap.appendChild(card);

  // exam navigation footer
  const examNav = document.createElement("div");
  examNav.className = "exam-nav";
  const isFirst = e.cursor === 0;
  const isLast = e.cursor === total - 1;
  let navFootHtml = '';
  navFootHtml += '<button type="button" class="btn ghost" data-act="prev"' + (isFirst ? ' disabled' : '') + '>← Previous</button>';
  navFootHtml += '<button type="button" class="btn ghost" data-act="clear"' + (selectedDisplayed === undefined ? ' disabled' : '') + '>Clear selection</button>';
  if (isLast) {
    navFootHtml += '<button type="button" class="btn primary" data-act="submit">Submit test</button>';
  } else {
    navFootHtml += '<button type="button" class="btn primary" data-act="next">Next →</button>';
  }
  examNav.innerHTML = navFootHtml;
  wrap.appendChild(examNav);

  // persistent submit (visible on every question, not just the last)
  const submitRow = document.createElement("div");
  submitRow.className = "exam-submit-row";
  submitRow.innerHTML =
    '<span class="exam-submit-hint">Submit when ready — no answers will be revealed until you do.</span>' +
    '<button type="button" class="btn ghost small" data-act="submit-anywhere">Submit test</button>';
  wrap.appendChild(submitRow);

  // wiring
  wrap.querySelector("[data-act='quit']")?.addEventListener("click", quitMode);
  card.querySelector("[data-act='flag']")?.addEventListener("click", () => toggleFlag(id));
  card.querySelectorAll(".opt").forEach(el => {
    const li = /** @type {HTMLElement} */ (el);
    li.addEventListener("click", () => recordAnswer(parseInt(li.dataset.idx || "0", 10)));
    li.addEventListener("keydown", evt => {
      const ev = /** @type {KeyboardEvent} */ (evt);
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        recordAnswer(parseInt(li.dataset.idx || "0", 10));
      }
    });
  });
  navBar.querySelectorAll(".qnum").forEach(el => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.addEventListener("click", () => gotoQuestion(parseInt(btn.dataset.goto || "0", 10)));
  });
  examNav.querySelector("[data-act='prev']")?.addEventListener("click", previousQuestion);
  examNav.querySelector("[data-act='next']")?.addEventListener("click", nextQuestion);
  examNav.querySelector("[data-act='submit']")?.addEventListener("click", submitMock);
  examNav.querySelector("[data-act='clear']")?.addEventListener("click", () => recordAnswer(-1));
  submitRow.querySelector("[data-act='submit-anywhere']")?.addEventListener("click", submitMock);

  return wrap;
}

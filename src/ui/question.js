// Question view — the qbar (progress, hearts/timer, streak), card, options, and answer panel.

import { VIEWS, MAX_HEARTS, CORRECT_MSGS, WRONG_MSGS } from "../constants.js";
import { QBYID, COMP_NAMES } from "../data.js";
import { STATE } from "../state.js";
import { escapeHTML, fmtTime, pickRandom } from "../helpers.js";
import { heartRow } from "../html.js";
import { recordAnswer, advance, quitMode, toggleFlag, goHome } from "../actions.js";

export function renderQuestion() {
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
  const answered = e.currentAnswer !== null;
  const showFeedback = answered && e.currentMode !== VIEWS.MOCK;
  const progress = ((e.cursor + (answered ? 1 : 0)) / e.deck.length) * 100;

  // ── qbar (progress + status) ────────────────────────────────
  let qbarHtml = '<div class="qbar"><div class="qbar-left">';
  qbarHtml += '<button class="quit" data-act="quit" aria-label="Quit">×</button>';
  qbarHtml += '<div class="progress-bar"><div class="fill" style="width:' + progress + '%"></div></div>';
  qbarHtml += '</div><div class="qbar-right">';
  if (e.currentMode === VIEWS.MOCK) {
    qbarHtml += '<div class="timer">' + fmtTime(e.mockEnd - Date.now()) + '</div>';
  } else if (e.currentMode === VIEWS.LESSON) {
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

  // ── card ────────────────────────────────────────────────────
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
  q.o.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    let cls = "opt";
    if (showFeedback) {
      cls += " locked";
      if (idx === q.a) cls += " correct";
      if (e.currentAnswer === idx && idx !== q.a) cls += " wrong";
    } else if (answered && e.currentAnswer === idx) {
      cls += " selected locked";
    }
    const marker = showFeedback ? (idx === q.a ? "✓" : (e.currentAnswer === idx ? "✕" : "")) : "";
    h += '<li class="' + cls + '" data-idx="' + idx + '" tabindex="' + (showFeedback ? -1 : 0) + '" role="radio" aria-checked="' + (e.currentAnswer === idx) + '">';
    h += '<span class="key">' + letter + '</span>';
    h += '<span class="body">' + escapeHTML(opt) + '</span>';
    if (marker) h += '<span class="marker">' + marker + '</span>';
    h += '</li>';
  });
  h += '</ul>';

  h += '<div class="qfoot">';
  h += '<div class="left">Press <kbd>1</kbd>–<kbd>4</kbd> · <kbd>F</kbd> flag · <kbd>Enter</kbd> next</div>';
  h += '<div class="right">';
  if (!answered && e.currentMode === VIEWS.MOCK) {
    h += '<button class="btn ghost small" data-act="skip">Skip →</button>';
  }
  h += '</div>';
  h += '</div>';

  card.innerHTML = h;
  if (answered) wrap.classList.add("answered");
  wrap.appendChild(card);

  // ── answer panel (slides up on mobile) ──────────────────────
  const panel = document.createElement("div");
  if (showFeedback) {
    const correct = e.currentAnswer === q.a;
    const isLast = e.cursor === e.deck.length - 1;
    panel.className = "answer-panel " + (correct ? "correct" : "wrong") + " visible";
    panel.setAttribute("role", "region");
    const feedbackHead = correct
      ? pickRandom(CORRECT_MSGS)
      : pickRandom(WRONG_MSGS) + " Correct answer: " + String.fromCharCode(65 + q.a);
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

  // ── wiring ──────────────────────────────────────────────────
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
  card.querySelector("[data-act='skip']")?.addEventListener("click", () => { recordAnswer(-1); advance(); });

  return wrap;
}

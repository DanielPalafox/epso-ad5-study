// Deck builders for each game mode. Each returns an array of question ids.

import { QUESTIONS_PER_LESSON } from "./constants.js";
import { QUESTIONS, QBYC } from "./data.js";
import { STATE, compState } from "./state.js";
import { shuffle, isoDate } from "./helpers.js";

export function buildLessonDeck(comp) {
  const all = (QBYC[comp] || []).slice();
  if (all.length === 0) return [];
  const cs = compState(comp);

  let pool;
  if (cs.crown === 0) pool = all.filter(q => q.d <= 2);
  else if (cs.crown === 1) pool = all;
  else pool = all.filter(q => q.d >= 2);

  if (pool.length < QUESTIONS_PER_LESSON) pool = all;

  // Prefer items previously answered wrong, then least-seen
  pool.sort((a, b) => {
    const sa = STATE.qStats[a.i] || { seen: 0, correct: 0 };
    const sb = STATE.qStats[b.i] || { seen: 0, correct: 0 };
    const errA = sa.seen ? sa.seen - sa.correct : 0;
    const errB = sb.seen ? sb.seen - sb.correct : 0;
    if (errA !== errB) return errB - errA;
    return sa.seen - sb.seen;
  });

  return shuffle(pool.slice(0, Math.max(QUESTIONS_PER_LESSON * 2, 8)))
    .slice(0, QUESTIONS_PER_LESSON)
    .map(q => q.i);
}

export function buildMockDeck() {
  const deck = [];
  for (let area = 1; area <= 5; area++) {
    const aq = QUESTIONS.filter(q => parseInt(q.c[0], 10) === area);
    deck.push(...shuffle(aq).slice(0, 8).map(q => q.i));
  }
  return shuffle(deck);
}

export function buildPracticeDeck(comp) {
  const all = comp ? (QBYC[comp] || []).slice() : QUESTIONS.slice();
  return shuffle(all).map(q => q.i).slice(0, 20);
}

/**
 * Spaced-repetition-aware review deck.
 * Order: due/overdue items first, then never-due wrong items, then flagged-only items.
 */
export function buildReviewDeck() {
  const today = isoDate();
  const due = [], wrong = [], flagged = [];

  Object.keys(STATE.qStats).forEach(id => {
    const s = STATE.qStats[id];
    if (s.due && s.due <= today) due.push(id);
    else if (s.seen > 0 && s.correct < s.seen) wrong.push(id);
  });

  Object.keys(STATE.flagged).forEach(id => {
    if (STATE.flagged[id] && !due.includes(id) && !wrong.includes(id)) flagged.push(id);
  });

  return [...shuffle(due), ...shuffle(wrong), ...shuffle(flagged)];
}

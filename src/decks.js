// Deck builders for each game mode. Each returns an array of question ids.

import { QUESTIONS_PER_LESSON } from "./constants.js";
import { QUESTIONS, QBYC, QBYID } from "./data.js";
import { STATE, compState } from "./state.js";
import { shuffle, isoDate } from "./helpers.js";
import { buildBalancedOrder, buildShuffledOrder, positionStats } from "./options.js";

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

/**
 * Build a per-question option permutation map for `deck` and validate that
 * the resulting correct-answer positions are balanced and not predictable.
 *
 * Validation criteria for a 40-question test:
 *   - each of A/B/C/D appears 10±1 times (close-to-25/25/25/25);
 *   - no position has more than (target + 2) occurrences;
 *   - no run of identical correct positions exceeds 3.
 * If a generated order fails, regenerate up to `maxAttempts` times before
 * giving up and returning the best one.
 *
 * @param {string[]} deck
 * @returns {Record<string, number[]>}
 */
export function buildBalancedOrderForMock(deck) {
  const target = Math.floor(deck.length / 4);
  const tolerance = 1;
  const maxStreak = 3;
  const maxAttempts = 50;

  let best = buildBalancedOrder(deck, QBYID);
  let bestScore = scoreOrder(deck, best, target);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const stats = positionStats(deck, best, QBYID);
    const within = stats.counts.every(c => Math.abs(c - target) <= tolerance);
    if (within && stats.maxRun <= maxStreak) return best;

    const candidate = buildBalancedOrder(deck, QBYID);
    const score = scoreOrder(deck, candidate, target);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Lower is better. Penalises deviation from target counts and long streaks.
 * @param {string[]} deck
 * @param {Record<string, number[]>} order
 * @param {number} target
 * @returns {number}
 */
function scoreOrder(deck, order, target) {
  const stats = positionStats(deck, order, QBYID);
  const dev = stats.counts.reduce((acc, c) => acc + Math.abs(c - target), 0);
  return dev * 10 + Math.max(0, stats.maxRun - 3) * 5;
}

/**
 * Build a permutation map for any deck size. Mock decks get the balanced
 * variant; smaller decks (lessons, practice, review) get a per-question
 * shuffle. The returned map is suitable for assigning to STATE.ephemeral.order.
 *
 * @param {string[]} deck
 * @param {boolean} balanced
 * @returns {Record<string, number[]>}
 */
export function buildOrder(deck, balanced) {
  if (balanced) return buildBalancedOrderForMock(deck);
  return buildShuffledOrder(deck, QBYID);
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

// @ts-check
// Option-order helpers.
//
// Each question in the bank stores its options at fixed positions with `q.a`
// pointing at the correct one. To stop candidates from spotting "the longest
// option" or memorising letter patterns from the data file, we assign every
// in-flight question its own permutation of the four option indices.
//
// `STATE.ephemeral.order[id]` holds a 4-element array `perm` where
// `q.o[perm[k]]` is shown at displayed position k (A/B/C/D).
//
// For the 40-question mock test we additionally enforce a balanced
// distribution of correct-answer positions (~25% each across A/B/C/D),
// so guessing a single letter buys the candidate nothing.

import { shuffle } from "./helpers.js";

/**
 * Build a balanced permutation map for a deck.
 *
 * The displayed-correct position of each question is drawn from a target list
 * that contains each of {0,1,2,3} as evenly as possible (floor(n/4) each, with
 * the remainder spread). The list is shuffled so order/streaks are not
 * predictable either.
 *
 * @param {string[]} deck
 * @param {Record<string, any>} qById
 * @returns {Record<string, number[]>}
 */
export function buildBalancedOrder(deck, qById) {
  const n = deck.length;
  const base = Math.floor(n / 4);
  const counts = [base, base, base, base];
  const remainder = n - base * 4;
  for (let i = 0; i < remainder; i++) counts[i] += 1;

  const targetSlots = [];
  for (let pos = 0; pos < 4; pos++) {
    for (let j = 0; j < counts[pos]; j++) targetSlots.push(pos);
  }
  const shuffledTargets = shuffle(targetSlots);
  // Avoid long streaks of the same letter — exam keys typically do not have
  // 4+ identical answers in a row even when balanced overall.
  reduceStreaks(shuffledTargets, 3);

  /** @type {Record<string, number[]>} */
  const order = {};
  deck.forEach((id, idx) => {
    const q = qById[id];
    if (!q) return;
    const desired = shuffledTargets[idx];
    order[id] = permutationWithCorrectAt(q.a, desired);
  });
  return order;
}

/**
 * Build a per-question shuffled permutation map (no balancing). Used for
 * lesson, practice, and review modes where the deck is too small for
 * meaningful position balancing.
 *
 * @param {string[]} deck
 * @param {Record<string, any>} qById
 * @returns {Record<string, number[]>}
 */
export function buildShuffledOrder(deck, qById) {
  /** @type {Record<string, number[]>} */
  const order = {};
  deck.forEach(id => {
    const q = qById[id];
    if (!q) return;
    order[id] = shuffle([0, 1, 2, 3]);
  });
  return order;
}

/**
 * Returns a 4-permutation in which the original index `correctOriginal`
 * lands at displayed position `desiredDisplayed`. The other three indices
 * are placed in shuffled order in the remaining slots.
 *
 * @param {number} correctOriginal
 * @param {number} desiredDisplayed
 * @returns {number[]}
 */
export function permutationWithCorrectAt(correctOriginal, desiredDisplayed) {
  const others = shuffle([0, 1, 2, 3].filter(i => i !== correctOriginal));
  const perm = [0, 0, 0, 0];
  perm[desiredDisplayed] = correctOriginal;
  let oi = 0;
  for (let k = 0; k < 4; k++) {
    if (k === desiredDisplayed) continue;
    perm[k] = others[oi++];
  }
  return perm;
}

/**
 * In-place mutation: walks the array and swaps any element that would
 * extend a same-value run past `maxRun` with the next non-conflicting one.
 * Best-effort — guarantees no run longer than maxRun if the multiset allows.
 *
 * @param {number[]} arr
 * @param {number} maxRun
 */
export function reduceStreaks(arr, maxRun) {
  for (let i = maxRun; i < arr.length; i++) {
    let run = 1;
    for (let k = i - 1; k >= 0 && arr[k] === arr[i]; k--) run++;
    if (run <= maxRun) continue;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] !== arr[i]) {
        [arr[i], arr[j]] = [arr[j], arr[i]];
        break;
      }
    }
  }
}

/**
 * Position summary of a balanced order. Useful for tests and diagnostics.
 *
 * @param {string[]} deck
 * @param {Record<string, number[]>} order
 * @param {Record<string, any>} qById
 * @returns {{ counts: number[], maxRun: number, sequence: number[] }}
 */
export function positionStats(deck, order, qById) {
  const counts = [0, 0, 0, 0];
  /** @type {number[]} */
  const sequence = [];
  deck.forEach(id => {
    const perm = order[id];
    const q = qById[id];
    if (!perm || !q) return;
    const displayed = perm.indexOf(q.a);
    counts[displayed] += 1;
    sequence.push(displayed);
  });
  let maxRun = 0;
  let cur = 0;
  let prev = -1;
  sequence.forEach(v => {
    if (v === prev) cur += 1; else cur = 1;
    if (cur > maxRun) maxRun = cur;
    prev = v;
  });
  return { counts, maxRun, sequence };
}

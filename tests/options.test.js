import { describe, it, expect } from "vitest";
import {
  buildBalancedOrder,
  buildShuffledOrder,
  permutationWithCorrectAt,
  positionStats,
  reduceStreaks
} from "../src/options.js";

// Synthetic 40-question deck — only `a` (correct index) matters for these tests.
function makeDeck(n) {
  const qById = {};
  const deck = [];
  for (let k = 0; k < n; k++) {
    const id = "q" + k;
    qById[id] = { o: ["a", "b", "c", "d"], a: k % 4 };
    deck.push(id);
  }
  return { deck, qById };
}

describe("permutationWithCorrectAt", () => {
  it("places the correct original index at the requested displayed slot", () => {
    for (let original = 0; original < 4; original++) {
      for (let target = 0; target < 4; target++) {
        const perm = permutationWithCorrectAt(original, target);
        expect(perm).toHaveLength(4);
        expect(perm[target]).toBe(original);
        expect(new Set(perm).size).toBe(4);
        [0, 1, 2, 3].forEach(i => expect(perm).toContain(i));
      }
    }
  });
});

describe("buildBalancedOrder", () => {
  it("yields a permutation per question", () => {
    const { deck, qById } = makeDeck(40);
    const order = buildBalancedOrder(deck, qById);
    deck.forEach(id => {
      expect(order[id]).toHaveLength(4);
      expect(new Set(order[id]).size).toBe(4);
    });
  });

  it("balances correct-answer positions to ≈25/25/25/25 for a 40-question deck", () => {
    const { deck, qById } = makeDeck(40);
    const order = buildBalancedOrder(deck, qById);
    const { counts } = positionStats(deck, order, qById);
    counts.forEach(c => expect(c).toBe(10));
  });

  it("distributes the remainder when n is not a multiple of 4", () => {
    const { deck, qById } = makeDeck(38);
    const order = buildBalancedOrder(deck, qById);
    const { counts } = positionStats(deck, order, qById);
    expect(counts.reduce((a, b) => a + b)).toBe(38);
    counts.forEach(c => expect(c === 9 || c === 10).toBe(true));
  });
});

describe("buildShuffledOrder", () => {
  it("yields a 4-permutation per question", () => {
    const { deck, qById } = makeDeck(10);
    const order = buildShuffledOrder(deck, qById);
    deck.forEach(id => {
      expect(order[id]).toHaveLength(4);
      expect(new Set(order[id]).size).toBe(4);
    });
  });
});

describe("reduceStreaks", () => {
  it("breaks runs of length > maxRun when other values exist", () => {
    const arr = [1, 1, 1, 1, 2, 3, 0];
    reduceStreaks(arr, 2);
    let run = 1, max = 1;
    for (let i = 1; i < arr.length; i++) {
      if (arr[i] === arr[i - 1]) run += 1; else run = 1;
      if (run > max) max = run;
    }
    expect(max).toBeLessThanOrEqual(2);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { buildLessonDeck, buildMockDeck, buildPracticeDeck, buildReviewDeck } from "../src/decks.js";
import { initState, STATE } from "../src/state.js";

beforeEach(() => {
  localStorage.clear();
  initState();
});

describe("buildLessonDeck", () => {
  it("returns ids from the requested competence", () => {
    const deck = buildLessonDeck("1.1");
    expect(deck.length).toBeGreaterThan(0);
    deck.forEach(id => expect(id.startsWith("1.1")).toBe(true));
  });

  it("returns at most QUESTIONS_PER_LESSON ids", () => {
    const deck = buildLessonDeck("1.1");
    expect(deck.length).toBeLessThanOrEqual(5);
  });

  it("returns an empty array for an unknown competence", () => {
    expect(buildLessonDeck("nope")).toEqual([]);
  });
});

describe("buildMockDeck", () => {
  it("returns ids from the question bank", () => {
    const deck = buildMockDeck();
    expect(deck.length).toBeGreaterThan(0);
    deck.forEach(id => expect(typeof id).toBe("string"));
  });
});

describe("buildPracticeDeck", () => {
  it("returns at most 20 ids", () => {
    const deck = buildPracticeDeck(null);
    expect(deck.length).toBeLessThanOrEqual(20);
  });

  it("returns ids only from the requested competence when given one", () => {
    const deck = buildPracticeDeck("1.1");
    deck.forEach(id => expect(id.startsWith("1.1")).toBe(true));
  });
});

describe("buildReviewDeck", () => {
  it("orders due items before never-due wrong items", () => {
    STATE.qStats["1.1.1"] = { seen: 1, correct: 1, ease: 2.5, interval: 1, due: "2000-01-01" };
    STATE.qStats["1.1.2"] = { seen: 2, correct: 1, ease: 2.5, interval: 1, due: null };

    const deck = buildReviewDeck();
    expect(deck).toContain("1.1.1");
    expect(deck).toContain("1.1.2");
    expect(deck.indexOf("1.1.1")).toBeLessThan(deck.indexOf("1.1.2"));
  });

  it("includes flagged-only items last", () => {
    STATE.flagged["2.1.1"] = true;
    STATE.qStats["1.1.1"] = { seen: 2, correct: 1, ease: 2.5, interval: 1, due: null };

    const deck = buildReviewDeck();
    expect(deck).toContain("1.1.1");
    expect(deck).toContain("2.1.1");
    expect(deck.indexOf("1.1.1")).toBeLessThan(deck.indexOf("2.1.1"));
  });

  it("returns empty when nothing is due, wrong, or flagged", () => {
    expect(buildReviewDeck()).toEqual([]);
  });
});

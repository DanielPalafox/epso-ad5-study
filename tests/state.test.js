import { describe, it, expect, beforeEach } from "vitest";
import { defaultState, loadState, saveState, initState, resetState, compState, STATE } from "../src/state.js";
import { MAX_HEARTS, VIEWS } from "../src/constants.js";

beforeEach(() => {
  localStorage.clear();
});

describe("defaultState", () => {
  it("has all required top-level keys", () => {
    const s = defaultState();
    expect(s).toHaveProperty("user");
    expect(s).toHaveProperty("competences");
    expect(s).toHaveProperty("qStats");
    expect(s).toHaveProperty("flagged");
    expect(s).toHaveProperty("ephemeral");
  });

  it("initializes hearts to MAX and view to HOME", () => {
    const s = defaultState();
    expect(s.user.hearts).toBe(MAX_HEARTS);
    expect(s.ephemeral.view).toBe(VIEWS.HOME);
  });
});

describe("loadState", () => {
  it("returns default state when localStorage is empty", () => {
    const s = loadState();
    expect(s.user.xp).toBe(0);
  });

  it("merges saved state with fresh defaults for missing keys", () => {
    localStorage.setItem("epso_ad5_v1", JSON.stringify({ v: 1, user: { xp: 999 } }));
    const s = loadState();
    expect(s.user.xp).toBe(999);
    expect(s.user.hearts).toBe(MAX_HEARTS); // default applied for missing key
  });

  it("falls back to default state on malformed JSON", () => {
    localStorage.setItem("epso_ad5_v1", "{not valid json");
    const s = loadState();
    expect(s.user.xp).toBe(0);
  });
});

describe("saveState + initState round trip", () => {
  it("persists XP and crown progress", () => {
    initState();
    STATE.user.xp = 250;
    STATE.competences["1.1"] = { crown: 2, perfectLessons: 1, completedLessons: 3 };
    saveState();

    initState();
    expect(STATE.user.xp).toBe(250);
    expect(STATE.competences["1.1"].crown).toBe(2);
  });
});

describe("resetState", () => {
  it("clears localStorage and reinstates defaults", () => {
    initState();
    STATE.user.xp = 500;
    saveState();
    resetState();
    expect(STATE.user.xp).toBe(0);
    expect(localStorage.getItem("epso_ad5_v1")).toBeNull();
  });
});

describe("compState", () => {
  it("creates and returns a default record on first access", () => {
    initState();
    const cs = compState("1.1");
    expect(cs).toEqual({ crown: 0, perfectLessons: 0, completedLessons: 0 });
  });

  it("returns the same record on subsequent calls", () => {
    initState();
    const a = compState("1.1");
    a.crown = 3;
    const b = compState("1.1");
    expect(b.crown).toBe(3);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { updateSR, getDueCount } from "../src/spaced-rep.js";
import { initState, STATE } from "../src/state.js";
import { SR_EASE_DEFAULT, SR_EASE_MIN } from "../src/constants.js";

beforeEach(() => {
  localStorage.clear();
  initState();
});

describe("updateSR", () => {
  it("creates a future due date on a correct answer", () => {
    STATE.qStats["1.1.1"] = { seen: 1, correct: 1, ease: SR_EASE_DEFAULT, interval: 1, due: null };
    updateSR("1.1.1", true);
    const s = STATE.qStats["1.1.1"];
    expect(s.interval).toBeGreaterThan(1);
    expect(s.ease).toBeGreaterThan(SR_EASE_DEFAULT);
    expect(s.due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("resets interval to 1 day on wrong answer", () => {
    STATE.qStats["1.1.1"] = { seen: 5, correct: 4, ease: 3.0, interval: 30, due: null };
    updateSR("1.1.1", false);
    expect(STATE.qStats["1.1.1"].interval).toBe(1);
  });

  it("decreases ease but never below the minimum", () => {
    STATE.qStats["1.1.1"] = { seen: 1, correct: 0, ease: SR_EASE_MIN + 0.05, interval: 1, due: null };
    updateSR("1.1.1", false);
    expect(STATE.qStats["1.1.1"].ease).toBe(SR_EASE_MIN);
  });

  it("is a no-op for unknown ids", () => {
    expect(() => updateSR("does-not-exist", true)).not.toThrow();
  });
});

describe("getDueCount", () => {
  it("returns 0 when no questions have a due date", () => {
    expect(getDueCount()).toBe(0);
  });

  it("counts items whose due date is today or earlier", () => {
    STATE.qStats["a"] = { seen: 1, correct: 1, ease: 2.5, interval: 1, due: "2000-01-01" };
    STATE.qStats["b"] = { seen: 1, correct: 1, ease: 2.5, interval: 1, due: "2999-12-31" };
    STATE.qStats["c"] = { seen: 1, correct: 1, ease: 2.5, interval: 1, due: null };
    expect(getDueCount()).toBe(1);
  });
});

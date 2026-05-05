import { describe, it, expect } from "vitest";
import { escapeHTML, isoDate, shuffle, fmtTime, fmtMin, pickRandom } from "../src/helpers.js";

describe("escapeHTML", () => {
  it("escapes the four core HTML special characters", () => {
    expect(escapeHTML('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  });

  it("escapes ampersands without double-encoding", () => {
    expect(escapeHTML("A & B")).toBe("A &amp; B");
  });

  it("coerces non-string input", () => {
    expect(escapeHTML(42)).toBe("42");
    expect(escapeHTML(null)).toBe("null");
  });
});

describe("isoDate", () => {
  it("returns YYYY-MM-DD format for today", () => {
    expect(isoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("offsets days correctly", () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const expected = tomorrow.getFullYear() + "-" +
      String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" +
      String(tomorrow.getDate()).padStart(2, "0");
    expect(isoDate(1)).toBe(expected);
  });
});

describe("shuffle", () => {
  it("returns the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate the source", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = input.slice();
    shuffle(input);
    expect(input).toEqual(copy);
  });
});

describe("fmtTime", () => {
  it("formats seconds as MM:SS", () => {
    expect(fmtTime(0)).toBe("00:00");
    expect(fmtTime(65_000)).toBe("01:05");
    expect(fmtTime(3_599_000)).toBe("59:59");
  });

  it("clamps negative durations to 00:00", () => {
    expect(fmtTime(-100)).toBe("00:00");
  });
});

describe("fmtMin", () => {
  it("formats as Nm SSs", () => {
    expect(fmtMin(65_000)).toBe("1m 05s");
    expect(fmtMin(125_000)).toBe("2m 05s");
  });
});

describe("pickRandom", () => {
  it("returns an element of the array", () => {
    const arr = ["a", "b", "c"];
    const pick = pickRandom(arr);
    expect(arr).toContain(pick);
  });
});

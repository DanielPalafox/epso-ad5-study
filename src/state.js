// @ts-check
// Persistent + ephemeral state, plus the read/write helpers that touch it.
// `STATE` is exported as `let` so other modules see live updates after `initState()` /`resetState()`.

import { STORE_KEY, MAX_HEARTS, HEART_REGEN_MS, VIEWS } from "./constants.js";
import { isoDate } from "./helpers.js";

/** @type {ReturnType<typeof defaultState>} */
export let STATE = /** @type {any} */ (null);

/**
 * Probes whether localStorage is actually writable.
 * Safari Private mode and some embedded browsers expose localStorage but throw on setItem.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const probe = "__epso_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function defaultState() {
  return {
    v: 1,
    user: {
      xp: 0,
      streak: 0,
      lastActiveDay: null,
      hearts: MAX_HEARTS,
      heartsLastRegen: Date.now(),
      dailyGoal: 50,
      xpToday: 0,
      xpTodayDate: isoDate()
    },
    competences: {},
    qStats: {},
    flagged: {},
    ephemeral: {
      currentMode: null,
      lessonComp: null,
      deck: [],
      cursor: 0,
      lessonResults: [],
      startingHearts: 0,
      mockStart: null,
      mockEnd: null,
      mockTimer: null,
      currentAnswer: null,
      view: VIEWS.HOME,
      lessonEnd: null,
      mockResult: null,
      sessionStreak: 0,
      // order[id] = 4-element permutation of original option indices.
      // Re-shuffled at deck creation; balanced for mock tests.
      order: {},
      // mockAnswers[id] = displayed answer index (0–3) the candidate
      // currently has selected, or undefined if not yet chosen. Persists
      // when navigating between questions so selections survive Prev/Next.
      mockAnswers: {}
    }
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const fresh = defaultState();
    const merged = Object.assign({}, fresh, parsed);
    merged.user = Object.assign({}, fresh.user, parsed.user || {});
    merged.competences = parsed.competences || {};
    merged.qStats = parsed.qStats || {};
    merged.flagged = parsed.flagged || {};
    merged.ephemeral = fresh.ephemeral;
    return merged;
  } catch (e) {
    console.warn("Load failed, fresh state:", e);
    return defaultState();
  }
}

export function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: STATE.v,
      user: STATE.user,
      competences: STATE.competences,
      qStats: STATE.qStats,
      flagged: STATE.flagged
    }));
  } catch (e) {
    console.warn("Save failed:", e);
  }
}

export function initState() {
  STATE = loadState();
  return STATE;
}

export function resetState() {
  localStorage.removeItem(STORE_KEY);
  STATE = defaultState();
}

/** Get-or-create the per-competence record. */
export function compState(c) {
  if (!STATE.competences[c]) {
    STATE.competences[c] = { crown: 0, perfectLessons: 0, completedLessons: 0 };
  }
  return STATE.competences[c];
}

// ── Hearts ────────────────────────────────────────────────────
export function regenHearts() {
  if (STATE.user.hearts >= MAX_HEARTS) {
    STATE.user.heartsLastRegen = Date.now();
    return;
  }
  const elapsed = Date.now() - STATE.user.heartsLastRegen;
  const toAdd = Math.floor(elapsed / HEART_REGEN_MS);
  if (toAdd > 0) {
    STATE.user.hearts = Math.min(MAX_HEARTS, STATE.user.hearts + toAdd);
    STATE.user.heartsLastRegen += toAdd * HEART_REGEN_MS;
    if (STATE.user.hearts >= MAX_HEARTS) STATE.user.heartsLastRegen = Date.now();
    saveState();
  }
}

export function timeUntilNextHeart() {
  if (STATE.user.hearts >= MAX_HEARTS) return 0;
  return HEART_REGEN_MS - (Date.now() - STATE.user.heartsLastRegen);
}

// ── Daily goal & streak ───────────────────────────────────────
export function refreshDailyTotals() {
  const today = isoDate();
  if (STATE.user.xpTodayDate !== today) {
    STATE.user.xpToday = 0;
    STATE.user.xpTodayDate = today;
    saveState();
  }
}

export function maybeBumpStreak() {
  const today = isoDate();
  if (STATE.user.xpToday < STATE.user.dailyGoal) return;
  if (STATE.user.lastActiveDay === today) return;
  STATE.user.streak = STATE.user.lastActiveDay === isoDate(-1) ? STATE.user.streak + 1 : 1;
  STATE.user.lastActiveDay = today;
  saveState();
}

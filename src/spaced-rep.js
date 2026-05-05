// Simplified SM-2 spaced repetition. After each answer we update `ease` (difficulty)
// and `interval` (days until next review), then stamp a `due` date the deck builder reads.

import { SR_EASE_DEFAULT, SR_EASE_MIN, SR_EASY_BONUS, SR_WRONG_PENALTY } from "./constants.js";
import { STATE } from "./state.js";
import { isoDate } from "./helpers.js";

/**
 * Update spaced-repetition fields on a question's stats.
 * Correct → multiply interval by ease; wrong → reset to 1 day.
 */
export function updateSR(id, correct) {
  const s = STATE.qStats[id];
  if (!s) return;
  s.ease = s.ease || SR_EASE_DEFAULT;
  s.interval = s.interval || 1;
  if (correct) {
    s.ease = Math.max(SR_EASE_MIN, s.ease + SR_EASY_BONUS);
    s.interval = Math.round(s.interval * s.ease);
  } else {
    s.ease = Math.max(SR_EASE_MIN, s.ease - SR_WRONG_PENALTY);
    s.interval = 1;
  }
  s.due = isoDate(s.interval);
}

/** How many questions are due (or overdue) today? */
export function getDueCount() {
  const today = isoDate();
  return Object.keys(STATE.qStats).filter(id => {
    const s = STATE.qStats[id];
    return s.due && s.due <= today;
  }).length;
}

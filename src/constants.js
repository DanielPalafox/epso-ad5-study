// Static configuration. No runtime state, no dependencies.

export const STORE_KEY = "epso_ad5_v1";

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const QUESTIONS_PER_LESSON = 5;
export const XP_PER_CORRECT = 10;
export const XP_PERFECT_BONUS = 20;
export const MOCK_DURATION_MS = 30 * 60 * 1000;
export const MOCK_PASS_MARK = 20;
export const MOCK_TOTAL = 40;

export const CROWN_LEVELS = ["Locked", "Bronze", "Silver", "Gold", "Legendary"];

// Spaced repetition (simplified SM-2)
export const SR_EASE_DEFAULT = 2.5;
export const SR_EASE_MIN = 1.3;
export const SR_EASY_BONUS = 0.1;
export const SR_WRONG_PENALTY = 0.2;

// Varied feedback messages reduce habituation to static text
export const CORRECT_MSGS = [
  "Correct!",
  "Exactly right.",
  "Spot on.",
  "Well done.",
  "Perfect.",
  "You got it."
];
export const WRONG_MSGS = [
  "Incorrect.",
  "Not quite.",
  "Almost.",
  "Keep going."
];

// Mock test verdicts, ordered by descending threshold
export const MOCK_VERDICTS = [
  { min: 36, text: "Outstanding — close to ceiling." },
  { min: 32, text: "Strong pass — push the trap items for the last gains." },
  { min: 28, text: "Comfortable pass — focused work on weak areas will lift this." },
  { min: 20, text: "Pass — ranking-wise, more headroom worth chasing." },
  { min: 0, text: "Below pass mark — drill the weakest areas systematically." }
];

/** @type {Record<string, string>} */
export const VIEWS = Object.freeze({
  HOME: "home",
  LESSON: "lesson",
  MOCK: "mock",
  PRACTICE: "practice",
  REVIEW: "review",
  LESSON_END: "lesson-end",
  MOCK_END: "mock-end",
  SETTINGS: "settings",
  DIGCOMP3: "digcomp3"
});

/** @type {Set<string>} */
export const ACTIVE_VIEWS = new Set([
  VIEWS.LESSON, VIEWS.MOCK, VIEWS.PRACTICE, VIEWS.REVIEW
]);

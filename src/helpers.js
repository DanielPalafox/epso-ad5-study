// Pure utility functions. No DOM mutation beyond `announce`.

/**
 * Returns ISO-format date (YYYY-MM-DD) for today + offsetDays.
 * @param {number} [offsetDays=0]
 * @returns {string}
 */
export function isoDate(offsetDays) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/**
 * Returns a shuffled copy (Fisher–Yates). Source array untouched.
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Format ms as MM:SS (used for the mock-test timer). */
export function fmtTime(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

/** Format ms as `Nm SSs` (used for the heart-regen ETA). */
export function fmtMin(ms) {
  if (ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m + "m " + String(s).padStart(2, "0") + "s";
}

/** HTML-escape user-controlled string content. */
export function escapeHTML(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Push text to the screen-reader live region. */
export function announce(t) {
  const el = document.getElementById("live");
  if (el) el.textContent = t;
}

/** Pick a random element from an array. */
export function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

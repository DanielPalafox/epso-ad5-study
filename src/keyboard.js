// Global keyboard shortcuts: 1–4 to answer, F to flag, Enter to advance.

import { ACTIVE_VIEWS, VIEWS } from "./constants.js";
import { QBYID } from "./data.js";
import { STATE } from "./state.js";
import { recordAnswer, advance, toggleFlag } from "./actions.js";

const ANSWER_KEYS = ["1", "2", "3", "4"];

export function attachKeyboard() {
  document.addEventListener("keydown", e => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
    if (!ACTIVE_VIEWS.has(STATE.ephemeral.view)) return;

    const id = STATE.ephemeral.deck[STATE.ephemeral.cursor];
    if (!id) return;
    const q = QBYID[id];

    if (ANSWER_KEYS.includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < q.o.length && STATE.ephemeral.currentAnswer === null) {
        e.preventDefault();
        recordAnswer(idx);
      }
    } else if (e.key === "Enter") {
      if (STATE.ephemeral.currentAnswer !== null || STATE.ephemeral.currentMode === VIEWS.MOCK) {
        e.preventDefault();
        advance();
      }
    } else if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      toggleFlag(id);
    }
  });
}

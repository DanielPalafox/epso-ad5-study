// Global keyboard shortcuts.
// - 1–4 select an answer (and may be changed in mock mode)
// - F flags the current question
// - Enter advances (lesson/practice/review) or moves Next (mock)
// - ←/→ navigate between questions in mock mode
// - Backspace also moves Previous in mock mode

import { ACTIVE_VIEWS, VIEWS } from "./constants.js";
import { QBYID } from "./data.js";
import { STATE } from "./state.js";
import { recordAnswer, advance, toggleFlag, previousQuestion, nextQuestion } from "./actions.js";

const ANSWER_KEYS = ["1", "2", "3", "4"];

export function attachKeyboard() {
  document.addEventListener("keydown", e => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
    if (!ACTIVE_VIEWS.has(STATE.ephemeral.view)) return;

    const id = STATE.ephemeral.deck[STATE.ephemeral.cursor];
    if (!id) return;
    const q = QBYID[id];
    const isMock = STATE.ephemeral.currentMode === VIEWS.MOCK;

    if (ANSWER_KEYS.includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= q.o.length) return;
      // Mock mode: always allow re-selection. Other modes: lock once chosen.
      if (isMock || STATE.ephemeral.currentAnswer === null) {
        e.preventDefault();
        recordAnswer(idx);
      }
    } else if (e.key === "Enter") {
      if (STATE.ephemeral.currentAnswer !== null || isMock) {
        e.preventDefault();
        if (isMock) nextQuestion();
        else advance();
      }
    } else if (e.key.toLowerCase() === "f") {
      e.preventDefault();
      toggleFlag(id);
    } else if (isMock && (e.key === "ArrowRight")) {
      e.preventDefault();
      nextQuestion();
    } else if (isMock && (e.key === "ArrowLeft" || e.key === "Backspace")) {
      e.preventDefault();
      previousQuestion();
    }
  });
}

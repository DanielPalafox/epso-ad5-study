// Modal dialogs. `showOutOfHearts` imports `goHome` lazily inside its handlers
// to avoid a top-level circular import with actions.js.

import { escapeHTML, fmtMin } from "./helpers.js";
import { timeUntilNextHeart } from "./state.js";

export function showConfirm(msg, onYes, yesLabel, noLabel) {
  const overlay = buildOverlay(
    '<p>' + escapeHTML(msg) + '</p>' +
    '<div class="actions">' +
    '<button class="btn primary" data-act="yes">' + (yesLabel || "OK") + '</button>' +
    '<button class="btn ghost" data-act="no">' + (noLabel || "Cancel") + '</button>' +
    '</div>'
  );
  overlay.querySelector("[data-act='yes']").addEventListener("click", () => {
    overlay.remove();
    if (onYes) onYes();
  });
  overlay.querySelector("[data-act='no']").addEventListener("click", () => overlay.remove());
}

export function showAlert(msg) {
  const overlay = buildOverlay(
    '<p>' + escapeHTML(msg) + '</p>' +
    '<div class="actions">' +
    '<button class="btn primary" data-act="ok">OK</button>' +
    '</div>'
  );
  overlay.querySelector("[data-act='ok']").addEventListener("click", () => overlay.remove());
}

export async function showOutOfHearts() {
  const overlay = buildOverlay(
    '<div class="heart-big">💔</div>' +
    '<h3>Out of hearts</h3>' +
    '<p>You\'ve run out of hearts. They regenerate at 1 every 30 minutes, or you can keep going in Practice mode (no hearts spent).</p>' +
    '<div class="timer-line">Next heart in ' + fmtMin(timeUntilNextHeart()) + '</div>' +
    '<div class="actions">' +
    '<button class="btn ghost" data-act="practice">Practice instead</button>' +
    '<button class="btn primary" data-act="home">Back home</button>' +
    '</div>'
  );
  // Lazy import sidesteps the actions ↔ modals cycle at module-evaluation time
  const { goHome } = await import("./actions.js");
  overlay.querySelector("[data-act='home']").addEventListener("click", () => { overlay.remove(); goHome(); });
  overlay.querySelector("[data-act='practice']").addEventListener("click", () => { overlay.remove(); goHome(); });
}

function buildOverlay(innerHTML) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = '<div class="modal">' + innerHTML + '</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener("keydown", ev => { if (ev.key === "Escape") overlay.remove(); });
  return overlay;
}

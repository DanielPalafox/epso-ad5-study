// @ts-check
// Entry point: boots state, attaches the keyboard handler, kicks off render,
// and runs the per-minute heart-regen tick.

import { VIEWS, MAX_HEARTS } from "./constants.js";
import { STATE, initState, isStorageAvailable, regenHearts } from "./state.js";
import { render, initRouter } from "./router.js";
import { attachKeyboard } from "./keyboard.js";
import { toast } from "./effects.js";

const HEART_TICK_MS = 60_000;

initState();
initRouter();
regenHearts();
attachKeyboard();

// Warn the user when localStorage is blocked (Safari Private mode, embedded webviews, etc.)
// Otherwise progress would silently fail to save and the user wouldn't know why.
if (!isStorageAvailable()) {
  setTimeout(() =>
    toast("Browser storage is blocked — progress will not be saved this session."),
  800);
}

setInterval(() => {
  const prev = STATE.user.hearts;
  regenHearts();
  // Re-render home only when hearts changed or are still regenerating
  if (STATE.ephemeral.view === VIEWS.HOME && (STATE.user.hearts < MAX_HEARTS || STATE.user.hearts !== prev)) {
    render();
  }
}, HEART_TICK_MS);

render();

// Register the service worker for offline support.
// We register on `load` (rather than at module evaluation) so it doesn't
// compete with first-paint resources — particularly important on iOS Safari,
// where SW registration during initial load is more likely to fail.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

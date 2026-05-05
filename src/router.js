// @ts-check
// Top-level render dispatcher: status bar, view that matches `STATE.ephemeral.view`,
// and the hash-based router that lets HOME / SETTINGS / DIGCOMP3 survive a refresh
// and be deep-linked.

import { VIEWS, ACTIVE_VIEWS, MAX_HEARTS } from "./constants.js";
import { STATE, regenHearts, refreshDailyTotals } from "./state.js";
import { heartRow } from "./html.js";
import { renderHome } from "./ui/home.js";
import { renderQuestion } from "./ui/question.js";
import { renderLessonEnd, renderMockEnd } from "./ui/results.js";
import { renderSettings } from "./ui/settings.js";
import { renderDigComp3 } from "./ui/digcomp3.js";

// Only top-level views are routable. Active modes (lesson/mock/practice/review) are
// intentionally ephemeral — refreshing mid-session clears them, the same as before.
/** @type {Record<string, string>} */
const HASH_TO_VIEW = {
  "": VIEWS.HOME,
  "/": VIEWS.HOME,
  "/settings": VIEWS.SETTINGS,
  "/digcomp3": VIEWS.DIGCOMP3
};
/** @type {Record<string, string>} */
const VIEW_TO_HASH = {
  [VIEWS.HOME]: "",
  [VIEWS.SETTINGS]: "/settings",
  [VIEWS.DIGCOMP3]: "/digcomp3"
};

function renderStatusBar() {
  regenHearts();
  refreshDailyTotals();
  const bar = document.getElementById("status-bar");
  if (!bar) return;
  const u = STATE.user;
  bar.innerHTML =
    '<div class="stat hearts" title="Hearts (regen 1 per 30 min)">' + heartRow(u.hearts, u.hearts + ' of ' + MAX_HEARTS + ' hearts') + '<span class="num">' + u.hearts + '</span></div>' +
    '<div class="stat xp" title="Total XP earned"><span class="xp-icon" aria-hidden="true">x</span><span class="num">' + u.xp + '</span></div>' +
    '<div class="stat streak ' + (u.streak === 0 ? 'dim' : '') + '" title="' + u.streak + '-day streak"><span class="flame-icon" aria-hidden="true"></span><span class="num">' + u.streak + '</span></div>';
}

const RENDERERS = {
  [VIEWS.HOME]: renderHome,
  [VIEWS.LESSON]: renderQuestion,
  [VIEWS.MOCK]: renderQuestion,
  [VIEWS.PRACTICE]: renderQuestion,
  [VIEWS.REVIEW]: renderQuestion,
  [VIEWS.LESSON_END]: renderLessonEnd,
  [VIEWS.MOCK_END]: renderMockEnd,
  [VIEWS.SETTINGS]: renderSettings,
  [VIEWS.DIGCOMP3]: renderDigComp3
};

/**
 * Render the current view. Mutates the DOM in-place.
 * Focus moves to the first focusable element of the new view (a11y).
 */
export function render() {
  renderStatusBar();
  const viewEl = document.getElementById("view");
  if (!viewEl) return;
  viewEl.innerHTML = "";
  const v = STATE.ephemeral.view;
  const renderer = RENDERERS[v] || renderHome;
  viewEl.appendChild(renderer());
  if (ACTIVE_VIEWS.has(v)) window.scrollTo(0, 0);
  moveFocusToView(viewEl);
}

/**
 * Programmatic navigation. For URL-routable views, updates the hash without
 * triggering a re-render loop. Active modes clear the hash.
 * @param {string} view - one of VIEWS.*
 */
export function setView(view) {
  STATE.ephemeral.view = view;
  const hash = VIEW_TO_HASH[view];
  if (hash !== undefined) {
    if (location.hash.slice(1) !== hash) {
      // replaceState avoids both a history entry and the hashchange event
      history.replaceState(null, "", hash ? "#" + hash : location.pathname + location.search);
    }
  } else if (location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }
  render();
}

/** Initialise the view from the current URL hash. Called once at boot. */
export function initRouter() {
  const path = location.hash.slice(1) || "/";
  const initial = HASH_TO_VIEW[path];
  if (initial !== undefined) STATE.ephemeral.view = initial;

  // Browser back/forward + manually edited URL
  window.addEventListener("hashchange", () => {
    const p = location.hash.slice(1) || "/";
    const v = HASH_TO_VIEW[p];
    if (v !== undefined && v !== STATE.ephemeral.view) {
      STATE.ephemeral.view = v;
      render();
    }
  });
}

/**
 * Move focus to the first interactive element of the new view.
 * @param {HTMLElement} viewEl
 */
function moveFocusToView(viewEl) {
  const target = /** @type {HTMLElement | null} */ (
    viewEl.querySelector("h1, h2, [autofocus], button:not([disabled]), [tabindex]:not([tabindex='-1'])")
  );
  if (target && typeof target.focus === "function") {
    // tabIndex=-1 keeps it focusable programmatically without changing tab order
    if (target.tabIndex < 0) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
}

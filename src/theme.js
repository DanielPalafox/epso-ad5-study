// @ts-check
// Light/dark theme controller.
//
// User preference is one of: "auto" (default), "light", "dark".
// When "auto", the effective theme follows the OS via prefers-color-scheme
// and updates live if the user toggles their system theme.
// When explicit, the resolved value wins regardless of system preference.
//
// CSS reads `[data-theme]` on <html> — the actual color tokens live in
// styles/base.css. A tiny inline script in index.html applies the resolved
// theme before stylesheets load to avoid a flash of light content (FOUC).

import { STATE, saveState } from "./state.js";

/** @type {readonly ["auto", "light", "dark"]} */
export const THEMES = ["auto", "light", "dark"];

/** @returns {"light" | "dark"} */
export function effectiveTheme() {
  const pref = (STATE && STATE.user && STATE.user.theme) || "auto";
  if (pref === "light" || pref === "dark") return pref;
  return systemPrefersDark() ? "dark" : "light";
}

/** @returns {boolean} */
function systemPrefersDark() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply the current preference to <html> and the meta theme-color. */
export function applyTheme() {
  if (typeof document === "undefined") return;
  const t = effectiveTheme();
  document.documentElement.setAttribute("data-theme", t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    // Match the body background colour for the current theme.
    meta.setAttribute("content", t === "dark" ? "#181410" : "#f6f1e7");
  }
}

/**
 * Set the user preference and persist it. Pass "auto" to follow the OS.
 * @param {"auto" | "light" | "dark"} pref
 */
export function setTheme(pref) {
  if (!THEMES.includes(pref)) return;
  STATE.user.theme = pref;
  saveState();
  applyTheme();
}

/**
 * Cycle the explicit theme. Used by the masthead toggle: light → dark → light.
 * If the user is on "auto", we set the opposite of whatever is currently
 * showing (so the toggle does what the user expects).
 */
export function toggleTheme() {
  const current = effectiveTheme();
  setTheme(current === "dark" ? "light" : "dark");
}

/**
 * Wire the OS theme listener once. Re-applies the theme when the system
 * preference changes — only meaningful when the user is on "auto".
 */
export function watchSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const pref = (STATE && STATE.user && STATE.user.theme) || "auto";
    if (pref === "auto") applyTheme();
  };
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
  } else if (typeof mq.addListener === "function") {
    // Safari < 14
    mq.addListener(handler);
  }
}

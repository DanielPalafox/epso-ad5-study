// Settings page — daily goal selector, theme picker, and reset-progress action.

import { STATE, saveState, resetState } from "../state.js";
import { showConfirm } from "../modals.js";
import { toast } from "../effects.js";
import { goHome } from "../actions.js";
import { setTheme } from "../theme.js";
import { render } from "../router.js";

const DAILY_GOAL_OPTIONS = [20, 50, 100, 200];
const THEME_OPTIONS = [
  { value: "auto",  label: "Auto (follow system)" },
  { value: "light", label: "Light" },
  { value: "dark",  label: "Dark" }
];

export function renderSettings() {
  const wrap = document.createElement("div");
  wrap.className = "settings-panel";
  const currentTheme = STATE.user.theme || "auto";

  let html = '<div class="qbar"><div class="qbar-left"><span class="page-title">Settings</span></div><div class="qbar-right"><button class="btn ghost small" data-act="home">← Home</button></div></div>';

  html += '<div class="row"><div><label for="daily-goal-select" class="label">Daily XP goal</label><div class="desc">XP needed each day to extend your streak.</div></div>';
  html += '<select id="daily-goal-select" data-pref="dailyGoal">';
  DAILY_GOAL_OPTIONS.forEach(v => {
    html += '<option value="' + v + '"' + (STATE.user.dailyGoal === v ? ' selected' : '') + '>' + v + ' XP</option>';
  });
  html += '</select></div>';

  html += '<div class="row"><div><label for="theme-select" class="label">Theme</label><div class="desc">Auto matches your system preference. Pick light or dark to override.</div></div>';
  html += '<select id="theme-select" data-pref="theme">';
  THEME_OPTIONS.forEach(opt => {
    html += '<option value="' + opt.value + '"' + (currentTheme === opt.value ? ' selected' : '') + '>' + opt.label + '</option>';
  });
  html += '</select></div>';

  html += '<div class="row"><div><div class="label">Reset all progress</div><div class="desc">Clears XP, streak, crowns, hearts, flagged questions.</div></div>';
  html += '<button class="btn danger small" data-act="reset">Reset</button></div>';

  html += '<div class="row"><div><div class="label">Storage</div><div class="desc">Progress saved locally in your browser. Clearing site data will reset it.</div></div></div>';

  wrap.innerHTML = html;

  wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
  wrap.querySelector("[data-act='reset']").addEventListener("click", () => {
    showConfirm("Reset all progress? This cannot be undone.", () => {
      resetState();
      toast("Progress reset.");
      goHome();
    }, "Reset", "Cancel");
  });
  wrap.querySelector("[data-pref='dailyGoal']").addEventListener("change", e => {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    STATE.user.dailyGoal = parseInt(select.value, 10);
    saveState();
    toast("Daily goal updated.");
  });
  wrap.querySelector("[data-pref='theme']").addEventListener("change", e => {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    const value = /** @type {"auto" | "light" | "dark"} */ (select.value);
    setTheme(value);
    render();
    toast("Theme updated.");
  });

  return wrap;
}

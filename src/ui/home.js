// Home view — daily-goal card, mode pills, and the skill-tree of competences.

import { VIEWS, CROWN_LEVELS, MAX_HEARTS } from "../constants.js";
import { AREAS } from "../data.js";
import { STATE, compState, timeUntilNextHeart } from "../state.js";
import { escapeHTML, fmtMin } from "../helpers.js";
import { sectionHead } from "../html.js";
import { buildReviewDeck } from "../decks.js";
import { getDueCount } from "../spaced-rep.js";
import { startMode } from "../actions.js";
import { setView } from "../router.js";
import { openCompetenceMenu } from "./competence.js";

export function renderHome() {
  const wrap = document.createElement("div");
  const u = STATE.user;
  const goalPct = Math.min(100, Math.round((u.xpToday / u.dailyGoal) * 100));
  const goalDone = u.xpToday >= u.dailyGoal;
  const heartsLine = u.hearts < MAX_HEARTS
    ? 'Next heart in <strong>' + fmtMin(timeUntilNextHeart()) + '</strong>'
    : 'Hearts full';

  let html = '';
  html += '<div class="daily-card">';
  html += '<div class="left">';
  html += '<div class="label">Daily goal</div>';
  html += '<div class="progress-line"><strong>' + u.xpToday + '</strong> / ' + u.dailyGoal + ' XP today' + (goalDone ? ' · <em class="goal-done">complete</em>' : '') + '</div>';
  html += '<div class="bar"><div class="fill ' + (goalDone ? 'done' : '') + '" style="width:' + goalPct + '%"></div></div>';
  html += '</div>';
  html += '<div class="right">' + heartsLine + ' &middot; <button type="button" data-act="settings" class="settings-link">settings</button></div>';
  html += '</div>';

  const reviewN = buildReviewDeck().length;
  const dueN = getDueCount();
  html += '<div class="mode-row">';
  html += '<button class="mode-pill" data-mode="practice"><span class="ord">№ practice</span><h5>Free practice</h5><p>Untimed, no hearts spent. Pick any competence.</p></button>';
  html += '<button class="mode-pill" data-mode="mock"><span class="ord">№ exam</span><h5>Mock test</h5><p>40 questions · 30 min · 8 per area · pass mark 20/40.</p></button>';
  html += '<button class="mode-pill' + (dueN > 0 ? ' mode-pill--due' : '') + '" data-mode="review"' + (reviewN === 0 ? ' disabled' : '') + '>';
  html += '<span class="ord">№ review</span><h5>Review wrong</h5>';
  html += '<p>' + reviewN + ' question' + (reviewN === 1 ? '' : 's') + ' to revisit' + (dueN > 0 ? ' · <strong class="due-badge">' + dueN + ' due</strong>' : '') + '.</p>';
  html += '</button>';
  html += '<button class="mode-pill" data-mode="digcomp3"><span class="ord">№ reference</span><h5>DigComp 3.0</h5><p>What\'s new in the 2025 update.</p></button>';
  html += '</div>';

  html += sectionHead('i.', 'Lessons');
  AREAS.forEach(a => {
    const totalCrowns = a.competences.length * 4;
    let earned = 0;
    a.competences.forEach(cmp => earned += compState(cmp.c).crown);
    html += '<div class="area-block">';
    html += '<h4 class="area-title"><span class="roman">' + a.roman + '.</span><span class="name">' + escapeHTML(a.name) + '</span><span class="area-prog">' + earned + ' / ' + totalCrowns + ' crowns</span></h4>';
    html += '<p class="area-sub">' + a.competences.length + ' competence' + (a.competences.length === 1 ? '' : 's') + '</p>';
    html += '<div class="path">';
    a.competences.forEach((cmp, idx) => {
      const cs = compState(cmp.c);
      const crownClass = cs.crown > 0 ? 'crown-' + cs.crown : '';
      const label = cs.crown > 0 ? CROWN_LEVELS[cs.crown] : 'Not started';
      html += '<button class="path-node" data-comp="' + cmp.c + '" aria-label="' + escapeHTML(cmp.name) + ' — ' + label + '">';
      html += '<div class="medallion ' + crownClass + '"><span class="code">' + cmp.c + '</span>';
      if (cs.crown > 0) html += '<span class="crown-pip ' + (cs.crown === 4 ? 'crown-4' : '') + '">' + (cs.crown === 4 ? '★' : cs.crown) + '</span>';
      html += '</div>';
      html += '<div class="nm">' + escapeHTML(cmp.name) + '</div>';
      html += '<div class="crown-label">' + label + '</div>';
      html += '</button>';
      if (idx < a.competences.length - 1) {
        html += '<div class="path-connector ' + (cs.crown > 0 ? 'done' : '') + '"></div>';
      }
    });
    html += '</div>';
    html += '</div>';
  });

  wrap.innerHTML = html;

  // One delegated listener instead of three per-element loops
  wrap.addEventListener("click", e => {
    const target = /** @type {HTMLElement | null} */ (e.target);
    if (!target) return;
    const pill = /** @type {HTMLElement | null} */ (target.closest(".mode-pill:not(:disabled)"));
    if (pill) { startMode(pill.dataset.mode); return; }
    const node = /** @type {HTMLElement | null} */ (target.closest(".path-node"));
    if (node) { openCompetenceMenu(node.dataset.comp); return; }
    const settings = target.closest("[data-act='settings']");
    if (settings) {
      e.preventDefault();
      setView(VIEWS.SETTINGS);
    }
  });

  return wrap;
}

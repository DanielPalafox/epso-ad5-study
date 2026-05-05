// Lesson-intro overlay shown when a user taps a competence node on the home tree.

import { CROWN_LEVELS, QUESTIONS_PER_LESSON, XP_PER_CORRECT } from "../constants.js";
import { COMP_NAMES } from "../data.js";
import { STATE, compState } from "../state.js";
import { escapeHTML } from "../helpers.js";
import { crownPips } from "../html.js";
import { showOutOfHearts } from "../modals.js";
import { startLesson, startPractice, goHome } from "../actions.js";

export function openCompetenceMenu(c) {
  if (STATE.user.hearts <= 0) { showOutOfHearts(); return; }

  const cs = compState(c);
  const wrap = document.createElement("div");
  wrap.className = "lesson-intro";
  const nextLabel = CROWN_LEVELS[Math.min(4, cs.crown + 1)];

  let html = '';
  html += '<div class="crest">' + c + '</div>';
  html += '<h2>' + escapeHTML(COMP_NAMES[c]) + '</h2>';
  html += '<div class="topic">DigComp 2.2 · Competence ' + c + '</div>';
  html += '<div class="crown-progress">';
  html += '<span class="lbl">' + (cs.crown === 4 ? 'Mastered' : 'Progress') + '</span>';
  html += crownPips(cs.crown);
  html += '<span class="lbl">' + (cs.crown === 4 ? '★ Legendary' : 'Next: ' + nextLabel) + '</span>';
  html += '</div>';
  html += '<div class="lesson-meta">';
  html += '<div class="item"><div class="v">' + QUESTIONS_PER_LESSON + '</div><div class="l">questions</div></div>';
  html += '<div class="item"><div class="v">' + STATE.user.hearts + '</div><div class="l">hearts</div></div>';
  html += '<div class="item"><div class="v">+' + (XP_PER_CORRECT * QUESTIONS_PER_LESSON) + '</div><div class="l">max XP</div></div>';
  html += '</div>';
  html += '<div class="actions">';
  html += '<button class="btn primary large" data-act="start-lesson">Start lesson</button>';
  html += '<button class="btn ghost" data-act="practice-here">Practice (no hearts)</button>';
  html += '<button class="btn ghost" data-act="home">← Back</button>';
  html += '</div>';
  wrap.innerHTML = html;

  const view = document.getElementById("view");
  view.innerHTML = "";
  view.appendChild(wrap);

  wrap.querySelector("[data-act='start-lesson']").addEventListener("click", () => startLesson(c));
  wrap.querySelector("[data-act='practice-here']").addEventListener("click", () => startPractice(c));
  wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
}

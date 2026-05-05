// DigComp 3.0 reference page — 2.2 → 3.0 deltas plus a launcher for the d3 quiz.

import { CROWN_LEVELS } from "../constants.js";
import { D3_QUESTIONS } from "../data.js";
import { compState } from "../state.js";
import { escapeHTML } from "../helpers.js";
import { sectionHead, crownPips } from "../html.js";
import { startLesson, startPractice, goHome } from "../actions.js";

export function renderDigComp3() {
  const wrap = document.createElement("div");
  wrap.className = "d3-view";
  const meta = window.DIGCOMP3_META;
  const areas = window.DIGCOMP3_AREAS || [];
  const renames = window.DIGCOMP3_RENAMES || [];
  const highlights = window.DIGCOMP3_HIGHLIGHTS || [];
  const epsoNote = window.DIGCOMP3_EPSO_NOTE || "";
  const d3qN = D3_QUESTIONS.length;
  const cs = compState("d3");

  let html = '';
  html += '<div class="qbar"><div class="qbar-left"><span class="page-title">DigComp 3.0</span></div><div class="qbar-right"><button class="btn ghost small" data-act="home">← Home</button></div></div>';

  html += '<div class="daily-card daily-card--block">';
  html += '<div class="label">' + escapeHTML(meta.subtitle) + '</div>';
  html += '<h2 class="d3-title">' + escapeHTML(meta.title) + '</h2>';
  html += '<p class="d3-meta">Published <strong>' + escapeHTML(meta.published) + '</strong> by the ' + escapeHTML(meta.publisher) + '. Authors: ' + escapeHTML(meta.authors) + '. Reference: <code>' + escapeHTML(meta.jrc) + '</code> · DOI <code>' + escapeHTML(meta.doi) + '</code> · Licence: ' + escapeHTML(meta.licence) + '. <a href="' + escapeHTML(meta.url) + '" target="_blank" rel="noopener noreferrer" class="text-link">Official PDF →</a></p>';
  html += '</div>';

  html += sectionHead('i.', 'What changed');
  html += '<div class="d3-highlights-grid">';
  highlights.forEach(item => {
    html += '<div class="d3-highlight-card">';
    html += '<h4 class="d3-highlight-h">' + escapeHTML(item.h) + '</h4>';
    html += '<p class="d3-highlight-p">' + escapeHTML(item.t) + '</p>';
    html += '</div>';
  });
  html += '</div>';

  html += sectionHead('ii.', 'Areas: 2.2 → 3.0');
  html += '<div class="comparison-table">';
  areas.forEach((a, idx) => {
    const changed = a.was !== a.now;
    html += '<div class="comparison-row comparison-row--areas' + (idx > 0 ? ' bordered' : '') + '">';
    html += '<div class="cr-num">' + a.n + '.</div>';
    html += '<div class="cr-was' + (changed ? '' : ' cr-unchanged') + '">' + escapeHTML(a.was) + '</div>';
    html += '<div class="cr-now' + (changed ? ' cr-changed' : '') + '">' + escapeHTML(a.now) + (changed ? '' : ' <span class="cr-badge">unchanged</span>') + '</div>';
    html += '</div>';
  });
  html += '</div>';

  html += sectionHead('iii.', 'Renamed competences');
  html += '<div class="comparison-table">';
  renames.forEach((r, idx) => {
    html += '<div class="comparison-row comparison-row--renames' + (idx > 0 ? ' bordered' : '') + '">';
    html += '<div class="cr-code">' + r.c + '</div>';
    html += '<div class="cr-was">' + escapeHTML(r.was) + '</div>';
    html += '<div class="cr-now cr-changed">' + escapeHTML(r.now) + (r.important ? ' <span class="cr-badge cr-badge--key">key change</span>' : '') + '</div>';
    html += '</div>';
  });
  html += '</div>';

  html += sectionHead('iv.', 'EPSO 2026 note');
  html += '<div class="epso-note">' + escapeHTML(epsoNote) + '</div>';

  html += sectionHead('v.', 'Quiz on DigComp 3 changes');
  html += '<div class="lesson-intro d3-launcher">';
  html += '<div class="crest">3.0</div>';
  html += '<h2>' + d3qN + ' questions on what\'s new</h2>';
  html += '<div class="topic">DigComp 3.0 · 2.2 → 3.0 deltas</div>';
  html += '<div class="crown-progress">';
  html += '<span class="lbl">' + (cs.crown === 4 ? 'Mastered' : 'Progress') + '</span>';
  html += crownPips(cs.crown);
  html += '<span class="lbl">' + CROWN_LEVELS[Math.min(4, cs.crown + 1)] + '</span>';
  html += '</div>';
  html += '<div class="actions">';
  html += '<button class="btn primary large" data-act="d3-lesson">Start lesson (5 questions)</button>';
  html += '<button class="btn ghost" data-act="d3-practice">Practice all ' + d3qN + '</button>';
  html += '</div>';
  html += '</div>';

  wrap.innerHTML = html;
  wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
  wrap.querySelector("[data-act='d3-lesson']").addEventListener("click", () => startLesson("d3"));
  wrap.querySelector("[data-act='d3-practice']").addEventListener("click", () => startPractice("d3"));
  return wrap;
}

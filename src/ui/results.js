// End-of-session views: lesson result and mock-test result.

import { VIEWS, CROWN_LEVELS, MOCK_PASS_MARK, MOCK_VERDICTS } from "../constants.js";
import { AREAS, QBYID, COMP_NAMES } from "../data.js";
import { STATE } from "../state.js";
import { escapeHTML } from "../helpers.js";
import { sectionHead } from "../html.js";
import { startLesson, startPractice, startMock, startReview, goHome } from "../actions.js";

export function renderLessonEnd() {
  const wrap = document.createElement("div");
  const r = STATE.ephemeral.lessonEnd;
  const comp = STATE.ephemeral.lessonComp;
  const success = r.completedFully;

  let html = '<div class="result-card ' + (success ? "success" : "fail") + '">';
  html += '<div class="crest">' + (success ? (r.perfect ? "★" : "✓") : "♡") + '</div>';
  html += '<h2>' + (r.perfect ? "Lesson perfect" : success ? "Lesson complete" : "Out of hearts") + '</h2>';
  html += '<p class="verdict">' + escapeHTML(COMP_NAMES[comp] || comp) + '</p>';
  html += '<div class="result-stats">';
  html += '<div class="item"><div class="l">Score</div><div class="v">' + r.correctN + '/' + r.totalQuestions + '</div></div>';
  html += '<div class="item"><div class="l">XP gained</div><div class="v">+' + r.xpEarned + '<span class="delta">XP</span></div></div>';
  html += '<div class="item"><div class="l">Crown</div><div class="v">' + (r.newCrown > 0 ? CROWN_LEVELS[r.newCrown] : "—") + '</div></div>';
  html += '<div class="item"><div class="l">Daily goal</div><div class="v">' + STATE.user.xpToday + '/' + STATE.user.dailyGoal + '</div></div>';
  html += '</div>';
  if (r.bonus) html += '<p class="perfect-bonus">' + escapeHTML(r.bonus) + '</p>';
  if (!success) html += '<p class="hearts-notice">You ran out of hearts. They regenerate at 1 every 30 min, or use Practice mode to keep going.</p>';
  html += '<div class="actions">';
  if (success && comp !== "d3") html += '<button class="btn primary" data-act="continue">Continue lesson</button>';
  if (comp) html += '<button class="btn ghost" data-act="practice">Practice this competence</button>';
  html += '<button class="btn ghost" data-act="home">Back to tree</button>';
  html += '</div>';
  html += '</div>';
  wrap.innerHTML = html;

  wrap.querySelector("[data-act='continue']")?.addEventListener("click", () => startLesson(comp));
  wrap.querySelector("[data-act='practice']")?.addEventListener("click", () => startPractice(comp));
  wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
  return wrap;
}

export function renderMockEnd() {
  const wrap = document.createElement("div");
  wrap.className = "mock-result";
  const e = STATE.ephemeral;
  const r = e.mockResult;
  const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
  const passed = r.score >= MOCK_PASS_MARK;
  const verdict = MOCK_VERDICTS.find(v => r.score >= v.min).text;

  const byArea = [1, 2, 3, 4, 5].map(n => {
    const ids = e.deck.filter(id => parseInt(QBYID[id].c[0], 10) === n);
    const c = ids.filter(id => {
      const ans = e.lessonResults.find(rr => rr.id === id);
      return ans && ans.correct;
    }).length;
    return {
      n,
      name: AREAS[n - 1].name,
      total: ids.length,
      correct: c,
      pct: ids.length ? Math.round((c / ids.length) * 100) : 0
    };
  });

  const wrongs = e.deck.filter(id => {
    const ans = e.lessonResults.find(rr => rr.id === id);
    return !ans || !ans.correct;
  });

  let html = '';
  html += '<div class="score-display">';
  html += '<div class="verdict">' + verdict + '</div>';
  html += '<div class="num">' + r.score + '<span class="of">/' + r.total + '</span></div>';
  html += '<div class="pct">' + pct + '% · ' + Math.floor(r.elapsed / 60000) + 'm ' + Math.floor((r.elapsed % 60000) / 1000) + 's</div>';
  html += '<div class="pass ' + (passed ? 'yes' : 'no') + '">' + (passed ? 'Above ' + MOCK_PASS_MARK + '/40 pass mark' : 'Below ' + MOCK_PASS_MARK + '/40 pass mark') + '</div>';
  html += '</div>';

  html += sectionHead('a.', 'By area');
  html += '<div>';
  byArea.forEach(a => {
    html += '<div class="area-bar">';
    html += '<div class="name"><span class="areanum">' + a.n + '.</span>' + escapeHTML(a.name) + '</div>';
    html += '<div class="track"><div class="fill ' + (a.pct < 60 ? 'weak' : '') + (a.total === 0 ? ' empty' : '') + '" style="width:' + a.pct + '%"></div></div>';
    html += '<div class="num">' + a.correct + '/' + a.total + '</div>';
    html += '</div>';
  });
  html += '</div>';

  if (wrongs.length) {
    html += sectionHead('b.', 'Review wrong (' + wrongs.length + ')');
    html += '<div>';
    wrongs.forEach(id => {
      const q = QBYID[id];
      const a = e.lessonResults.find(rr => rr.id === id);
      const yourLetter = a && a.chosen >= 0 ? String.fromCharCode(65 + a.chosen) : "—";
      const yourText = a && a.chosen >= 0 ? escapeHTML(q.o[a.chosen]) : "(not answered)";
      html += '<div class="review-item">';
      html += '<p class="stem"><span class="review-tag">' + q.c + '</span>' + escapeHTML(q.q) + '</p>';
      html += '<div class="answer-row">Your answer: <span class="your">' + yourLetter + '. ' + yourText + '</span> · Correct: <span class="right">' + String.fromCharCode(65 + q.a) + '. ' + escapeHTML(q.o[q.a]) + '</span></div>';
      html += '<div class="why">' + escapeHTML(q.e) + '</div>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<div class="mock-actions">';
  html += '<button class="btn primary" data-act="another-mock">Another mock test</button>';
  if (wrongs.length) html += '<button class="btn" data-act="review-wrong">Review wrong now</button>';
  html += '<button class="btn ghost" data-act="home">Back to tree</button>';
  html += '</div>';

  wrap.innerHTML = html;
  wrap.querySelector("[data-act='home']").addEventListener("click", goHome);
  wrap.querySelector("[data-act='another-mock']")?.addEventListener("click", startMock);
  wrap.querySelector("[data-act='review-wrong']")?.addEventListener("click", startReview);
  return wrap;
}

// Question bank derived from the global script-tag data files (questions.js, digcomp3.js).
// These globals exist because the data files are loaded as classic scripts before the module entry,
// keeping the question bank trivially editable without a build step.

export const QUESTIONS = window.QUESTIONS;
export const AREAS = window.AREAS;
export const D3_QUESTIONS = window.DIGCOMP3_QUESTIONS || [];

/** Question lookup by id. */
export const QBYID = {};
QUESTIONS.forEach(q => { QBYID[q.i] = q; });
D3_QUESTIONS.forEach(q => { QBYID[q.i] = q; });

/** Map from competence code → human-readable name. */
export const COMP_NAMES = {};
/** Map from competence code → array of questions. */
export const QBYC = {};

AREAS.forEach(a => a.competences.forEach(c => {
  COMP_NAMES[c.c] = c.name;
  QBYC[c.c] = QUESTIONS.filter(q => q.c === c.c);
}));

COMP_NAMES["d3"] = "DigComp 3.0 updates";
QBYC["d3"] = D3_QUESTIONS.slice();

// Pre-deploy / pre-merge sanity check on the question bank.
// Loads questions.js + digcomp3.js as scripts, then validates every entry
// against a schema and against length-bias / "tell" heuristics.
//
// Run: `npm run validate:questions`
// CI gate ensures bad data never lands on main.
//
// Length-bias check (item 1 of the exam-realism work):
// In an exam-like multiple-choice item, the four options should be similar in
// length and level of detail. If the correct answer is consistently the
// longest, most-clausal, or most "official-sounding" option, candidates can
// guess the answer without understanding the concept. This script flags items
// where the correct answer's character length is a clear outlier vs. its
// distractors and reports an aggregate share of the bank where the correct
// answer is the longest of the four. The aggregate is treated as a soft
// failure (warn) rather than a hard one to keep CI green while authors
// rewrite flagged items.

import { readFile } from "fs/promises";
import vm from "vm";

const REQUIRED_FIELDS = ["i", "c", "t", "d", "q", "o", "a", "e"];

// Length-bias thresholds (tunable):
const BIAS_ABS_DELTA = 24;        // chars longer than the longest distractor to flag
const BIAS_RATIO = 1.6;           // correct length / max-distractor length to flag
const BIAS_MIN_LEN = 30;          // ignore questions where correct answer is short
const BIAS_AGGREGATE_LIMIT = 0.45; // bank-wide share of "correct = longest" allowed

async function loadGlobals() {
  // questions.js and digcomp3.js attach data via `window.X = ...`. To make those
  // assignments visible at the sandbox top-level, point `window` at the sandbox itself.
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ["questions.js", "digcomp3.js"]) {
    const code = await readFile(file, "utf8");
    vm.runInContext(code, sandbox);
  }
  return sandbox;
}

function validateQuestion(q, source) {
  const errors = [];
  for (const f of REQUIRED_FIELDS) {
    if (q[f] === undefined) errors.push(`[${source}] question missing field "${f}": ${JSON.stringify(q)}`);
  }
  if (typeof q.i !== "string" || !q.i) errors.push(`[${source}] invalid id: ${q.i}`);
  if (typeof q.c !== "string" || !q.c) errors.push(`[${source}] invalid competence: ${q.c}`);
  if (typeof q.q !== "string" || !q.q) errors.push(`[${source}] empty question stem on ${q.i}`);
  if (typeof q.e !== "string" || !q.e) errors.push(`[${source}] empty explanation on ${q.i}`);
  if (!Array.isArray(q.o) || q.o.length !== 4) errors.push(`[${source}] question ${q.i} must have exactly 4 options`);
  if (typeof q.a !== "number" || q.a < 0 || q.a > 3) errors.push(`[${source}] question ${q.i} answer index must be 0–3`);
  if (typeof q.d !== "number" || q.d < 1 || q.d > 3) errors.push(`[${source}] question ${q.i} difficulty must be 1–3`);
  return errors;
}

/**
 * Returns a length-bias finding for one question, or null if no concern.
 * A finding marks the correct option as a likely length-tell:
 *   - it is the longest option, AND
 *   - it is at least BIAS_MIN_LEN chars (otherwise differences are noise), AND
 *   - it exceeds the longest distractor by either BIAS_ABS_DELTA chars or BIAS_RATIO ratio.
 */
function lengthBias(q) {
  if (!Array.isArray(q.o) || q.o.length !== 4) return null;
  const lens = q.o.map(o => (typeof o === "string" ? o.length : 0));
  const correctLen = lens[q.a];
  const distractorMax = Math.max(...lens.filter((_, i) => i !== q.a));
  if (correctLen < BIAS_MIN_LEN) return null;
  const isLongest = correctLen > distractorMax;
  if (!isLongest) return null;
  const delta = correctLen - distractorMax;
  const ratio = distractorMax === 0 ? Infinity : correctLen / distractorMax;
  if (delta >= BIAS_ABS_DELTA || ratio >= BIAS_RATIO) {
    return { delta, ratio: +ratio.toFixed(2), correctLen, distractorMax, lens };
  }
  return null;
}

const sandbox = await loadGlobals();
const QUESTIONS = sandbox.QUESTIONS || [];
const D3 = sandbox.DIGCOMP3_QUESTIONS || [];
const AREAS = sandbox.AREAS || [];

const validCompetences = new Set();
AREAS.forEach(a => a.competences.forEach(c => validCompetences.add(c.c)));
validCompetences.add("d3");

const errors = [];
const warnings = [];
const idsSeen = new Set();

const allQuestions = [...QUESTIONS, ...D3];
allQuestions.forEach(q => {
  errors.push(...validateQuestion(q, q.i));
  if (idsSeen.has(q.i)) errors.push(`Duplicate id: ${q.i}`);
  idsSeen.add(q.i);
  if (q.c && !validCompetences.has(q.c)) {
    errors.push(`Unknown competence "${q.c}" on question ${q.i}`);
  }
});

// Length-bias / "longest = correct" diagnostics
const biased = [];
let correctIsLongest = 0;
let evaluated = 0;
allQuestions.forEach(q => {
  if (!Array.isArray(q.o) || q.o.length !== 4 || typeof q.a !== "number") return;
  evaluated += 1;
  const lens = q.o.map(o => (typeof o === "string" ? o.length : 0));
  const distractorMax = Math.max(...lens.filter((_, i) => i !== q.a));
  if (lens[q.a] > distractorMax) correctIsLongest += 1;
  const finding = lengthBias(q);
  if (finding) biased.push({ id: q.i, ...finding });
});

const longestShare = evaluated ? correctIsLongest / evaluated : 0;

if (biased.length > 0) {
  warnings.push(
    `Length-bias: ${biased.length} questions where the correct answer is markedly longer than every distractor.`,
    `  These are guessable on length alone. Tighten the correct option or pad at least two distractors with comparable detail.`
  );
  biased.slice(0, 12).forEach(b => {
    warnings.push(`  · ${b.id}  correct=${b.correctLen}c  longest_distractor=${b.distractorMax}c  Δ=${b.delta}  ratio=${b.ratio}`);
  });
  if (biased.length > 12) warnings.push(`  · …and ${biased.length - 12} more`);
}

if (longestShare > BIAS_AGGREGATE_LIMIT) {
  warnings.push(
    `Aggregate length-bias: ${(longestShare * 100).toFixed(1)}% of questions have the correct answer as the longest option (limit ${(BIAS_AGGREGATE_LIMIT * 100).toFixed(0)}%).`,
    `  Aim for ≤ ${(BIAS_AGGREGATE_LIMIT * 100).toFixed(0)}% so candidates cannot exploit "longest = correct" as a heuristic.`
  );
}

if (errors.length > 0) {
  console.error(`\n✗ Question bank validation failed (${errors.length} issues):\n`);
  errors.slice(0, 30).forEach(e => console.error("  " + e));
  if (errors.length > 30) console.error(`  ...and ${errors.length - 30} more`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn(`\n⚠  Question bank warnings (${warnings.length} lines):\n`);
  warnings.forEach(w => console.warn(w));
  console.warn("");
}

console.log(`✓ ${allQuestions.length} questions validated (${QUESTIONS.length} DigComp 2.2 + ${D3.length} DigComp 3.0).`);
console.log(`  correct-is-longest: ${correctIsLongest}/${evaluated} (${(longestShare * 100).toFixed(1)}%)`);
console.log(`  length-bias flags : ${biased.length}`);

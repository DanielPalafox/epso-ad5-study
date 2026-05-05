// Pre-deploy / pre-merge sanity check on the question bank.
// Loads questions.js + digcomp3.js as scripts, then validates every entry against a schema.
//
// Run: `npm run validate:questions`
// CI gate ensures bad data never lands on main.

import { readFile } from "fs/promises";
import vm from "vm";

const REQUIRED_FIELDS = ["i", "c", "t", "d", "q", "o", "a", "e"];

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

const sandbox = await loadGlobals();
const QUESTIONS = sandbox.QUESTIONS || [];
const D3 = sandbox.DIGCOMP3_QUESTIONS || [];
const AREAS = sandbox.AREAS || [];

const validCompetences = new Set();
AREAS.forEach(a => a.competences.forEach(c => validCompetences.add(c.c)));
validCompetences.add("d3");

const errors = [];
const idsSeen = new Set();

[...QUESTIONS, ...D3].forEach(q => {
  errors.push(...validateQuestion(q, q.i));
  if (idsSeen.has(q.i)) errors.push(`Duplicate id: ${q.i}`);
  idsSeen.add(q.i);
  if (q.c && !validCompetences.has(q.c)) {
    errors.push(`Unknown competence "${q.c}" on question ${q.i}`);
  }
});

if (errors.length > 0) {
  console.error(`\n✗ Question bank validation failed (${errors.length} issues):\n`);
  errors.slice(0, 30).forEach(e => console.error("  " + e));
  if (errors.length > 30) console.error(`  ...and ${errors.length - 30} more`);
  process.exit(1);
} else {
  console.log(`✓ ${QUESTIONS.length + D3.length} questions validated (${QUESTIONS.length} DigComp 2.2 + ${D3.length} DigComp 3.0).`);
}

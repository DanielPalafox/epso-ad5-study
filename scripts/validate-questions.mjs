// Pre-deploy / pre-merge sanity check on the question bank.
// Loads questions.js + digcomp3.js, validates every entry against:
//
//   1. Schema       — required fields, valid index ranges, no duplicate ids
//   2. Style spec   — answer-generation rules from CONTRIBUTING.md (length
//                     parity, no-stylistic-giveaways) so the correct option
//                     can only be identified by understanding the content,
//                     not by spotting the longest, most-hedged, most-policy-
//                     sounding answer.
//
// Schema failures are hard errors (exit 1). Style failures are warnings by
// default and become hard errors with `--strict`. The aggregate summary at
// the bottom is the dashboard for tracking progress as authors rewrite items.
//
// Run: `npm run validate:questions`           (warnings + summary)
//      `npm run validate:questions -- --strict` (CI gate after rewrite pass)

import { readFile } from "fs/promises";
import vm from "vm";

const STRICT = process.argv.includes("--strict");

const REQUIRED_FIELDS = ["i", "c", "t", "d", "q", "o", "a", "e"];

// ── Style-spec rule definitions ─────────────────────────────
//
// Each rule returns a string tag if violated, or null if the question passes.
// Tags appear in the per-question report (e.g. "[len:1.42] [hedges] [policy]")
// so authors can see which rule(s) need fixing on each item.

// §4: longest option must be ≤ 1.2× shortest. Below the floor we exempt very
// short banks (e.g. yes/no with one short numeric answer) where the ratio is
// noisy.
const LENGTH_RATIO_LIMIT = 1.2;
const LENGTH_RATIO_FLOOR_CHARS = 25;

// §2/§5: how much longer the correct answer can be than the median distractor
// before it counts as "the option that stands out by length alone". 1.3× is
// strict but achievable; 1.5× would drift back toward the old bias.
const CORRECT_OUTLIER_LIMIT = 1.3;

// §6: hedging-qualifier giveaway — words that signal a "balanced, careful"
// answer. If only the correct option uses any of these, the candidate can
// pick by tone instead of content.
const HEDGE_RX = /\b(usually|often|typically|generally|may|might|where appropriate|where feasible|depending on|subject to|unless|tends to|in most cases|by default|partially|sometimes|in general)\b/i;

// §6: only-correct-uses-examples — `e.g.`, `for example`, `such as`, `(like …)`.
const EXAMPLE_RX = /\b(e\.g\.|for example|such as|including\s+\w)\b/i;

// §6: multi-clause / multi-part structure — em-dash, semicolon, or two+
// clause-joining commas. The pattern "X, Y, and Z" is the classic policy-
// answer cadence; if only the correct option has it, that's the giveaway.
function isMultiClause(s) {
  if (!s) return false;
  if (/[—;]/.test(s)) return true;
  // Two or more comma-joined clauses (rough proxy: 2+ commas)
  const commas = (s.match(/,/g) || []).length;
  return commas >= 2;
}

// §2: policy-flavoured terminology. If only the correct option mentions
// safeguards / risk / verification / accessibility / consent / etc., a
// candidate who has skimmed the framework picks it without reading.
const POLICY_RX = /\b(privacy|consent|transparency|accessibility|bias|verification|verify|safeguard|safeguards|oversight|governance|accountability|compliance|encryption|encrypted|risk|risks|lawful|GDPR|data protection|policy)\b/i;

// §6: absolutes asymmetry. Distractors that use "always / never / all /
// only / cannot / must" and a correct option that carefully avoids them is a
// stylistic tell — the candidate learns "the qualified one is right".
const ABSOLUTE_RX = /\b(always|never|all\b|none\b|every\b|only\b|cannot|must|impossible|forever|invariably|in every case|under no circumstances)\b/i;

// ── Per-question rule runners ───────────────────────────────

function ruleLengthRatio(q) {
  const lens = q.o.map(o => (typeof o === "string" ? o.length : 0));
  const max = Math.max(...lens);
  const min = Math.min(...lens);
  if (min < LENGTH_RATIO_FLOOR_CHARS) return null;
  const ratio = max / min;
  if (ratio > LENGTH_RATIO_LIMIT) return `len:${ratio.toFixed(2)}`;
  return null;
}

function ruleCorrectOutlier(q) {
  const distractorLens = q.o.map(o => (typeof o === "string" ? o.length : 0))
    .filter((_, i) => i !== q.a)
    .sort((a, b) => a - b);
  const median = distractorLens[Math.floor(distractorLens.length / 2)];
  if (median < LENGTH_RATIO_FLOOR_CHARS) return null;
  const cl = q.o[q.a].length;
  if (cl <= median * CORRECT_OUTLIER_LIMIT) return null;
  return `correct-stands-out:${(cl / median).toFixed(2)}x`;
}

function onlyCorrectMatches(q, rx) {
  const correct = rx.test(q.o[q.a]);
  if (!correct) return false;
  const distractorMatches = q.o.filter((_, i) => i !== q.a).some(o => rx.test(o));
  return !distractorMatches;
}

function ruleHedgeAsymmetry(q) {
  return onlyCorrectMatches(q, HEDGE_RX) ? "only-correct-hedges" : null;
}

function ruleExampleAsymmetry(q) {
  return onlyCorrectMatches(q, EXAMPLE_RX) ? "only-correct-examples" : null;
}

function ruleMultiClauseAsymmetry(q) {
  const correct = isMultiClause(q.o[q.a]);
  if (!correct) return null;
  const distractor = q.o.filter((_, i) => i !== q.a).some(isMultiClause);
  return distractor ? null : "only-correct-multiclause";
}

function rulePolicyAsymmetry(q) {
  return onlyCorrectMatches(q, POLICY_RX) ? "only-correct-policy-tone" : null;
}

function ruleAbsoluteAsymmetry(q) {
  // Tell pattern: distractors use absolutes, correct option carefully avoids them.
  const correctHas = ABSOLUTE_RX.test(q.o[q.a]);
  if (correctHas) return null;
  const distractorAbsoluteCount = q.o.filter((_, i) => i !== q.a).filter(o => ABSOLUTE_RX.test(o)).length;
  if (distractorAbsoluteCount >= 2) return "absolutes-only-in-distractors";
  return null;
}

const STYLE_RULES = [
  ruleLengthRatio,
  ruleCorrectOutlier,
  ruleHedgeAsymmetry,
  ruleExampleAsymmetry,
  ruleMultiClauseAsymmetry,
  rulePolicyAsymmetry,
  ruleAbsoluteAsymmetry
];

function styleViolations(q) {
  if (!Array.isArray(q.o) || q.o.length !== 4 || typeof q.a !== "number") return [];
  return STYLE_RULES.map(r => r(q)).filter(Boolean);
}

// ── Schema validator (unchanged) ────────────────────────────

function validateSchema(q, source) {
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

// ── Boot ────────────────────────────────────────────────────

async function loadGlobals() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const file of ["questions.js", "digcomp3.js"]) {
    const code = await readFile(file, "utf8");
    vm.runInContext(code, sandbox);
  }
  return sandbox;
}

const sandbox = await loadGlobals();
const QUESTIONS = sandbox.QUESTIONS || [];
const D3 = sandbox.DIGCOMP3_QUESTIONS || [];
const AREAS = sandbox.AREAS || [];
const allQuestions = [...QUESTIONS, ...D3];

const validCompetences = new Set();
AREAS.forEach(a => a.competences.forEach(c => validCompetences.add(c.c)));
validCompetences.add("d3");

// ── Schema pass ─────────────────────────────────────────────

const schemaErrors = [];
const idsSeen = new Set();
allQuestions.forEach(q => {
  schemaErrors.push(...validateSchema(q, q.i));
  if (idsSeen.has(q.i)) schemaErrors.push(`Duplicate id: ${q.i}`);
  idsSeen.add(q.i);
  if (q.c && !validCompetences.has(q.c)) {
    schemaErrors.push(`Unknown competence "${q.c}" on question ${q.i}`);
  }
});

if (schemaErrors.length > 0) {
  console.error(`\n✗ Schema validation failed (${schemaErrors.length} issues):\n`);
  schemaErrors.slice(0, 30).forEach(e => console.error("  " + e));
  if (schemaErrors.length > 30) console.error(`  …and ${schemaErrors.length - 30} more`);
  process.exit(1);
}

// ── Style pass ──────────────────────────────────────────────

const styleFails = [];
const ruleCounts = {};
allQuestions.forEach(q => {
  const tags = styleViolations(q);
  if (tags.length === 0) return;
  styleFails.push({ id: q.i, tags });
  tags.forEach(t => {
    const rule = t.split(":")[0];
    ruleCounts[rule] = (ruleCounts[rule] || 0) + 1;
  });
});

// Aggregate summary metrics
let correctIsLongest = 0;
allQuestions.forEach(q => {
  if (!Array.isArray(q.o) || q.o.length !== 4) return;
  const lens = q.o.map(o => (typeof o === "string" ? o.length : 0));
  const dm = Math.max(...lens.filter((_, i) => i !== q.a));
  if (lens[q.a] > dm) correctIsLongest++;
});

if (styleFails.length > 0) {
  const log = STRICT ? console.error : console.warn;
  log(`\n${STRICT ? "✗" : "⚠"}  Style spec: ${styleFails.length} of ${allQuestions.length} questions fail one or more rules.\n`);

  // Sort: most-violations first, then by id for stable order
  styleFails.sort((a, b) => b.tags.length - a.tags.length || a.id.localeCompare(b.id));
  const limit = STRICT ? styleFails.length : 25;
  styleFails.slice(0, limit).forEach(f => {
    log(`  ${f.id.padEnd(7)}  ${f.tags.join("  ")}`);
  });
  if (!STRICT && styleFails.length > limit) log(`  …and ${styleFails.length - limit} more (run with --strict for full list)`);

  log("\n  Rule breakdown:");
  Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]).forEach(([rule, n]) => {
    log(`    ${rule.padEnd(34)}  ${n}`);
  });
}

console.log(`\n✓ ${allQuestions.length} questions loaded (${QUESTIONS.length} DigComp 2.2 + ${D3.length} DigComp 3.0).`);
console.log(`  Style-rule passes : ${allQuestions.length - styleFails.length} / ${allQuestions.length} (${((1 - styleFails.length / allQuestions.length) * 100).toFixed(1)}%)`);
console.log(`  Correct = longest : ${correctIsLongest} / ${allQuestions.length} (${(correctIsLongest / allQuestions.length * 100).toFixed(1)}%)`);

if (STRICT && styleFails.length > 0) process.exit(1);

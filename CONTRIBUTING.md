# Contributing to EPSO AD5 — Digital Skills Study Game

Thank you for taking the time to contribute. This is a personal exam-prep project and every fix or improvement makes the question bank more useful for everyone studying for the EPSO AD5/2026 Digital Skills Test.

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Reporting a bug](#reporting-a-bug)
- [Suggesting a new feature](#suggesting-a-new-feature)
- [Fixing or adding a question](#fixing-or-adding-a-question)
  - [Question format](#question-format)
  - [Quality checklist](#quality-checklist)
- [Code contributions](#code-contributions)
  - [Development setup](#development-setup)
  - [Code style](#code-style)
  - [Pull request process](#pull-request-process)
- [Code of Conduct](#code-of-conduct)

---

## Ways to contribute

| Type | How |
|---|---|
| Wrong answer or bad explanation | Open a [bug report](../../issues/new?template=bug_report.md) |
| Missing question or topic gap | Open a [feature request](../../issues/new?template=feature_request.md) |
| Fix or new questions | Fork → edit → pull request |
| UI bug | Open a [bug report](../../issues/new?template=bug_report.md) |
| Code improvement | Fork → fix → pull request |

---

## Reporting a bug

Use the [bug report template](../../issues/new?template=bug_report.md). Please include:

- **What you expected** vs **what happened**
- The question ID (shown in the top-left of the question card, e.g. `1.3.4`)
- Browser and device type

---

## Suggesting a new feature

Use the [feature request template](../../issues/new?template=feature_request.md). Keep requests focused and concrete — "add questions on GDPR Article 17" is more actionable than "add more questions".

---

## Fixing or adding a question

This is the most valuable type of contribution. Questions live in two files:

- `questions.js` — 168 DigComp 2.2 questions
- `digcomp3.js` — 26 DigComp 3.0 questions

### Question format

Each question is a plain JavaScript object:

```js
{
  i: "1.1.3",                // Unique ID — "area.competence.serial" (never reuse an existing ID)
  c: "1.1",                  // DigComp competence code (must match a code in AREAS)
  t: "Sponsored vs organic", // Short topic tag — shown in the question card header
  d: 2,                      // Difficulty: 1 easy · 2 medium · 3 hard
  q: "Question stem",        // The question, written as a complete sentence or scenario
  o: [                       // Exactly 4 answer options
    "Option A text",
    "Option B text",
    "Option C text",
    "Option D text"
  ],
  a: 1,                      // 0-based index of the correct option
  e: "Explanation text."     // Shown after answering — concise, cite the source concept
}
```

**ID convention:**
- DigComp 2.2 questions: `"area.competence.serial"` — e.g. `"1.1.9"` is the 9th question for competence 1.1
- DigComp 3.0 questions: `"d3.serial"` — e.g. `"d3.27"`
- IDs must be unique strings across both files

**Difficulty guide:**
- `1` — Definition or direct recall (e.g. "What does XYZ stand for?")
- `2` — Application or interpretation (e.g. "Which approach best addresses…?")
- `3` — Discrimination or edge case (e.g. two plausible answers that require precise knowledge to distinguish)

### Quality checklist

Before submitting, verify each question:

- [ ] The correct answer is unambiguous and clearly supported by DigComp 2.2, DigComp 3.0, GDPR, WCAG 2.2, or another authoritative source
- [ ] The three wrong options are plausible distractors, not obviously silly
- [ ] The explanation cites or paraphrases the relevant concept from an official source — no hallucinated facts
- [ ] No verbatim text is copied from the source PDFs (paraphrase and reformulate)
- [ ] The question stem is self-contained (readable without external context)
- [ ] The ID is unique and follows the naming convention
- [ ] `npm run validate:questions:strict` passes — confirms the four options are similar in length and tone, the correct answer is not a stylistic outlier (longer, only-hedged, only-multi-clause, only-policy-flavoured), and absolutes appear in the correct option as well as distractors when they appear at all

---

## Code contributions

### Development setup

No build step required. The app is loaded as native ES modules, so a static server is needed for local development (browsers block module imports over `file://`):

```bash
git clone https://github.com/DanielPalafox/epso-ad5-study.git
cd epso-ad5-study
npx serve .          # or: python -m http.server, or any static server
```

Then open the URL the server prints (usually `http://localhost:3000`).

### Project layout

```text
index.html              Entry document; loads questions.js, digcomp3.js, src/app.js
questions.js            DigComp 2.2 question bank (168 items)
digcomp3.js             DigComp 3.0 question bank + reference data
styles/                 Stylesheets split by concern (base, home, question, exam, results, digcomp3)
src/
  app.js                Boot: state init, keyboard, render loop
  router.js             View dispatcher + status bar
  state.js              Persistent + ephemeral state, localStorage
  actions.js            Mode controllers, answer/advance/quit
  decks.js              Deck builders (lesson, mock, practice, review)
  options.js            Per-question option permutation + balanced positions
  spaced-rep.js         SM-2 spaced repetition
  data.js               Derived lookups (QBYID, QBYC, COMP_NAMES)
  constants.js          Configuration values
  helpers.js            Pure utility functions
  html.js               Reusable HTML fragment builders
  modals.js             Confirm / alert / out-of-hearts dialogs
  effects.js            Toast, confetti
  keyboard.js           Global key bindings
  ui/
    home.js             Skill tree
    competence.js       Lesson intro overlay
    question.js         Question card + answer panel
    results.js          Lesson-end and mock-end screens
    settings.js         Settings page
    digcomp3.js         DigComp 3.0 reference page
```

### Code style

- **Vanilla JavaScript only** — no frameworks, no runtime npm dependencies, no bundler
  (devDependencies for tests/typecheck are fine; nothing ships to users)
- Native ES modules: one concern per file, explicit imports/exports
- No comments unless the *why* is non-obvious; rely on naming
- CSS is mobile-first: base styles target mobile, desktop enhancements live inside `@media (min-width: 601px)`
- Test in Chrome, Firefox, and Safari before submitting
- **Use the `html\`\`` tagged template** in `src/html.js` for any new HTML construction —
  it auto-escapes interpolated values. Avoid raw string concatenation with unescaped
  user-controlled values for new code.

### Running checks locally

```bash
npm install          # one-time, installs devDependencies
npm test             # unit tests (Vitest)
npm run typecheck    # TypeScript checks the JSDoc on all src/*.js
npm run validate:questions          # schema + style checks (warns)
npm run validate:questions:strict   # same, but fails on any style violation
npm run check        # typecheck + tests + strict validator (the CI gate)
```

CI runs all of these on every pull request. Don't rely on your local environment — read
the workflow output if a check fails.

### Architecture

See [DECISIONS.md](DECISIONS.md) for the rationale behind the framework, build, persistence,
routing, and SR algorithm choices. If you're proposing a change that conflicts with a recorded
decision, address that decision in your PR description.

### Pull request process

1. Fork the repository and create a branch: `git checkout -b fix/question-1.3.4-wrong-answer`
2. Make your changes
3. Open a pull request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
4. Describe *what* changed and *why* (link the relevant issue if one exists)

Pull requests that pass the quality checklist above and don't break existing functionality will be merged promptly.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

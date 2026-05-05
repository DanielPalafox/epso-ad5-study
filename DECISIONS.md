# Architecture Decisions

This document records the deliberate engineering choices made in this project, why they were made,
and what the alternatives would have cost. It is the answer to "why did you build it this way?"

---

## 1. No framework (vanilla JS + native ES modules)

**Decision:** No React, Vue, Svelte, or similar.

**Why:**
- The app's whole reactive surface is "answer a question → re-render the question card." A framework's diffing engine adds 30–100 KB of runtime to solve a problem that two `innerHTML` calls solve in 5 ms.
- Question content is curated (not user-authored), so virtual DOM's main win — preventing accidental re-renders of expensive subtrees — doesn't apply.
- Zero-dependency runtime means no supply-chain risk, no dependency upgrade churn, no transpiler footguns.

**Cost:** Manual wiring of state ↔ render. Mitigated by `setView()` and a single `render()` dispatcher.

**Trigger to revisit:** If the app grows a real per-component state model (e.g. multiple users, real-time sync, animations beyond confetti), a small framework like Lit or Alpine becomes worth it.

---

## 2. No build step

**Decision:** Files are served as-is from `/src/*.js`. No bundler, transpiler, or module-loader plugin.

**Why:**
- The project is a static study tool deployed to GitHub Pages. A build step adds:
  - A new failure mode (build broken → can't deploy)
  - A reviewer cost (PRs must rebuild + verify)
  - Tooling-specific knowledge for future contributors
- Native ES modules work in 100 % of supported browsers. HTTP/2 multiplexing on Pages makes the
  per-module request cost negligible.
- 25 source files at <30 KB total gzipped — bundling would save tens of milliseconds at most.

**Cost:** Local dev requires a static server (`npx serve`) instead of opening `index.html`
directly via `file://`. Documented in README.

**Trigger to revisit:** If gzipped source crosses ~150 KB or first-paint shows perceptible lag,
add a single-step `esbuild --bundle` to `pages.yml` only. Local dev unchanged.

---

## 3. JavaScript with `// @ts-check`, not TypeScript

**Decision:** Plain `.js` files annotated with JSDoc; `tsc --noEmit` runs in CI as the type-checker.

**Why:**
- Type safety with zero runtime cost and zero build step (decisions 1–2 stay intact).
- The project is small enough that the marginal value of full TS (refactoring tooling, library typings) is low.
- Contributors who don't know TypeScript can still read and modify the code; the JSDoc is documentation that *also* gets type-checked.

**Cost:** Less expressive than full TS for complex generics. JSDoc syntax for advanced types is verbose.

**Trigger to revisit:** If a contributor writes a type-system bug that JSDoc misses, or if the codebase grows past 5 K lines.

---

## 4. `localStorage` only — no backend

**Decision:** All progress lives in the user's browser via `localStorage`.

**Why:**
- The app is a personal study tool. Cross-device sync would require accounts, which would require auth, which would require a server, which would require funding/maintenance — for a project that's deliberately someone's hobby.
- localStorage gives instant reads/writes with zero latency.
- Privacy: nothing leaves the user's device.

**Cost:** Lose progress when clearing browser data; no cross-device sync.

**Mitigation:** A `localStorage` availability probe surfaces a toast if storage is blocked (Safari Private mode, embedded webviews) so users aren't surprised when progress doesn't save.

**Trigger to revisit:** If the project gains broader use, optional cloud sync via something like Cloudflare KV with a free tier becomes feasible.

---

## 5. Simplified SM-2 instead of vanilla SM-2 / FSRS

**Decision:** `updateSR()` implements a 4-line variant of SM-2: ease and interval mutate
on each answer; due date is `today + interval`.

**Why:**
- Full SM-2 needs a 0–5 quality scale; multiple-choice is binary (right/wrong), so 4 of those gradations are unused.
- FSRS is empirically better but ~200 lines and requires a learning curve to tune. Overkill for a 6-month study window.
- Tested and reasonable defaults (ease 2.5, ±0.1 / −0.2) match published Anki defaults.

**Cost:** Less precise scheduling than FSRS; long-interval items may resurface slightly too often or too rarely.

**Trigger to revisit:** If users report items "burying" them on review days, port `ts-fsrs` (small, MIT-licensed).

---

## 6. No URL routing for active modes (lesson, mock, practice, review)

**Decision:** Hash-routed: `HOME`, `SETTINGS`, `DIGCOMP3`. **Not** routed: lesson/mock/practice/review.

**Why:**
- Refreshing mid-mock-exam with a paused 30-min timer is genuinely ambiguous (do you restore the timer? extend it? abandon the test?). All defensible answers cost 50–100 lines of code and produce a worse UX than "refresh starts you fresh."
- For top-level navigation pages, refresh-survival is essential — that's where hash routing lives.

**Cost:** Mid-lesson refresh sends the user home. Mostly invisible to users since the current item doesn't survive anyway (deck is shuffled).

**Trigger to revisit:** If pause/resume mid-mock is requested, persist `ephemeral` to `sessionStorage` and add a "Resume?" prompt on boot.

---

## 7. innerHTML + escapeHTML, with `html\`\`` tagged template for new code

**Decision:** Existing views use `'<div>' + escapeHTML(x) + '</div>'`. New code uses
the `html\`\`` tagged template helper which auto-escapes interpolation.

**Why:**
- `innerHTML` is the right tool for the rebuild-everything render strategy: one
  property assignment replaces an entire view in one paint.
- A full DOM-builder rewrite (`document.createElement` + `textContent`) would be ~3× the LOC
  for no perceived UX benefit.
- The `html\`\`` helper makes XSS *structurally* hard for new code without forcing a
  full migration.

**Cost:** Existing 19 view-building functions still rely on the discipline of calling
`escapeHTML`. One forgotten call = one XSS vector.

**Mitigation:** All current callsites have been audited; the helper is in place for future
additions; CONTRIBUTING.md documents the pattern.

**Trigger to revisit:** If a contributor adds an unescaped interpolation, migrate that
file to `html\`\``.

---

## 8. No automated browser tests (yet)

**Decision:** Unit tests for pure logic (deck builders, SR, state, helpers) via Vitest.
No Playwright / Cypress yet.

**Why:**
- The high-value bugs in this app are in the question-bank logic and SR scheduling, not the DOM.
- Browser tests are 10× the maintenance cost of unit tests for marginal additional coverage.
- Manual cross-browser testing on Chrome / Firefox / Safari is feasible at this scope.

**Cost:** A regression in event wiring or visual layout can ship without CI catching it.

**Trigger to revisit:** Add Playwright when the app gains a second core flow (e.g. cloud sync, multi-user).

---

## 9. Service worker version is content-hashed in CI, not manual

**Decision:** `scripts/version-sw.mjs` runs in `pages.yml` before deploy and rewrites
`CACHE_VERSION` in `sw.js` to a hash of the app shell.

**Why:**
- Manual version bumps are forgotten. Forgetting on a content fix leaves users on a stale cache.
- Content-hashing is deterministic: same source → same version → no spurious cache invalidations.
- Costs ~5 ms in CI and 20 lines of node script.

**Cost:** A user must understand that the script exists if they ever debug a stale-cache issue
(documented in `sw.js` comments).

---

## What this project deliberately does **not** do

| Feature | Why not |
|---|---|
| Cloud sync / accounts | Backend cost, auth complexity, privacy trade-offs (Decision 4) |
| Real-time multiplayer | Out of scope; this is a solo study tool |
| Analytics / telemetry | Privacy choice; nothing leaves the user's device |
| Adaptive difficulty beyond crown filtering | The simplified SR already shifts focus to weak items; full IRT is overkill |
| Internationalisation | Single-target audience (EU institutions; English the working language) |
| Audio / TTS | Out of scope for a written exam |

---

## What I'd change if scaling to 10 K users / 10 K questions

- **Question delivery:** Move questions to a JSON manifest + per-area chunk files, fetched on demand. Drop `window.QUESTIONS` globals.
- **Search/filter:** Index the question bank with a tiny client-side index (lunr or hand-rolled).
- **Persistence:** Add optional cloud sync (Cloudflare KV / Supabase) behind a sign-in toggle. Keep localStorage as the offline default.
- **Build step:** Introduce esbuild for bundling and content-hashed asset URLs.
- **State model:** Introduce a real reducer/event-bus pattern so a future Lit/Alpine refactor is trivial.
- **Test pyramid:** Add Playwright for the lesson + mock flows, axe-core in CI for a11y regression.
- **Telemetry:** Self-hosted Plausible (privacy-respecting) for engagement metrics — opt-in.
- **i18n:** Externalise UI strings; English-only data for now.

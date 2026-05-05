# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Hash-based router for top-level views (`#/settings`, `#/digcomp3`) — these now survive a browser refresh
- `localStorage` availability probe with user-visible toast when storage is blocked (Safari Private mode, embedded webviews)
- `prefers-reduced-motion` accommodation: animations and the confetti burst are suppressed for users who request reduced motion
- Focus management: focus moves to the first interactive element of the new view on every render
- Tagged-template `html\`\`` helper for auto-escaping HTML interpolation (XSS-safe by default)
- Vitest unit tests for `helpers`, `spaced-rep`, `decks`, and `state` (~20 tests)
- TypeScript checking via `// @ts-check` + `tsconfig.json` (no build, type-checks `.js` files)
- Question-bank schema validator (CI-gated)
- Service-worker auto-versioning script (computes content hash on each deploy)
- CI workflow: typecheck + tests + question validation on every PR

### Changed
- Colour-contrast tokens: `--muted`, `--gold`, `--flame` darkened to meet WCAG AA on the cream background
- `setView()` API replaces direct `STATE.ephemeral.view = X; render()` mutations
- README and CONTRIBUTING updated with the new test/typecheck workflow

### Fixed
- `startMock()` did not reset `sessionStreak` — previous lesson's streak leaked into the mock test
- `<a data-act="settings">` had no `href` (not focusable, not semantic) — replaced with `<button>`
- `og:description` count corrected: 168 → 194
- `<noscript>` fallback added for users with JS disabled
- `<select>` in settings now has an explicit `<label for>` association

## [1.0.0] — 2026-05-05

### Added
- Initial public release
- 168 DigComp 2.2 questions + 26 DigComp 3.0 questions
- Hearts / XP / streak / crown progression
- 40-question timed mock exam
- DigComp 3.0 reference page with side-by-side area/competence comparison
- Mobile-first design with bottom-sheet feedback panel
- Spaced repetition (simplified SM-2)
- Crown level-up confetti, in-session streak XP multiplier
- Service worker for offline study (iOS Safari compatible)
- PWA manifest
- GitHub Pages auto-deploy workflow

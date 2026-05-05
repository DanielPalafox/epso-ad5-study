# EPSO AD5 — Digital Skills Study Game

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Deploy to GitHub Pages](https://github.com/DanielPalafox/epso-ad5-study/actions/workflows/pages.yml/badge.svg)](https://github.com/DanielPalafox/epso-ad5-study/actions/workflows/pages.yml)
![194 questions](https://img.shields.io/badge/questions-194-4c8c4a)
![No build step](https://img.shields.io/badge/build_step-none-lightgrey)

> Gamified exam prep for the **EPSO AD5/2026 Digital Skills Test** — 194 questions mapped to DigComp 2.2, a DigComp 3.0 reference section, a timed mock exam, and Duolingo-style mechanics (hearts, XP, streaks, crowns). Runs entirely in the browser with no server, no account, and no build step.

**[Live demo →](https://DanielPalafox.github.io/epso-ad5-study)**

---

## Screenshot

<!-- After deploying, replace this block with a real screenshot: -->
<!-- ![App screenshot](docs/screenshot.png) -->
> _Screenshot coming soon — [run locally](#quick-start) to preview._

---

## Features

| Feature | Detail |
| --- | --- |
| **168 lesson questions** | Mapped to all 21 DigComp 2.2 competences across 5 areas |
| **26 DigComp 3.0 questions** | Covers what changed in the November 2025 update |
| **Hearts system** | 5 hearts max, regenerate 1 per 30 min, lose one per wrong answer in lesson mode |
| **XP & daily streaks** | +10 XP per correct answer, configurable daily goal, streak counter |
| **Crown progression** | Bronze → Silver → Gold → Legendary per competence |
| **Mock exam** | 40 questions, 30-min timer, 8 per area, 20/40 pass mark — matches EPSO format |
| **Review mode** | Automatically builds a deck from your error history |
| **DigComp 3.0 reference** | Side-by-side area and competence comparison between 2.2 and 3.0 |
| **Spaced repetition** | Simplified SM-2 — wrong items resurface; due-today badge on review |
| **Offline support** | Service worker caches the app shell; works without a connection (iOS Safari compatible) |
| **PWA-installable** | Add to home screen on iOS/Android — runs standalone with theme colour |
| **Mobile-first** | Responsive design with bottom-sheet feedback panel on small screens |
| **Zero runtime dependencies** | Plain HTML + CSS + vanilla JS — no npm, no bundler, no account required |

---

## Quick start

The app loads as native ES modules, so it needs to be served over HTTP (browsers block module imports over `file://`):

```bash
git clone https://github.com/DanielPalafox/epso-ad5-study.git
cd epso-ad5-study
npx serve .            # any static server works
# or: python3 -m http.server 8000
```

Then open the URL the server prints (usually `http://localhost:3000`).

No install step. No build. No bundler.

---

## Deploy to GitHub Pages

Pushing to `main` triggers the included GitHub Actions workflow and deploys automatically.

**One-time setup:**

1. **Settings → Pages → Build and deployment**
2. Source: **GitHub Actions**
3. Push to `main` — the workflow handles the rest.

Your app will be live at `https://DanielPalafox.github.io/epso-ad5-study` within about a minute.

> **Manual alternative:** Set source to _Deploy from a branch → main / (root)_ in the same Settings panel — no Actions needed.

---

## File structure

```text
.
├── index.html          # Single-page shell — loads CSS + JS, renders into #view
├── styles.css          # All styling — mobile-first, desktop via min-width queries
├── questions.js        # 168 DigComp 2.2 questions + AREAS structure (window globals)
├── digcomp3.js         # 26 DigComp 3.0 questions + reference data (window globals)
├── src/                # Application source (native ES modules — no build)
│   ├── app.js          # Boot: state init, keyboard, render loop
│   ├── router.js       # View dispatcher + status bar
│   ├── state.js        # Persistent + ephemeral state, localStorage
│   ├── actions.js      # Mode controllers (start/finish/answer/quit)
│   ├── decks.js        # Deck builders (lesson, mock, practice, review)
│   ├── spaced-rep.js   # SM-2 spaced repetition
│   ├── data.js         # Derived lookups (QBYID, QBYC, COMP_NAMES)
│   ├── constants.js    # Configuration values
│   ├── helpers.js      # Pure utilities
│   ├── html.js         # Reusable HTML fragments
│   ├── modals.js       # Confirm / alert / out-of-hearts dialogs
│   ├── effects.js      # Toast + confetti
│   ├── keyboard.js     # Global key bindings
│   └── ui/             # One file per view (home, question, results, settings, …)
├── .github/            # Issue/PR templates + Pages deploy workflow
├── CONTRIBUTING.md     # How to contribute questions and code fixes
├── CODE_OF_CONDUCT.md  # Contributor Covenant 2.1
├── SECURITY.md         # Security policy
├── LICENSE             # MIT
└── README.md           # This file
```

---

## Question format

Each question is a plain JS object in `questions.js` (DigComp 2.2) or `digcomp3.js` (DigComp 3.0):

```js
{
  i: "1.1.3",                 // Unique ID — "area.competence.serial"
  c: "1.1",                   // DigComp competence code
  t: "Sponsored vs organic",  // Short topic tag shown in the card header
  d: 2,                       // Difficulty: 1 easy · 2 medium · 3 hard
  q: "Question stem text",
  o: ["Option A", "Option B", "Option C", "Option D"],
  a: 1,                       // 0-based index of the correct option
  e: "Explanation shown after answering — paraphrase the source concept."
}
```

Want to fix an answer or add a question? See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Sources

- **DigComp 2.2** — Vuorikari, Kluzer & Punie, _DigComp 2.2: The Digital Competence Framework for Citizens_, JRC128415, 2022. [Official PDF](https://publications.jrc.ec.europa.eu/repository/handle/JRC128415)
- **DigComp 3.0** — Cosgrove & Cachia, _DigComp 3.0: European Digital Competence Framework — Fifth Edition_, JRC144121, EUR 40491, 27 November 2025, doi:10.2760/0001149. [Official PDF](https://publications.jrc.ec.europa.eu/repository/handle/JRC144121)
- **EPSO AD5/2026 Notice of Competition** — EPSO/AD/427/26, OJ C/2026/711
- **EPSO sample materials** — Digital Skills mock test, Part 3
- **WCAG 2.2** — W3C Recommendation, October 2023
- **GDPR** — Regulation (EU) 2016/679

Question content is paraphrased and reformulated for exam practice; no verbatim text is reproduced from the source documents.

---

## Caveats

- Built for personal exam preparation, not as legal or institutional advice.
- DigComp 3.0 was published only weeks before the EPSO AD5/2026 application window opened. EPSO's 2026 Notice still references **DigComp 2.2** — treat the DigComp 3.0 section as supplementary background until EPSO updates its framework reference.
- `localStorage` is per-browser. Clearing site data resets your progress.

---

## Contributing

Found a bug, a wrong answer, or want to add questions? See [CONTRIBUTING.md](CONTRIBUTING.md).
Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## Architecture

See [DECISIONS.md](DECISIONS.md) for the rationale behind the framework, build,
persistence, routing, and SR algorithm choices.

## Quality checks

Every pull request runs typecheck (`tsc` on JSDoc), unit tests (Vitest), and the
question-bank schema validator. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## License

Code: [MIT](LICENSE). Question content: original/paraphrased — use freely for personal study.

// Auto-bumps `CACHE_VERSION` in sw.js to a hash of the app shell contents.
// Run in CI before deploy so every shipped change cleanly invalidates the SW cache.

import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";

const APP_SHELL = [
  "index.html",
  "styles/base.css",
  "styles/home.css",
  "styles/question.css",
  "styles/exam.css",
  "styles/results.css",
  "styles/digcomp3.css",
  "manifest.webmanifest",
  "questions.js",
  "digcomp3.js",
  "src/app.js",
  "src/router.js",
  "src/state.js",
  "src/actions.js",
  "src/decks.js",
  "src/options.js",
  "src/spaced-rep.js",
  "src/data.js",
  "src/constants.js",
  "src/helpers.js",
  "src/html.js",
  "src/modals.js",
  "src/effects.js",
  "src/keyboard.js",
  "src/theme.js",
  "src/ui/home.js",
  "src/ui/competence.js",
  "src/ui/question.js",
  "src/ui/results.js",
  "src/ui/settings.js",
  "src/ui/digcomp3.js"
];

const buffers = await Promise.all(APP_SHELL.map(p => readFile(p)));
const hash = createHash("sha256");
buffers.forEach(b => hash.update(b));
const version = hash.digest("hex").slice(0, 12);

const sw = await readFile("sw.js", "utf8");
const updated = sw.replace(/const CACHE_VERSION = "[^"]*";/, `const CACHE_VERSION = "${version}";`);
if (sw === updated) {
  console.warn("✗ Could not find CACHE_VERSION line in sw.js");
  process.exit(1);
}
await writeFile("sw.js", updated);
console.log(`✓ sw.js CACHE_VERSION → ${version}`);

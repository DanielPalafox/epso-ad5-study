// Test environment shims. Mirrors the global state the modules expect from the browser.

const _store = {};
globalThis.localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
  setItem(k, v) { _store[k] = String(v); },
  removeItem(k) { delete _store[k]; },
  clear() { for (const k of Object.keys(_store)) delete _store[k]; }
};

// Make `window.X` lookups resolve against globalThis.
if (!globalThis.window) globalThis.window = globalThis;

// Minimal question-bank fixture — three competences across two areas.
globalThis.QUESTIONS = [
  { i: "1.1.1", c: "1.1", t: "Topic A", d: 1, q: "Q1.1.1?", o: ["A", "B", "C", "D"], a: 0, e: "Because A." },
  { i: "1.1.2", c: "1.1", t: "Topic A", d: 2, q: "Q1.1.2?", o: ["A", "B", "C", "D"], a: 1, e: "Because B." },
  { i: "1.1.3", c: "1.1", t: "Topic A", d: 3, q: "Q1.1.3?", o: ["A", "B", "C", "D"], a: 2, e: "Because C." },
  { i: "1.2.1", c: "1.2", t: "Topic B", d: 1, q: "Q1.2.1?", o: ["A", "B", "C", "D"], a: 3, e: "Because D." },
  { i: "1.2.2", c: "1.2", t: "Topic B", d: 2, q: "Q1.2.2?", o: ["A", "B", "C", "D"], a: 0, e: "Because A." },
  { i: "2.1.1", c: "2.1", t: "Topic C", d: 1, q: "Q2.1.1?", o: ["A", "B", "C", "D"], a: 1, e: "Because B." },
  { i: "2.1.2", c: "2.1", t: "Topic C", d: 2, q: "Q2.1.2?", o: ["A", "B", "C", "D"], a: 2, e: "Because C." }
];

globalThis.AREAS = [
  {
    roman: "I", name: "Information",
    competences: [
      { c: "1.1", name: "Browsing" },
      { c: "1.2", name: "Evaluating" }
    ]
  },
  {
    roman: "II", name: "Communication",
    competences: [
      { c: "2.1", name: "Interacting" }
    ]
  }
];

globalThis.DIGCOMP3_QUESTIONS = [];

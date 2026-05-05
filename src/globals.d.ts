// Ambient declarations for the question-bank globals that questions.js and digcomp3.js
// attach to `window`. These files are loaded as classic scripts before the module entry,
// so the globals are available by the time data.js evaluates.

export {};

declare global {
  interface Window {
    QUESTIONS: any[];
    AREAS: any[];
    DIGCOMP3_QUESTIONS: any[];
    DIGCOMP3_META: any;
    DIGCOMP3_AREAS: any[];
    DIGCOMP3_RENAMES: any[];
    DIGCOMP3_HIGHLIGHTS: any[];
    DIGCOMP3_EPSO_NOTE: string;
  }
}

// @ts-check
// HTML-string helpers.
//
// `html` is a tagged template that auto-escapes interpolated values.
// Use it for *all new code* — it makes XSS structurally hard rather than
// "remember to call escapeHTML every time".
//
//   const safe = html`<p>${userInput}</p>`;     // userInput is escaped
//   const mix  = html`<p>${raw(trustedHtml)}</p>`; // opt-out for pre-built fragments

import { MAX_HEARTS } from "./constants.js";
import { escapeHTML } from "./helpers.js";

class RawHTML {
  /** @param {string} s */
  constructor(s) { this.html = s; }
}

/**
 * Wraps a string to mark it as already-escaped HTML (skipped by `html` tag).
 * @param {string} s
 */
export function raw(s) { return new RawHTML(s); }

/**
 * Tagged template literal: interpolates with HTML-escape applied to every value
 * that isn't wrapped in `raw()`. Returns a plain string for use with innerHTML.
 * @param {TemplateStringsArray} strings
 * @param  {...unknown} values
 * @returns {string}
 */
export function html(strings, ...values) {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v === null || v === undefined || v === false) continue;
      if (v instanceof RawHTML) out += v.html;
      else out += escapeHTML(v);
    }
  }
  return out;
}

/**
 * @param {number} hearts
 * @param {string} ariaLabel
 */
export function heartRow(hearts, ariaLabel) {
  let pips = "";
  for (let i = 0; i < MAX_HEARTS; i++) {
    pips += '<span class="heart-icon' + (i < hearts ? '' : ' empty') + '"></span>';
  }
  return html`<span class="heart-row" aria-label="${ariaLabel}">${raw(pips)}</span>`;
}

/**
 * @param {string} num
 * @param {string} title
 */
export function sectionHead(num, title) {
  return html`<div class="section-head"><span class="num">${num}</span><h3>${title}</h3><span class="rule"></span></div>`;
}

/** @param {number} crown */
export function crownPips(crown) {
  let pips = "";
  for (let i = 1; i <= 4; i++) {
    pips += '<span class="crown-pip-inline ' + (i <= crown ? 'filled' : '') + '"></span>';
  }
  return html`<div class="pips">${raw(pips)}</div>`;
}

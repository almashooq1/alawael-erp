/**
 * landingContentActive.js — active-language content selector for the public landing.
 *
 * Picks Arabic (default) or English content based on a persisted localStorage
 * flag ('alawael-lang'). Exposes:
 *   - default export: the active content object (ar | en) — same shape as landingContent.js
 *   - activeLang: 'ar' | 'en'
 *   - isEn: boolean
 *   - tr(arText, enText): pick the right string for the active language
 *
 * The language switch persists to localStorage and the page reloads so that all
 * module-level derivations from the content object re-evaluate against the new
 * language — no component refactor required.
 */
import ar from './landingContent';
import en from './landingContentEn';

export function getActiveLang() {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('alawael-lang') === 'en') return 'en';
  } catch {
    /* ignore */
  }
  return 'ar';
}

export const activeLang = getActiveLang();
export const isEn = activeLang === 'en';
/** Pick the right string for the active language. */
export const tr = (arText, enText) => (isEn ? enText : arText);

export default isEn ? en : ar;

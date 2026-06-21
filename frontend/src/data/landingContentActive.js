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

// CMS override (injected on window before this module is evaluated; see index.js).
// MVP: CMS overrides the Arabic content only; English stays static.
const cmsOverride =
  (typeof window !== 'undefined' && window.__ALAWAEL_LANDING_CMS__) || null;

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
// Deep-merge src over a structural clone of base (arrays replaced wholesale).
function deepMerge(base, src) {
  if (!isPlainObject(base) || !isPlainObject(src)) return src === undefined ? base : src;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(src)) {
    out[k] = isPlainObject(base[k]) && isPlainObject(src[k]) ? deepMerge(base[k], src[k]) : src[k];
  }
  return out;
}

export default isEn ? en : cmsOverride ? deepMerge(ar, cmsOverride) : ar;

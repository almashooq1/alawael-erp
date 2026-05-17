'use strict';

/**
 * arabic-readability.service.js — Wave 43 (Family Communication Engine).
 *
 * Pure module. Estimates a "school-grade" readability for Arabic text,
 * adapted from the Dawood Arabic Readability Index (DARI) + sentence /
 * lexical complexity heuristics. NO external dependencies.
 *
 * Why hand-rolled: standard English readability formulas (Flesch, FK)
 * don't model Arabic correctly — they assume Latin syllable counting
 * and word boundaries that map poorly to Arabic morphology. The Family
 * Generator must NOT ship a grade computed by a wrong formula.
 *
 * Grade scale: 1..16 (1 = early primary, 6 = end-of-primary,
 * 9 = middle, 12 = high school, 16 = university).
 *
 * The Care Planning spec §11.1 mandates family-version readability ≤ 6.
 *
 * Approach (heuristic but stable):
 *
 *   complexity =
 *       0.35 * avgWordLength            (longer roots / affixes ⇒ harder)
 *     + 0.30 * avgSentenceLength_words  (longer sentences ⇒ harder)
 *     + 0.20 * complexWordRatio         (≥6 chars OR ≥3 syllables proxy)
 *     + 0.10 * rareLexiconRatio         (terms outside common-family list)
 *     + 0.05 * passiveVoiceRatio        (verb-form heuristic)
 *
 *   grade = round( 1 + 15 * normalize(complexity) )
 *
 * The output is documented as APPROXIMATE — final validation must be
 * a human review for any plan that scores 5-6 (close to ceiling).
 *
 * Public API:
 *   estimateGrade(text) → { grade, wordCount, sentenceCount,
 *                            avgWordLength, complexWordRatio,
 *                            rareLexiconRatio, passiveVoiceRatio,
 *                            confidence: 'high'|'medium'|'low' }
 *   isWithinFamilyTarget(text, maxGrade=6) → boolean
 */

// Curated common-family Arabic lexicon (≤ Grade 6 vocabulary).
// This list is INTENTIONALLY small — its job is to bias the model
// against penalising everyday family words, not to be exhaustive.
const COMMON_FAMILY_LEXICON = new Set([
  // Time / scheduling
  'اليوم',
  'يوم',
  'أيام',
  'الأسبوع',
  'أسبوع',
  'الشهر',
  'شهر',
  'موعد',
  'جلسة',
  'جلسات',
  'مرة',
  'مرتين',
  'يوميا',
  'يوميًا',
  'أسبوعيا',
  'أسبوعيًا',
  // Family roles
  'الأسرة',
  'الأم',
  'الأب',
  'الوالد',
  'الوالدة',
  'الأهل',
  'الطفل',
  'الابن',
  'الابنة',
  'الطفلة',
  'أمي',
  'أبي',
  'ولد',
  'بنت',
  // Therapy basics
  'هدف',
  'أهداف',
  'تمرين',
  'تمارين',
  'لعبة',
  'ألعاب',
  'تعلم',
  'يتعلم',
  'يقرأ',
  'القراءة',
  'يكتب',
  'الكتابة',
  'يتكلم',
  'الكلام',
  'النطق',
  'يتفاعل',
  'التفاعل',
  'يستجيب',
  'الاستجابة',
  'يجلس',
  'يقف',
  'يمشي',
  'يأكل',
  // House / setting
  'البيت',
  'المنزل',
  'المركز',
  'المدرسة',
  'المعلم',
  'المعلمة',
  'الأخصائي',
  'الأخصائية',
  'الطبيب',
  'الطبيبة',
  // Communication verbs
  'أرجو',
  'يرجى',
  'شكرًا',
  'مرحبًا',
  'تهانينا',
  'هذا',
  'هذه',
  'تلك',
  'ذلك',
  // Numbers and common adjectives
  'كل',
  'بعض',
  'كثير',
  'قليل',
  'جيد',
  'جيدة',
  'ممتاز',
  'ممتازة',
  'صعب',
  'صعبة',
  'سهل',
  'سهلة',
  'جديد',
  'جديدة',
  'قديم',
  'قديمة',
  // Connectives
  'في',
  'من',
  'إلى',
  'على',
  'مع',
  'عند',
  'بعد',
  'قبل',
  'و',
  'أو',
  'لكن',
  'إذا',
  'حتى',
  'لأن',
  'بسبب',
  'حيث',
  'كما',
]);

// Clinical / regulatory vocabulary that MUST NOT appear in family text
// (returned via detectForbiddenTerms). The Family Generator runs this
// list AFTER its own redaction pass — this is a tripwire, not a primary
// filter.
const FORBIDDEN_CLINICAL_TERMS = Object.freeze([
  // ICD / diagnostic codes
  'ICD',
  'icd',
  'icd-10',
  'icd-11',
  'icd10',
  // Internal jargon
  'baseline',
  'evidence',
  'confidence',
  'assessment',
  'evidenceRef',
  // Scales / instruments (raw)
  'VB-MAPP',
  'VB MAPP',
  'GARS',
  'ADOS',
  'CARS',
  'WPPSI',
  'WISC',
  'PEP-3',
  'ABLLS',
  // Codes
  'F84.0',
  'F90.0',
  'F70',
  'F71',
  'F72',
]);

// Verb-form proxies for Arabic passive voice (مضارع/ماضٍ مبني للمجهول).
// Heuristic only — actual morphology requires diacritics absent in real text.
const PASSIVE_VERB_PREFIXES = ['تُ', 'يُ', 'نُ'];
const PASSIVE_VERB_PATTERNS = [/^أ.+ت$/, /يُ[ا-ي]{2,}/, /تُ[ا-ي]{2,}/];

// ─── Tokenization helpers ────────────────────────────────────────

const SENTENCE_DELIMITERS = /[.!؟?\n]+/;
const WORD_DELIMITERS = /[\s،,;:()،""«»\-\/\\\[\]{}]+/;

const ARABIC_LETTER_RE = /[؀-ۿ]/;

function tokenizeWords(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(WORD_DELIMITERS)
    .map(w => w.trim())
    .filter(w => w.length > 0 && ARABIC_LETTER_RE.test(w));
}

function tokenizeSentences(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(SENTENCE_DELIMITERS)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// Cheap syllable proxy: count vowel-like letters + consonant clusters
// in an Arabic word. Not linguistically exact — but adequate to
// distinguish "كتاب" (simple) from "استعمالات" (complex).
const ARABIC_VOWELS = /[ا و ي ى أ إ آ ؤ ئ]/g;

function approximateSyllables(word) {
  if (!word) return 0;
  const matches = word.match(ARABIC_VOWELS);
  // Floor at 1 for any non-empty word
  return matches ? Math.max(1, matches.length) : 1;
}

function isComplexWord(word) {
  // ≥ 6 letters OR ≥ 3 syllable-proxy units
  if (word.length >= 6) return true;
  if (approximateSyllables(word) >= 3) return true;
  return false;
}

function isRareWord(word) {
  return !COMMON_FAMILY_LEXICON.has(word);
}

function looksPassive(word) {
  // Heuristic: starts with passive prefix OR matches a known passive
  // verb pattern. Will overcount in some contexts — penalty weight is
  // intentionally low (0.05).
  for (const p of PASSIVE_VERB_PREFIXES) {
    if (word.startsWith(p)) return true;
  }
  for (const re of PASSIVE_VERB_PATTERNS) {
    if (re.test(word)) return true;
  }
  return false;
}

// ─── Scoring ────────────────────────────────────────────────────

const WEIGHTS = Object.freeze({
  avgWordLength: 0.35,
  avgSentenceLength: 0.3,
  complexWordRatio: 0.2,
  rareLexiconRatio: 0.1,
  passiveVoiceRatio: 0.05,
});

// Normalisation anchors — calibrated so a 4th-grade Arabic primer
// produces complexity ≈ 0.25, and a university research paper ≈ 0.90.
const ANCHOR_WORD_LENGTH = { easy: 3.5, hard: 7.5 };
const ANCHOR_SENTENCE_LENGTH = { easy: 6, hard: 20 };
const ANCHOR_COMPLEX_RATIO = { easy: 0.1, hard: 0.55 };
const ANCHOR_RARE_RATIO = { easy: 0.2, hard: 0.85 };
const ANCHOR_PASSIVE_RATIO = { easy: 0.05, hard: 0.45 };

function normalize(value, { easy, hard }) {
  if (value <= easy) return 0;
  if (value >= hard) return 1;
  return (value - easy) / (hard - easy);
}

function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Estimate the readability grade for a piece of Arabic text.
 * Returns { grade, ... metrics }.
 */
function estimateGrade(text) {
  const sentences = tokenizeSentences(text);
  const words = tokenizeWords(text);

  if (words.length === 0) {
    return {
      grade: 1,
      wordCount: 0,
      sentenceCount: 0,
      avgWordLength: 0,
      avgSentenceLength: 0,
      complexWordRatio: 0,
      rareLexiconRatio: 0,
      passiveVoiceRatio: 0,
      confidence: 'low',
    };
  }

  const totalLetters = words.reduce((acc, w) => acc + w.length, 0);
  const avgWordLength = totalLetters / words.length;
  const avgSentenceLength = words.length / Math.max(1, sentences.length);

  let complexCount = 0;
  let rareCount = 0;
  let passiveCount = 0;
  for (const w of words) {
    if (isComplexWord(w)) complexCount += 1;
    if (isRareWord(w)) rareCount += 1;
    if (looksPassive(w)) passiveCount += 1;
  }

  const complexWordRatio = complexCount / words.length;
  const rareLexiconRatio = rareCount / words.length;
  const passiveVoiceRatio = passiveCount / words.length;

  const complexity = clamp01(
    WEIGHTS.avgWordLength * normalize(avgWordLength, ANCHOR_WORD_LENGTH) +
      WEIGHTS.avgSentenceLength * normalize(avgSentenceLength, ANCHOR_SENTENCE_LENGTH) +
      WEIGHTS.complexWordRatio * normalize(complexWordRatio, ANCHOR_COMPLEX_RATIO) +
      WEIGHTS.rareLexiconRatio * normalize(rareLexiconRatio, ANCHOR_RARE_RATIO) +
      WEIGHTS.passiveVoiceRatio * normalize(passiveVoiceRatio, ANCHOR_PASSIVE_RATIO)
  );

  const grade = Math.max(1, Math.min(16, Math.round(1 + 15 * complexity)));

  // Confidence: low for very short texts, high for ≥ 60 words & 4+ sentences
  let confidence = 'high';
  if (words.length < 25 || sentences.length < 2) confidence = 'low';
  else if (words.length < 60 || sentences.length < 4) confidence = 'medium';

  return {
    grade,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordLength: Number(avgWordLength.toFixed(2)),
    avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
    complexWordRatio: Number(complexWordRatio.toFixed(3)),
    rareLexiconRatio: Number(rareLexiconRatio.toFixed(3)),
    passiveVoiceRatio: Number(passiveVoiceRatio.toFixed(3)),
    confidence,
  };
}

function isWithinFamilyTarget(text, maxGrade = 6) {
  const { grade } = estimateGrade(text);
  return grade <= maxGrade;
}

/**
 * Trip-wire: detect clinical / regulatory terms that should never
 * appear in a family-facing document. Returns the offending terms
 * (deduped), empty array if clean.
 */
function detectForbiddenTerms(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const lower = text.toLowerCase();
  const hits = new Set();
  for (const term of FORBIDDEN_CLINICAL_TERMS) {
    // Case-sensitive for codes (F84.0), case-insensitive for words
    if (term.match(/^[A-Z][a-z]/) || term.toLowerCase() === term) {
      if (lower.includes(term.toLowerCase())) hits.add(term);
    } else if (text.includes(term)) {
      hits.add(term);
    }
  }
  return Array.from(hits);
}

module.exports = {
  estimateGrade,
  isWithinFamilyTarget,
  detectForbiddenTerms,
  // Exposed for testing + future tuning
  WEIGHTS,
  COMMON_FAMILY_LEXICON,
  FORBIDDEN_CLINICAL_TERMS,
};

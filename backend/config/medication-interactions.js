/**
 * medication-interactions.js — canonical known-bad drug pairs.
 *
 * Beneficiary-360 Commit 23. The SEED list of drug-drug interactions
 * we check for `safety.medication.interaction.detected`. This is
 * NOT a substitute for a real pharmacology database — it's the
 * table of well-known, high-severity conflicts every rehab center
 * should catch at minimum. Real deployments should replace it with
 * an SFDA / Saudi FDA data feed.
 *
 * Design decisions:
 *
 *   1. **Each pair canonicalized** — we store `[a, b]` in alpha
 *      order so the adapter's lookup is direction-agnostic. If a
 *      new pair is added, the `test` file drift check asserts
 *      order.
 *
 *   2. **Names are lowercase, trimmed.** Matching is case-
 *      insensitive. A medication `"Warfarin"` matches `"warfarin"`
 *      in this list.
 *
 *   3. **`severity` enum** — high/moderate/low. Only `high` trips
 *      the CRITICAL flag; lower severities populate for UI-level
 *      informational alerts (out of scope for this flag).
 *
 *   4. **Short rationale per entry** — "why does this pair
 *      matter" in one sentence. Keeps the table self-documenting
 *      for clinical reviewers.
 */

'use strict';

function canonPair(a, b) {
  const [x, y] = [a, b].map(s => s.trim().toLowerCase());
  return x < y ? [x, y] : [y, x];
}

const RAW_INTERACTIONS = [
  {
    a: 'warfarin',
    b: 'aspirin',
    severity: 'high',
    rationale: 'Synergistic bleeding risk — increased risk of GI and intracranial hemorrhage.',
  },
  {
    a: 'warfarin',
    b: 'ibuprofen',
    severity: 'high',
    rationale: 'NSAID potentiates warfarin — significant bleeding risk.',
  },
  {
    a: 'warfarin',
    b: 'amiodarone',
    severity: 'high',
    rationale: 'Amiodarone inhibits warfarin metabolism — INR rise, bleeding.',
  },
  {
    a: 'fluoxetine',
    b: 'tramadol',
    severity: 'high',
    rationale: 'Serotonin syndrome risk from combined serotonergic activity.',
  },
  {
    a: 'fluoxetine',
    b: 'phenelzine',
    severity: 'high',
    rationale: 'SSRI + MAOI — contraindicated, life-threatening serotonin syndrome.',
  },
  {
    a: 'sertraline',
    b: 'tramadol',
    severity: 'high',
    rationale: 'Serotonin syndrome risk.',
  },
  {
    a: 'metformin',
    b: 'iodinated_contrast',
    severity: 'high',
    rationale: 'Risk of lactic acidosis; hold metformin around contrast administration.',
  },
  {
    a: 'methotrexate',
    b: 'trimethoprim',
    severity: 'high',
    rationale: 'Additive folate antagonism — bone-marrow suppression.',
  },
  {
    a: 'clopidogrel',
    b: 'omeprazole',
    severity: 'moderate',
    rationale: 'Omeprazole reduces clopidogrel activation — reduced antiplatelet effect.',
  },
  {
    a: 'simvastatin',
    b: 'clarithromycin',
    severity: 'high',
    rationale: 'CYP3A4 inhibition — elevated statin levels, rhabdomyolysis risk.',
  },
  {
    a: 'digoxin',
    b: 'amiodarone',
    severity: 'high',
    rationale: 'Amiodarone raises digoxin levels — toxicity risk. Reduce digoxin dose.',
  },
  {
    a: 'risperidone',
    b: 'carbamazepine',
    severity: 'moderate',
    rationale: 'Carbamazepine induction lowers risperidone levels — reduced efficacy.',
  },
];

const INTERACTIONS = Object.freeze(
  RAW_INTERACTIONS.map(e => {
    const [a, b] = canonPair(e.a, e.b);
    return Object.freeze({ a, b, severity: e.severity, rationale: e.rationale });
  })
);

// Set of canonical pair keys for O(1) lookup
const INTERACTION_KEY_SET = new Set(INTERACTIONS.map(e => `${e.a}::${e.b}`));

/**
 * Look up whether two drug names have a known interaction. Order-
 * agnostic (alpha-canonicalized). Returns the matching entry or
 * null.
 */
function findInteraction(drugA, drugB) {
  if (!drugA || !drugB) return null;
  const [a, b] = canonPair(drugA, drugB);
  if (a === b) return null; // same drug, not an interaction
  return INTERACTIONS.find(e => e.a === a && e.b === b) || null;
}

/**
 * Given a list of drug names, return ALL pairwise interactions
 * found. Duplicates (same canonical pair) collapse to one entry.
 */
function findAllInteractions(drugNames) {
  const uniq = Array.from(
    new Set(drugNames.map(n => (n || '').trim().toLowerCase()).filter(Boolean))
  );
  const found = [];
  const seen = new Set();
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const hit = findInteraction(uniq[i], uniq[j]);
      if (hit) {
        const key = `${hit.a}::${hit.b}`;
        if (!seen.has(key)) {
          seen.add(key);
          found.push(hit);
        }
      }
    }
  }
  return found;
}

module.exports = {
  INTERACTIONS,
  INTERACTION_KEY_SET,
  findInteraction,
  findAllInteractions,
  canonPair,
};

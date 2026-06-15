'use strict';
/**
 * W1345 — FHIR R4 OperationOutcome serializer.
 *
 * The W1344 validator returns a plain result object ({ valid, errors[], ... }).
 * When a Bundle is rejected by NPHIES / any FHIR endpoint, the *standard* way to
 * report the failure back to a caller is a FHIR R4 `OperationOutcome` resource —
 * not an ad-hoc error shape. This module closes that loop: it turns a validator
 * result (single-resource OR bundle) into a conformant OperationOutcome whose
 * `issue[]` mirrors the validator's `errors[]`, with a FHIRPath `expression`
 * extracted from each diagnostic when one is recognisable.
 *
 * It also serves the success path: FHIR `OperationOutcome.issue` is 1..*, so a
 * clean validation emits a single `information` issue rather than an empty list.
 *
 * Scope: pure serialization of validator output. It does NOT itself validate —
 * pass it the result of `validateFhirResource` / `validateFhirBundle`.
 *
 * PURE: no DB, no IO, no mongoose, no randomness. Deterministic. Never mutates
 * input. Additive + non-breaking: standalone module.
 */

/** Treat undefined/null/'' as absent. */
function isPresent(v) {
  return v !== undefined && v !== null && v !== '';
}

/** FHIR R4 issue-severity value-set (http://hl7.org/fhir/issue-severity). */
const ISSUE_SEVERITIES = Object.freeze(['fatal', 'error', 'warning', 'information']);

/**
 * Subset of the FHIR R4 issue-type value-set
 * (http://hl7.org/fhir/issue-type) relevant to structural validation output.
 */
const ISSUE_TYPE_CODES = Object.freeze([
  'invalid',
  'structure',
  'required',
  'value',
  'invariant',
  'processing',
  'informational',
]);

/**
 * Extract a FHIRPath `expression` from a validator diagnostic string when one is
 * recognisable. Handles both single-resource diagnostics (`Patient.name is
 * required ...`) and bundle-entry diagnostics (`entry[3] (Coverage): Coverage.
 * payor is required ...` → `Bundle.entry[3].resource.Coverage.payor`).
 *
 * Returns `undefined` when no path can be confidently extracted (e.g. choice
 * elements or top-level shape errors) so the caller simply omits `expression`.
 *
 * @param {string} diagnostics
 * @returns {string|undefined}
 */
function expressionFromDiagnostic(diagnostics) {
  if (typeof diagnostics !== 'string') return undefined;

  // Bundle-entry prefix: `entry[<i>] (<ResourceType>): <inner>`
  const entryMatch = diagnostics.match(/^entry\[(\d+)\]\s+\([^)]*\):\s*(.*)$/);
  if (entryMatch) {
    const idx = entryMatch[1];
    const innerPath = leadingResourcePath(entryMatch[2]);
    if (innerPath) return `Bundle.entry[${idx}].resource.${innerPath}`;
    return undefined;
  }

  const path = leadingResourcePath(diagnostics);
  return path || undefined;
}

/**
 * Pull a leading `ResourceType.element` token (the FHIRPath of the offending
 * element) from a diagnostic. Returns `undefined` for shape/choice diagnostics
 * that don't start with a dotted path.
 * @param {string} text
 * @returns {string|undefined}
 */
function leadingResourcePath(text) {
  if (typeof text !== 'string') return undefined;
  const m = text.match(/^([A-Z][A-Za-z]+\.[A-Za-z][A-Za-z0-9]*)\b/);
  return m ? m[1] : undefined;
}

/**
 * Build a single OperationOutcome.issue.
 * @param {string} severity One of ISSUE_SEVERITIES.
 * @param {string} code One of ISSUE_TYPE_CODES.
 * @param {string} diagnostics Human-readable detail.
 * @param {string} [expression] Optional FHIRPath expression.
 * @returns {object}
 */
function buildIssue(severity, code, diagnostics, expression) {
  const issue = { severity, code };
  if (isPresent(diagnostics)) issue.diagnostics = diagnostics;
  if (isPresent(expression)) issue.expression = [expression];
  return issue;
}

/**
 * Serialize a validator result into a FHIR R4 OperationOutcome.
 *
 * Accepts the shape returned by either `validateFhirResource`
 * (`{ valid, errors, resourceType }`) or `validateFhirBundle`
 * (`{ valid, errors, entryCount }`) — only `errors` (and optionally `valid`) is
 * consulted, so any `{ errors: string[] }` works.
 *
 * @param {{ valid?: boolean, errors?: string[] }} result Validator output.
 * @param {object} [opts]
 * @param {string} [opts.severity='error'] Severity for each error issue.
 * @param {string} [opts.code='structure'] Issue-type code for each error issue.
 * @param {string} [opts.successText='All structural checks passed.'] Diagnostic
 *   for the single information issue emitted when there are no errors.
 * @returns {{ resourceType: 'OperationOutcome', issue: object[] }}
 */
function buildOperationOutcome(result, opts = {}) {
  const {
    severity = 'error',
    code = 'structure',
    successText = 'All structural checks passed.',
  } = opts;

  const errors = result && Array.isArray(result.errors) ? result.errors : [];

  if (errors.length === 0) {
    // OperationOutcome.issue is 1..* — emit an informational success issue.
    return {
      resourceType: 'OperationOutcome',
      issue: [buildIssue('information', 'informational', successText)],
    };
  }

  return {
    resourceType: 'OperationOutcome',
    issue: errors.map(diagnostics =>
      buildIssue(severity, code, diagnostics, expressionFromDiagnostic(diagnostics))
    ),
  };
}

module.exports = {
  buildOperationOutcome,
  buildIssue,
  expressionFromDiagnostic,
  leadingResourcePath,
  isPresent,
  ISSUE_SEVERITIES,
  ISSUE_TYPE_CODES,
};

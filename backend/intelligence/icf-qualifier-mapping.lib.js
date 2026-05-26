'use strict';

/**
 * icf-qualifier-mapping.lib.js — W453.
 *
 * Pure functions for translating measure values into ICF qualifiers (0-4).
 * No Mongoose, no DB, no I/O — fully unit-testable.
 *
 * Per Phase A of docs/blueprint/beneficiary-lifecycle-v3.md. The Measurement
 * Master entity carries a `defaultIcfMapping` that defines:
 *   • primary       — the ICF code this measure speaks to
 *   • qualifierAlgorithm — how to translate the recorded value
 *   • qualifierBands     — band table for the algorithm
 *
 * Algorithms:
 *   'direct_5_band'   value falls in band[i] → qualifier = band[i].qualifier
 *                     (use when higher value = higher impairment)
 *   'inverse_5_band'  value falls in band[i] → qualifier = band[i].qualifier
 *                     (caller authors band table with inversion baked in;
 *                     the algorithm name is documentation, semantically
 *                     identical to direct_5_band at runtime — the inversion
 *                     intent lives in the band author's hands)
 *   'threshold_based' value ≥ band.minValue → qualifier from band; else 0
 *                     (use for single-threshold cutoffs like "score < X = ok")
 *   'manual'          never auto-populate; clinician decides per-record
 *
 * Confidence:
 *   'high'   value falls clearly within a band's [minValue, maxValue]
 *   'medium' value at a band boundary (within 5% of edge)
 *   'low'    value derived via threshold extrapolation
 */

const ALLOWED_ALGORITHMS = ['direct_5_band', 'inverse_5_band', 'threshold_based', 'manual'];
const VALID_QUALIFIERS = [0, 1, 2, 3, 4];
const CODE_FORMAT = /^[bsde]\d+$/;
const BOUNDARY_TOLERANCE = 0.05;

/**
 * Validate a defaultIcfMapping configuration.
 * @returns { valid: boolean, errors: Array<string> }
 */
function validateMapping(mapping) {
  const errors = [];
  if (!mapping || typeof mapping !== 'object') {
    return { valid: false, errors: ['NOT_OBJECT'] };
  }

  if (mapping.primary && !CODE_FORMAT.test(mapping.primary)) {
    errors.push(`INVALID_PRIMARY_CODE:${mapping.primary}`);
  }

  if (Array.isArray(mapping.secondary)) {
    for (const code of mapping.secondary) {
      if (!CODE_FORMAT.test(code)) errors.push(`INVALID_SECONDARY_CODE:${code}`);
    }
  }

  if (!ALLOWED_ALGORITHMS.includes(mapping.qualifierAlgorithm)) {
    errors.push(`INVALID_ALGORITHM:${mapping.qualifierAlgorithm}`);
  }

  if (mapping.qualifierAlgorithm !== 'manual') {
    if (!Array.isArray(mapping.qualifierBands) || mapping.qualifierBands.length === 0) {
      errors.push('MISSING_QUALIFIER_BANDS');
    } else {
      for (const band of mapping.qualifierBands) {
        if (typeof band.minValue !== 'number' || typeof band.maxValue !== 'number') {
          errors.push('INVALID_BAND_BOUNDS');
        }
        if (band.minValue > band.maxValue) {
          errors.push(`BAND_INVERTED:${band.minValue}>${band.maxValue}`);
        }
        if (!VALID_QUALIFIERS.includes(band.qualifier)) {
          errors.push(`INVALID_BAND_QUALIFIER:${band.qualifier}`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map a numeric value to an ICF qualifier using the given mapping.
 *
 * @param {number} value
 * @param {Object} mapping - the defaultIcfMapping from MeasurementMaster
 * @returns { qualifier: 0-4, confidence: 'high'|'medium'|'low' } | null
 */
function mapValueToQualifier(value, mapping) {
  if (mapping?.qualifierAlgorithm === 'manual' || mapping?.qualifierAlgorithm == null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const bands = mapping.qualifierBands;
  if (!Array.isArray(bands) || bands.length === 0) return null;

  if (mapping.qualifierAlgorithm === 'threshold_based') {
    // Single-threshold semantics: pick the highest band whose minValue ≤ value;
    // default to qualifier 0 if no band matched.
    const sorted = bands.slice().sort((a, b) => b.minValue - a.minValue);
    for (const band of sorted) {
      if (value >= band.minValue) {
        return { qualifier: band.qualifier, confidence: 'low' };
      }
    }
    return { qualifier: 0, confidence: 'medium' };
  }

  // direct_5_band + inverse_5_band: band[i].min ≤ value ≤ band[i].max → q
  for (const band of bands) {
    if (value >= band.minValue && value <= band.maxValue) {
      const width = band.maxValue - band.minValue;
      const margin = width * BOUNDARY_TOLERANCE;
      const nearBoundary = value <= band.minValue + margin || value >= band.maxValue - margin;
      return {
        qualifier: band.qualifier,
        confidence: nearBoundary ? 'medium' : 'high',
      };
    }
  }

  // Value outside all bands — unmappable
  return null;
}

/**
 * Convenience: returns a populated icfQualifier subdoc shape for embedding
 * in MeasurementResult.icfQualifier when auto-mapping fires on save.
 */
function buildQualifierSnapshot(value, masterMapping) {
  if (!masterMapping?.primary) return null;
  const mapped = mapValueToQualifier(value, masterMapping);
  if (!mapped) return null;
  return {
    code: masterMapping.primary,
    qualifier: mapped.qualifier,
    confidence: mapped.confidence,
    mappedAutomatically: true,
    mappedAt: new Date(),
  };
}

module.exports = Object.freeze({
  validateMapping,
  mapValueToQualifier,
  buildQualifierSnapshot,
  // Constants exposed for tests
  ALLOWED_ALGORITHMS,
  VALID_QUALIFIERS,
  CODE_FORMAT,
  BOUNDARY_TOLERANCE,
});

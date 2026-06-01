'use strict';

/**
 * psychometrics/index.js — W694 barrel for the psychometric intelligence layer.
 *
 * Pure functions only. Combines normative score conversions (norms.js) with
 * the Reliable Change Index / Jacobson-Truax classification (reliable-change.js).
 */

const norms = require('./norms');
const reliableChange = require('./reliable-change');

module.exports = {
  // normative conversions
  zScore: norms.zScore,
  tScore: norms.tScore,
  scaledScore: norms.scaledScore,
  standardScore: norms.standardScore,
  percentile: norms.percentile,
  normativeBand: norms.normativeBand,
  normProfile: norms.profile,
  normalCdf: norms.normalCdf,

  // reliable change
  RCI_CRITICAL_95: reliableChange.RCI_CRITICAL_95,
  RCI_OUTCOMES: reliableChange.OUTCOMES,
  sdiff: reliableChange.sdiff,
  rci: reliableChange.rci,
  classifyChange: reliableChange.classify,

  // namespaced access
  norms,
  reliableChange,
};

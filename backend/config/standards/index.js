'use strict';

/**
 * Standards registry index — World-Class QMS Phase 29.
 *
 * Central lookup so the StandardsTraceability service can resolve a
 * standard by its code regardless of which specific module ships it.
 * New standards (JCI, CBAHI, ISO 13485, etc.) plug in here without
 * the service needing to know about them.
 */

const iso9001 = require('./iso-9001-2015.registry');
const jci = require('./jci-7th-ed.registry');
const cbahi = require('./cbahi-hc-4th-ed.registry');
const iso13485 = require('./iso-13485-2016.registry');
const iso14971 = require('./iso-14971-2019.registry');

const REGISTRIES = Object.freeze({
  [iso9001.STANDARD.code]: iso9001,
  [jci.STANDARD.code]: jci,
  [cbahi.STANDARD.code]: cbahi,
  [iso13485.STANDARD.code]: iso13485,
  [iso14971.STANDARD.code]: iso14971,
});

function getStandard(code) {
  const reg = REGISTRIES[code];
  if (!reg) {
    const err = new Error(`unknown standard code: ${code}`);
    err.code = 'UNKNOWN_STANDARD';
    throw err;
  }
  return reg;
}

function listStandards() {
  return Object.values(REGISTRIES).map(r => r.STANDARD);
}

function findClause(standardCode, clauseCode) {
  const reg = getStandard(standardCode);
  return (reg.CLAUSES || []).find(c => c.code === clauseCode) || null;
}

module.exports = {
  REGISTRIES,
  getStandard,
  listStandards,
  findClause,
};

/**
 * KPI module public API.
 *
 *   const { definitions, KpiComputeEngine } = require('./kpi');
 */

'use strict';

const defs = require('./definitions');
const { KpiComputeEngine } = require('./compute');

module.exports = {
  ...defs,
  KpiComputeEngine,
};

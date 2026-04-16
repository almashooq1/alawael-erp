'use strict';

const { AlertsEngine } = require('./engine');
const rules = require('./rules');

function buildEngine(opts) {
  return new AlertsEngine(opts).registerAll(rules);
}

module.exports = {
  AlertsEngine,
  rules,
  buildEngine,
};

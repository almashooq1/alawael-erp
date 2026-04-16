'use strict';

const { AlertsEngine } = require('./engine');
const { AlertDispatcher } = require('./dispatcher');
const { AlertsScheduler } = require('./scheduler');
const { buildDefaultRecipientResolver, DEFAULT_ROUTES } = require('./recipients');
const AlertModel = require('./alert.model');
const rules = require('./rules');

function buildEngine(opts) {
  return new AlertsEngine(opts).registerAll(rules);
}

module.exports = {
  AlertsEngine,
  AlertDispatcher,
  AlertsScheduler,
  AlertModel,
  buildDefaultRecipientResolver,
  DEFAULT_ROUTES,
  rules,
  buildEngine,
};

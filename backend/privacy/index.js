/**
 * Privacy (PDPL) module — public API.
 */

'use strict';

const consent = require('./consent.model');
const dsr = require('./data-subject-request.model');
const { makeConsentCheck } = require('./consent-check');
const retention = require('./retention-policy');

module.exports = {
  Consent: consent,
  DataSubjectRequest: dsr,
  makeConsentCheck,
  retention,
};

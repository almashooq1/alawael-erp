/**
 * Approvals module — public API.
 */

'use strict';

const { ApprovalChainEngine, STATUSES } = require('./engine');
const { CHAINS, selectChain } = require('./chains');

const engine = new ApprovalChainEngine();

module.exports = {
  ApprovalChainEngine,
  STATUSES,
  CHAINS,
  selectChain,
  engine,
};

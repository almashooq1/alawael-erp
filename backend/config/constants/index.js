/**
 * Platform Constants — Barrel Export
 *
 * نقطة استيراد واحدة لكل ثوابت المنصة.
 *
 * Usage:
 *   const { ROLES, TENANT_FIELD, resolveRole } = require('../config/constants');
 */

'use strict';

const roles = require('./roles.constants');
const tenant = require('./tenant.constants');

module.exports = {
  ...roles,
  ...tenant,
};

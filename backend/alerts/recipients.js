/**
 * Default RecipientResolver — maps an alert to the people who should
 * be notified, based on rule category + severity.
 *
 * Callers may swap in their own implementation (e.g. route by team
 * ownership, escalation policy, on-call calendar).
 */

'use strict';

const { ROLES } = require('../config/constants');

/**
 * Table of default recipients by (category, severity).
 * Each entry is an array of canonical role names. The resolver
 * queries the user directory for users with those roles scoped to
 * the alert's branch (if any) and returns them with default channels.
 */
const DEFAULT_ROUTES = {
  clinical: {
    info: [ROLES.SUPERVISOR],
    warning: [ROLES.SUPERVISOR],
    high: [ROLES.SUPERVISOR, ROLES.MANAGER],
    critical: [ROLES.SUPERVISOR, ROLES.MANAGER, ROLES.HEAD_OFFICE_ADMIN],
  },
  financial: {
    info: [ROLES.ACCOUNTANT],
    warning: [ROLES.ACCOUNTANT, ROLES.MANAGER],
    high: [ROLES.ACCOUNTANT, ROLES.MANAGER],
    critical: [ROLES.MANAGER, ROLES.HEAD_OFFICE_ADMIN],
  },
  operational: {
    info: [ROLES.MANAGER],
    warning: [ROLES.MANAGER],
    high: [ROLES.MANAGER],
    critical: [ROLES.MANAGER, ROLES.HEAD_OFFICE_ADMIN],
  },
  quality: {
    info: [ROLES.SUPERVISOR],
    warning: [ROLES.SUPERVISOR, ROLES.MANAGER],
    high: [ROLES.MANAGER, ROLES.HEAD_OFFICE_ADMIN],
    critical: [ROLES.MANAGER, ROLES.HEAD_OFFICE_ADMIN, ROLES.SUPER_ADMIN],
  },
  hr: {
    info: [ROLES.HR],
    warning: [ROLES.HR, ROLES.HR_MANAGER],
    high: [ROLES.HR_MANAGER, ROLES.MANAGER],
    critical: [ROLES.HR_MANAGER, ROLES.HEAD_OFFICE_ADMIN],
  },
  compliance: {
    info: [ROLES.HEAD_OFFICE_ADMIN],
    warning: [ROLES.HEAD_OFFICE_ADMIN],
    high: [ROLES.HEAD_OFFICE_ADMIN, ROLES.SUPER_ADMIN],
    critical: [ROLES.SUPER_ADMIN, ROLES.HEAD_OFFICE_ADMIN],
  },
};

/**
 * Build a resolver.
 * @param {Object} deps
 * @param {object} deps.UserModel  User Mongoose model (or stub with .find)
 * @param {Record<string, Record<string, string[]>>} [deps.routes]
 * @param {string[]} [deps.defaultChannels] channels a user receives when no prefs
 */
function buildDefaultRecipientResolver({
  UserModel,
  routes = DEFAULT_ROUTES,
  defaultChannels = ['in_app', 'email'],
}) {
  if (!UserModel) throw new Error('buildDefaultRecipientResolver: UserModel required');

  return {
    async resolve(alert) {
      const category = alert.category || 'operational';
      const severity = alert.severity || 'info';
      const rolesForLevel = (routes[category] && routes[category][severity]) || [];
      if (!rolesForLevel.length) return [];

      const q = { roles: { $in: rolesForLevel }, status: 'active' };
      if (alert.branchId) {
        q.$or = [{ defaultBranchId: alert.branchId }, { accessibleBranches: alert.branchId }];
      }
      const users = await UserModel.find(q);
      return users.map(u => ({
        id: u._id || u.id,
        channels: u.notificationPreferences || defaultChannels,
      }));
    },
  };
}

module.exports = { DEFAULT_ROUTES, buildDefaultRecipientResolver };

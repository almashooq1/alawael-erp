/**
 * Constants barrel export.
 * نقطة تصدير موحدة للثوابت
 */

export { default as DEPT_COLORS } from './departmentColors';
export { default as ROUTES } from './routes';
export { default as API } from './apiEndpoints';
export {
  default as MODULE_REGISTRY,
  getModule,
  getModulesForRole,
  getModulesGrouped,
} from './moduleRegistry';
export {
  ACTIONS,
  RESOURCES,
  buildPermission,
  ROLE_HIERARCHY,
  hasHigherRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
} from './permissions';
export {
  GENERAL_STATUS_MAP,
  APPOINTMENT_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  LEAVE_STATUS_MAP,
  ATTENDANCE_STATUS_MAP,
  INVOICE_STATUS_MAP,
  TICKET_STATUS_MAP,
  PRIORITY_MAP,
  STOCK_STATUS_MAP,
  getStatusConfig,
} from './statusMaps';

/**
 * Finance Dashboard Components Index
 * مؤشر مكونات لوحة التحكم المالية
 *
 * Exports:
 * - ValidationDashboard: لوحة تحقق القواعد المالية
 * - CashFlowDashboard: لوحة التدفق النقدي
 * - RiskDashboard: لوحة إدارة المخاطر
 * - ReportingDashboard: لوحة التقارير المالية
 * - ComplianceDashboard: لوحة الامتثال والحوكمة
 */

export { default as ValidationDashboard } from './ValidationDashboard';
export { default as CashFlowDashboard } from './CashFlowDashboard';
export { default as RiskDashboard } from './RiskDashboard';
export { default as ReportingDashboard } from './ReportingDashboard';
export { default as ComplianceDashboard } from './ComplianceDashboard';

// Re-export all as individual components
import ValidationDashboard from './ValidationDashboard';
import CashFlowDashboard from './CashFlowDashboard';
import RiskDashboard from './RiskDashboard';
import ReportingDashboard from './ReportingDashboard';
import ComplianceDashboard from './ComplianceDashboard';

export const FinanceDashboards = {
  ValidationDashboard,
  CashFlowDashboard,
  RiskDashboard,
  ReportingDashboard,
  ComplianceDashboard,
};

// Default export
export default FinanceDashboards;

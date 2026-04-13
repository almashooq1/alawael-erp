/**
 * Payroll Routes — مسارات الرواتب
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const PayrollDashboard = lazyWithRetry(() => import('../pages/Payroll/PayrollDashboard'));
const PayrollProcessing = lazyWithRetry(() => import('../pages/hr/PayrollProcessing'));
const PayrollReports = lazyWithRetry(() => import('../pages/hr/PayrollReports'));
const PayrollSettings = lazyWithRetry(() => import('../pages/hr/PayrollSettings'));

export default function PayrollRoutes() {
  return (
    <>
      <Route path="payroll" element={<PayrollDashboard />} />
      <Route path="payroll/processing" element={<PayrollProcessing />} />
      <Route path="payroll/reports" element={<PayrollReports />} />
      <Route path="payroll/settings" element={<PayrollSettings />} />
    </>
  );
}

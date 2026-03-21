/**
 * Employee Affairs Routes — مسارات شؤون الموظفين
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const EmployeeAffairsDashboard = lazyWithRetry(() => import('../pages/EmployeeAffairs/EmployeeAffairsDashboard'));
const EmployeeManagement = lazyWithRetry(() => import('../pages/hr/EmployeeManagement'));
const LeaveManagement = lazyWithRetry(() => import('../pages/LeaveManagement'));
const EmployeePortal = lazyWithRetry(() => import('../pages/hr/EmployeePortal'));

export default function EmployeeAffairsRoutes() {
  return (
    <>
      <Route path="employee-affairs" element={<EmployeeAffairsDashboard />} />
      <Route path="employee-affairs/employees" element={<EmployeeManagement />} />
      <Route path="employee-affairs/leaves" element={<LeaveManagement />} />
      <Route path="employee-affairs/portal" element={<EmployeePortal />} />
    </>
  );
}

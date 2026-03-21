/**
 * Leave Management Routes — مسارات إدارة الإجازات
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const LeaveDashboard = lazyWithRetry(() => import('../pages/LeaveManagement/LeaveDashboard'));
const LeaveManagement = lazyWithRetry(() => import('../pages/LeaveManagement'));

export default function LeaveManagementRoutes() {
  return (
    <>
      <Route path="leave-management" element={<LeaveDashboard />} />
      <Route path="leave-management/requests" element={<LeaveManagement />} />
    </>
  );
}

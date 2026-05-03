/**
 * Attendance Routes — مسارات الحضور والانصراف
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AttendanceDashboard = lazyWithRetry(() => import('../pages/Attendance/AttendanceDashboard'));
const AttendanceManagement = lazyWithRetry(() => import('../pages/hr/AttendanceManagement'));
const AttendanceManagementPro = lazyWithRetry(
  () => import('../pages/Attendance/AttendanceManagement')
);
const AttendanceReports = lazyWithRetry(() => import('../pages/AttendanceReports'));
const ZKTecoDeviceManagement = lazyWithRetry(() => import('../pages/hr/ZKTecoDeviceManagement'));

export default function AttendanceRoutes() {
  return (
    <>
      <Route path="attendance" element={<AttendanceDashboard />} />
      <Route path="attendance/management" element={<AttendanceManagement />} />
      <Route path="attendance/pro" element={<AttendanceManagementPro />} />
      <Route path="attendance/reports" element={<AttendanceReports />} />
      <Route path="attendance/devices" element={<ZKTecoDeviceManagement />} />
    </>
  );
}

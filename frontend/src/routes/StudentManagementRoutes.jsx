/**
 * Student Management Routes — مسارات إدارة الطلاب
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const StudentsDashboard = lazyWithRetry(() => import('../pages/StudentManagement/StudentsDashboard'));
const StudentManagementList = lazyWithRetry(() => import('../pages/StudentManagement/StudentManagementList'));
const StudentRegistration = lazyWithRetry(() => import('../pages/StudentRegistration'));
const StudentReports = lazyWithRetry(() => import('../pages/StudentReports'));
const StudentReportsCenter = lazyWithRetry(() => import('../pages/StudentReportsCenter'));

export default function StudentManagementRoutes() {
  return (
    <>
      <Route path="student-management" element={<StudentsDashboard />} />
      <Route path="student-management/list" element={<StudentManagementList />} />
      <Route path="student-management/registration" element={<StudentRegistration />} />
      <Route path="student-management/reports" element={<StudentReports />} />
      <Route path="student-management/reports-center" element={<StudentReportsCenter />} />
    </>
  );
}

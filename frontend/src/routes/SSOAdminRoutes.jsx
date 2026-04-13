/**
 * SSO/MFA Admin Routes — مسارات إدارة تسجيل الدخول الموحد
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const SSOAdminDashboard = lazyWithRetry(() => import('../pages/sso-admin/SSOAdminDashboard'));

export default function SSOAdminRoutes() {
  return (
    <>
      <Route path="sso-admin" element={<SSOAdminDashboard />} />
    </>
  );
}

/**
 * Risk Management Routes — مسارات إدارة المخاطر
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const RiskDashboard = lazyWithRetry(() => import('../pages/RiskManagement/RiskDashboard'));
const RiskRegister = lazyWithRetry(() => import('../pages/RiskManagement/RiskRegister'));

export default function RiskManagementRoutes() {
  return (
    <>
      <Route path="risk-management" element={<RiskDashboard />} />
      <Route path="risk-management/register" element={<RiskRegister />} />
    </>
  );
}

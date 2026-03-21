/**
 * Operations Routes — مسارات العمليات والتشغيل
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const OperationsDashboard = lazyWithRetry(() => import('../pages/Operations/OperationsDashboard'));
const MaintenanceDashboard = lazyWithRetry(() => import('../pages/Operations/MaintenanceDashboard'));
const EquipmentManagement = lazyWithRetry(() => import('../pages/Operations/EquipmentManagement'));
const IncidentManagement = lazyWithRetry(() => import('../pages/Operations/IncidentManagement'));
const LicenseManagement = lazyWithRetry(() => import('../pages/Operations/LicenseManagement'));
const VisitorRegistry = lazyWithRetry(() => import('../pages/Operations/VisitorRegistry'));
const RiskAssessment = lazyWithRetry(() => import('../pages/Operations/RiskAssessment'));

export default function OperationsRoutes() {
  return (
    <>
      <Route path="operations" element={<OperationsDashboard />} />
      <Route path="operations/maintenance" element={<MaintenanceDashboard />} />
      <Route path="operations/equipment" element={<EquipmentManagement />} />
      <Route path="operations/incidents" element={<IncidentManagement />} />
      <Route path="operations/licenses" element={<LicenseManagement />} />
      <Route path="operations/visitors" element={<VisitorRegistry />} />
      <Route path="operations/risk" element={<RiskAssessment />} />
    </>
  );
}

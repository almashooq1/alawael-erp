/**
 * HSE Routes — مسارات الصحة والسلامة المهنية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const HSEDashboard = lazyWithRetry(() => import('../pages/HSE/HSEDashboard'));
const IncidentsList = lazyWithRetry(() => import('../pages/HSE/IncidentsList'));

export default function HSERoutes() {
  return (
    <>
      <Route path="hse" element={<HSEDashboard />} />
      <Route path="hse/incidents" element={<IncidentsList />} />
    </>
  );
}

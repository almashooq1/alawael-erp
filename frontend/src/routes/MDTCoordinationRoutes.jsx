/**
 * MDT Coordination Routes
 * مسارات التنسيق متعدد التخصصات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const MDTCoordinationDashboard = lazyWithRetry(
  () => import('../pages/mdt/MDTCoordinationDashboard')
);

export default function MDTCoordinationRoutes() {
  return (
    <>
      <Route path="mdt-coordination" element={<MDTCoordinationDashboard />} />
    </>
  );
}

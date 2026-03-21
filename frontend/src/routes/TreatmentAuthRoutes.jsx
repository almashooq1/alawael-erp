/**
 * Treatment Authorization Routes — مسارات تصاريح العلاج
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const TreatmentAuthorizationDashboard = lazyWithRetry(() => import('../pages/treatmentAuthorization/TreatmentAuthorizationDashboard'));

export default function TreatmentAuthRoutes() {
  return (
    <>
      <Route path="treatment-authorization" element={<TreatmentAuthorizationDashboard />} />
    </>
  );
}

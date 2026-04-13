/**
 * HR Insurance Routes — مسارات التأمين الصحي
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const HRInsuranceDashboard = lazyWithRetry(() => import('../pages/HRInsurance/HRInsuranceDashboard'));

export default function HRInsuranceRoutes() {
  return (
    <>
      <Route path="hr-insurance" element={<HRInsuranceDashboard />} />
    </>
  );
}

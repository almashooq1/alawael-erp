/**
 * Disability Routes — مسارات الإعاقة والتأهيل
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const DisabilityAuthorityDashboard = lazyWithRetry(() => import('../pages/disabilityAuthority/DisabilityAuthorityDashboard'));
const DisabilityAssessmentScales = lazyWithRetry(() => import('../pages/DisabilityAssessmentScales/DisabilityAssessmentScales'));
const DisabilityAssessmentTests = lazyWithRetry(() => import('../pages/DisabilityAssessmentTests'));

export default function DisabilityRoutes() {
  return (
    <>
      <Route path="disability" element={<DisabilityAuthorityDashboard />} />
      <Route path="disability/scales" element={<DisabilityAssessmentScales />} />
      <Route path="disability/tests" element={<DisabilityAssessmentTests />} />
    </>
  );
}

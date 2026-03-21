/**
 * ICF Assessment Routes
 * مسارات تقييمات ICF الوظيفية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const ICFAssessmentDashboard = lazyWithRetry(
  () => import('../pages/icf/ICFAssessmentDashboard')
);

export default function ICFAssessmentRoutes() {
  return (
    <>
      <Route path="icf-assessments" element={<ICFAssessmentDashboard />} />
    </>
  );
}

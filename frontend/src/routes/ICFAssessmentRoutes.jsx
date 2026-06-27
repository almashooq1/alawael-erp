/**
 * ICF Assessment Routes
 * مسارات تقييمات ICF الوظيفية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ICFAssessmentDashboard = lazyWithRetry(() => import('../pages/icf/ICFAssessmentDashboard'));
const ICFAssessmentForm = lazyWithRetry(() => import('../pages/icf/ICFAssessmentForm'));
const ICFAssessmentDetail = lazyWithRetry(() => import('../pages/icf/ICFAssessmentDetail'));

export default function ICFAssessmentRoutes() {
  return (
    <>
      <Route path="icf-assessments" element={<ICFAssessmentDashboard />} />
      <Route path="icf/new" element={<ICFAssessmentForm />} />
      <Route path="icf/edit/:id" element={<ICFAssessmentForm />} />
      <Route path="icf/:id" element={<ICFAssessmentDetail />} />
    </>
  );
}

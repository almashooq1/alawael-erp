/**
 * Integrated Care Routes — مسارات الرعاية المتكاملة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CarePlansDashboard = lazyWithRetry(() => import('../pages/IntegratedCare/CarePlansDashboard'));
const CreateCarePlan = lazyWithRetry(() => import('../pages/IntegratedCare/CreateCarePlan'));
const RecordSession = lazyWithRetry(() => import('../pages/IntegratedCare/RecordSession'));

export default function IntegratedCareRoutes() {
  return (
    <>
      <Route path="integrated-care" element={<CarePlansDashboard />} />
      <Route path="integrated-care/create" element={<CreateCarePlan />} />
      <Route path="integrated-care/session" element={<RecordSession />} />
    </>
  );
}

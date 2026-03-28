/**
 * Care Plan Routes — مسارات خطط الرعاية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CarePlanPage = lazyWithRetry(() => import('../pages/care-plans/CarePlanPage'));

export default function CarePlanRoutes() {
  return (
    <>
      <Route path="care-plans" element={<CarePlanPage />} />
      <Route path="rehab/care-plans" element={<CarePlanPage />} />
    </>
  );
}

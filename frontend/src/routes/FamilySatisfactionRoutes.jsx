/**
 * Family Satisfaction Routes — مسارات رضا الأسرة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const FamilySatisfactionDashboard = lazyWithRetry(() => import('../pages/familySatisfaction/FamilySatisfactionDashboard'));

export default function FamilySatisfactionRoutes() {
  return (
    <>
      <Route path="family-satisfaction" element={<FamilySatisfactionDashboard />} />
    </>
  );
}

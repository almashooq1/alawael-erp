/**
 * Laundry Routes — مسارات المغسلة
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const LaundryDashboard = lazyWithRetry(() => import('../pages/laundry/LaundryDashboard'));

export default function LaundryRoutes() {
  return (
    <>
      <Route path="laundry" element={<LaundryDashboard />} />
    </>
  );
}

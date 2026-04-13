/**
 * AR Rehabilitation Routes
 * مسارات التأهيل بالواقع المعزز
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ARRehabDashboard = lazyWithRetry(
  () => import('../pages/ar-rehab/ARRehabDashboard')
);

export default function ARRehabRoutes() {
  return (
    <>
      <Route path="ar-rehab" element={<ARRehabDashboard />} />
    </>
  );
}

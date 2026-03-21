/**
 * Kitchen Routes — مسارات المطبخ والتغذية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const KitchenDashboard = lazyWithRetry(() => import('../pages/kitchen/KitchenDashboard'));

export default function KitchenRoutes() {
  return (
    <>
      <Route path="kitchen" element={<KitchenDashboard />} />
    </>
  );
}

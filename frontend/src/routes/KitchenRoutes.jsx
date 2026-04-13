/**
 * Kitchen Routes — مسارات المطبخ والتغذية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const KitchenDashboard = lazyWithRetry(() => import('../pages/kitchen/KitchenDashboard'));

export default function KitchenRoutes() {
  return (
    <>
      <Route path="kitchen" element={<KitchenDashboard />} />
    </>
  );
}

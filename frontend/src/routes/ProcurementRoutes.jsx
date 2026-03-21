/**
 * Procurement Routes — مسارات المشتريات
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const ProcurementDashboard = lazyWithRetry(() => import('../pages/Procurement/ProcurementDashboard'));
const PurchaseOrdersList = lazyWithRetry(() => import('../pages/Procurement/PurchaseOrdersList'));

export default function ProcurementRoutes() {
  return (
    <>
      <Route path="procurement" element={<ProcurementDashboard />} />
      <Route path="procurement/orders" element={<PurchaseOrdersList />} />
    </>
  );
}

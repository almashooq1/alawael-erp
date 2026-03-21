/**
 * Warehouse Management Routes — مسارات إدارة المستودعات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const WarehouseDashboard = lazyWithRetry(() => import('../pages/Warehouse/WarehouseDashboard'));
const WarehouseList = lazyWithRetry(() => import('../pages/Warehouse/WarehouseList'));
const WarehouseTransactions = lazyWithRetry(() => import('../pages/Warehouse/WarehouseTransactions'));

export default function WarehouseRoutes() {
  return (
    <>
      <Route path="warehouse" element={<WarehouseDashboard />} />
      <Route path="warehouse/list" element={<WarehouseList />} />
      <Route path="warehouse/transactions" element={<WarehouseTransactions />} />
    </>
  );
}

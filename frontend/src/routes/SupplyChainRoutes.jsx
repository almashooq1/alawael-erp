/**
 * Supply Chain Routes — مسارات سلسلة الإمداد
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const SupplyChainDashboard = lazyWithRetry(() => import('../pages/supply-chain/SupplyChainDashboard'));
const InventoryManagement = lazyWithRetry(() => import('../pages/supply-chain/InventoryManagement'));
const VendorManagement = lazyWithRetry(() => import('../pages/supply-chain/VendorManagement'));
const PurchasingManagement = lazyWithRetry(() => import('../pages/supply-chain/PurchasingManagement'));
const StockTransfers = lazyWithRetry(() => import('../pages/supply-chain/StockTransfers'));
const ContractsManagement = lazyWithRetry(() => import('../pages/supply-chain/ContractsManagement'));
const BranchWarehouseManagement = lazyWithRetry(() => import('../pages/supply-chain/BranchWarehouseManagement'));

export default function SupplyChainRoutes() {
  return (
    <>
      <Route path="supply-chain" element={<SupplyChainDashboard />} />
      <Route path="supply-chain/inventory" element={<InventoryManagement />} />
      <Route path="supply-chain/vendors" element={<VendorManagement />} />
      <Route path="supply-chain/purchasing" element={<PurchasingManagement />} />
      <Route path="supply-chain/transfers" element={<StockTransfers />} />
      <Route path="supply-chain/contracts" element={<ContractsManagement />} />
      <Route path="supply-chain/branches" element={<BranchWarehouseManagement />} />
    </>
  );
}

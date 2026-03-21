/**
 * Contract Management Routes — مسارات إدارة العقود
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ContractDashboard = lazyWithRetry(() => import('../pages/Contracts/ContractDashboard'));
const ContractsList = lazyWithRetry(() => import('../pages/Contracts/ContractsList'));

export default function ContractManagementRoutes() {
  return (
    <>
      <Route path="contracts" element={<ContractDashboard />} />
      <Route path="contracts/list" element={<ContractsList />} />
    </>
  );
}

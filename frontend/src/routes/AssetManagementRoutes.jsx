/**
 * Asset Management Routes — مسارات إدارة الأصول
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AssetDashboard = lazyWithRetry(() => import('../pages/Assets/AssetDashboard'));
const AssetsList = lazyWithRetry(() => import('../pages/Assets/AssetsList'));

export default function AssetManagementRoutes() {
  return (
    <>
      <Route path="assets" element={<AssetDashboard />} />
      <Route path="assets/list" element={<AssetsList />} />
    </>
  );
}

/**
 * Fleet Management Routes — مسارات إدارة الأسطول
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const FleetDashboard = lazyWithRetry(() => import('../pages/Fleet/FleetDashboard'));
const FleetManagement = lazyWithRetry(() => import('../pages/Fleet/FleetManagement'));
const VehicleManagement = lazyWithRetry(() => import('../pages/Fleet/VehicleManagement'));
const TransportManagement = lazyWithRetry(() => import('../pages/Fleet/TransportManagement'));

export default function FleetRoutes() {
  return (
    <>
      <Route path="fleet" element={<FleetDashboard />} />
      <Route path="fleet/management" element={<FleetManagement />} />
      <Route path="fleet/vehicles" element={<VehicleManagement />} />
      <Route path="fleet/transport" element={<TransportManagement />} />
    </>
  );
}

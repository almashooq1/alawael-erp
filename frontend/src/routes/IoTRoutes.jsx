/**
 * IoT Routes — مسارات إنترنت الأشياء
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const IoTDashboard = lazyWithRetry(() => import('../pages/iot/IoTDashboard'));

export default function IoTRoutes() {
  return (
    <>
      <Route path="iot" element={<IoTDashboard />} />
    </>
  );
}

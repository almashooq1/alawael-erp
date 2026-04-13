/**
 * GPS Tracking Routes — مسارات تتبع GPS
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const GPSTrackingDashboard = lazyWithRetry(() => import('../pages/gps-tracking/GPSTrackingDashboard'));

export default function GPSTrackingRoutes() {
  return (
    <>
      <Route path="gps-tracking" element={<GPSTrackingDashboard />} />
    </>
  );
}

/**
 * CCTVRoutes.jsx — مسارات مركز المراقبة
 * ═══════════════════════════════════════════
 */

import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CCTVDashboard = lazyWithRetry(() => import('../pages/cctv/CCTVDashboard'));

export default function CCTVRoutes() {
  return (
    <>
      <Route path="cctv-monitoring" element={<CCTVDashboard />} />
    </>
  );
}

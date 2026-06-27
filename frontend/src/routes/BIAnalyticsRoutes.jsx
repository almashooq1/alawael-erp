/**
 * BIAnalyticsRoutes.jsx — مسارات التحليلات المتقدمة وذكاء الأعمال
 * ═══════════════════════════════════════════════════════════════════
 * المسار: /bi-analytics
 */

import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BIAnalyticsDashboard = lazyWithRetry(() => import('../pages/bi/BIAnalyticsDashboard'));

export default function BIAnalyticsRoutes() {
  return (
    <>
      <Route path="bi-analytics" element={<BIAnalyticsDashboard />} />
    </>
  );
}

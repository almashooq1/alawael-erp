/**
 * Gamification Routes — مسارات نظام التحفيز والشارات
 */

import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const GamificationDashboard = lazyWithRetry(
  () => import('../pages/gamification/GamificationDashboard')
);

export default function GamificationRoutes() {
  return (
    <>
      <Route path="gamification" element={<GamificationDashboard />} />
      <Route path="gamification/:beneficiaryId" element={<GamificationDashboard />} />
    </>
  );
}

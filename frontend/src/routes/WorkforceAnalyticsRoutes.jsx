/**
 * Workforce Analytics Routes — مسارات تحليلات القوى العاملة
 * Phase 21 — Workforce Analytics & Planning
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const WorkforceAnalytics = lazyWithRetry(() =>
  import('../pages/workforce-analytics/WorkforceAnalytics'),
);

export default function WorkforceAnalyticsRoutes() {
  return (
    <>
      <Route path="/workforce-analytics" element={<WorkforceAnalytics />} />
    </>
  );
}

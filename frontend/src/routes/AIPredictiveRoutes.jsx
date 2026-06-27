/**
 * AI Predictive Routes — مسارات التحليلات التنبؤية بالذكاء الاصطناعي
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AIPredictiveDashboard = lazyWithRetry(
  () => import('../pages/ai-predictive/AIPredictiveDashboard')
);

export default function AIPredictiveRoutes() {
  return (
    <>
      <Route path="/ai-predictive" element={<AIPredictiveDashboard />} />
    </>
  );
}

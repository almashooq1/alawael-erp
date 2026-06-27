/**
 * Executive Dashboard Routes — مسارات لوحة القيادة التنفيذية
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ExecutiveDashboard = lazyWithRetry(() => import('../pages/executive/ExecutiveDashboard'));

export default function ExecutiveRoutes() {
  return (
    <>
      <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
    </>
  );
}

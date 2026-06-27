/**
 * Compliance Routes — مسارات الامتثال والاعتماد
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ComplianceDashboard = lazyWithRetry(
  () => import('../pages/compliance/ComplianceDashboard')
);

export default function ComplianceRoutes() {
  return (
    <>
      <Route path="/compliance" element={<ComplianceDashboard />} />
    </>
  );
}

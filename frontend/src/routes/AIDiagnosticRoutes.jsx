/**
 * AI Diagnostic Routes — مسارات الذكاء الاصطناعي للتشخيص
 * Phase 17 — Frontend
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const AIDiagnosticDashboard = lazyWithRetry(() => import('../pages/ai-diagnostic/AIDiagnosticDashboard'));
const BeneficiaryAnalysis = lazyWithRetry(() => import('../pages/ai-diagnostic/BeneficiaryAnalysis'));

export default function AIDiagnosticRoutes() {
  return (
    <>
      <Route path="/ai-diagnostic" element={<AIDiagnosticDashboard />} />
      <Route path="/ai-diagnostic/beneficiary/:id" element={<BeneficiaryAnalysis />} />
    </>
  );
}

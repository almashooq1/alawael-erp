/**
 * نقطة الدخول للموديول الذكي — Smart HR Module
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SmartDashboard from './SmartDashboard';
import OnboardingPage from './OnboardingPage';
import EmployeeAIInsights from './EmployeeAIInsights';
import AnalyticsPage from './AnalyticsPage';

const SmartHRModule = () => {
  return (
    <Routes>
      <Route index element={<SmartDashboard />} />
      <Route path="dashboard" element={<SmartDashboard />} />
      <Route path="onboarding" element={<OnboardingPage />} />
      <Route path="insights" element={<EmployeeAIInsights />} />
      <Route path="analytics" element={<AnalyticsPage />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default SmartHRModule;

/**
 * Learning & Development Routes — مسارات التدريب الإلكتروني
 * Phase 22 — Learning & Development (LMS)
 */

import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const LearningDevelopment = lazyWithRetry(() =>
  import('../pages/learning-development/LearningDevelopment'),
);

export default function LearningDevelopmentRoutes() {
  return (
    <>
      <Route path="/learning-development" element={<LearningDevelopment />} />
      <Route path="/lms" element={<LearningDevelopment />} />
    </>
  );
}

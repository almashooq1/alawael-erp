/**
 * Recruitment Routes — مسارات التوظيف
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const RecruitmentDashboard = lazyWithRetry(() => import('../pages/Recruitment/RecruitmentDashboard'));
const JobPostingsList = lazyWithRetry(() => import('../pages/Recruitment/JobPostingsList'));

export default function RecruitmentRoutes() {
  return (
    <>
      <Route path="recruitment" element={<RecruitmentDashboard />} />
      <Route path="recruitment/jobs" element={<JobPostingsList />} />
    </>
  );
}

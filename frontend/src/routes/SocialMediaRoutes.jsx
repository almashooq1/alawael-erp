/**
 * Social Media Routes — مسارات إدارة منصات التواصل الاجتماعي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const SocialMediaDashboard = lazyWithRetry(
  () => import('../pages/SocialMedia/SocialMediaDashboard')
);

export default function SocialMediaRoutes() {
  return (
    <>
      <Route path="social-media" element={<SocialMediaDashboard />} />
      <Route path="social-media/*" element={<SocialMediaDashboard />} />
    </>
  );
}

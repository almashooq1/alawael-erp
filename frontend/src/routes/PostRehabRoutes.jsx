/**
 * PostRehabRoutes — مسارات متابعة ما بعد التأهيل
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const PostRehabFollowupDashboard = lazyWithRetry(
  () => import('../pages/postRehab/PostRehabFollowupDashboard')
);

export default function PostRehabRoutes() {
  return (
    <>
      <Route path="post-rehab-followup" element={<PostRehabFollowupDashboard />} />
      <Route path="post-rehab-followup/*" element={<PostRehabFollowupDashboard />} />
    </>
  );
}

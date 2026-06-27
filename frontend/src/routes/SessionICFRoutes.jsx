/**
 * Session ICF Routes
 * مسارات تسجيل التقدم على أهداف ICF في الجلسات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const SessionICFProgress = lazyWithRetry(() => import('../pages/sessions/SessionICFProgress'));

export default function SessionICFRoutes() {
  return (
    <>
      <Route path="sessions/:sessionId/icf-progress" element={<SessionICFProgress />} />
    </>
  );
}

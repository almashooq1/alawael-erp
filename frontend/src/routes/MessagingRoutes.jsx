/**
 * Messaging Center Routes — مسارات مركز الرسائل
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MessagingDashboard = lazyWithRetry(() => import('../pages/Messaging/MessagingDashboard'));
const MessagingPage = lazyWithRetry(() => import('../pages/communications/MessagingPage'));
const CommunicationsSystem = lazyWithRetry(() => import('../pages/communications/CommunicationsSystem'));
const Communications = lazyWithRetry(() => import('../pages/communications/Communications'));

export default function MessagingRoutes() {
  return (
    <>
      <Route path="messaging" element={<MessagingDashboard />} />
      <Route path="messaging/inbox" element={<MessagingPage />} />
      <Route path="messaging/system" element={<CommunicationsSystem />} />
      <Route path="messaging/all" element={<Communications />} />
    </>
  );
}

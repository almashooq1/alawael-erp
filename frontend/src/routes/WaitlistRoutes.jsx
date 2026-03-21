/**
 * Waitlist Routes — مسارات قوائم الانتظار
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const WaitlistDashboard = lazyWithRetry(() => import('../pages/waitlist/WaitlistDashboard'));

export default function WaitlistRoutes() {
  return (
    <>
      <Route path="waitlist" element={<WaitlistDashboard />} />
    </>
  );
}

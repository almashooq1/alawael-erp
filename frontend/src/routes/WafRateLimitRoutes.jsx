/**
 * AL-AWAEL ERP — WAF & Rate Limit Routes
 * Phase 24 — مسارات WAF وتحديد المعدل
 */


import { lazyWithRetry } from '../utils/lazyLoader';

const WafRateLimit = lazyWithRetry(() =>
  import('../pages/waf-ratelimit/WafRateLimit')
);

const WafRateLimitRoutes = () => (
  <>
    <Route path="/waf-ratelimit" element={
      <React.Suspense fallback={<div>جارٍ التحميل...</div>}>
        <WafRateLimit />
      </React.Suspense>
    } />
  </>
);

export default WafRateLimitRoutes;

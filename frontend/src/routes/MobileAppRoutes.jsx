/**
 * MobileAppRoutes.jsx — مسارات تطبيق الجوال
 * Standalone mobile route (outside ProLayout)
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MobileApp = lazyWithRetry(() => import('../pages/mobile/MobileApp'));

export default function MobileAppRoutes() {
  return <MobileApp />;
}

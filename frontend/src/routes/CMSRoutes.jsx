/**
 * CMS Routes — مسارات إدارة المحتوى
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CMSDashboard = lazyWithRetry(() => import('../pages/cms/CMSDashboard'));

export default function CMSRoutes() {
  return (
    <>
      <Route path="cms" element={<CMSDashboard />} />
    </>
  );
}

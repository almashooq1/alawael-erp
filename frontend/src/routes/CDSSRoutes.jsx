/**
 * CDSS Routes — مسارات نظام دعم القرار السريري
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CDSSDashboard = lazyWithRetry(() => import('../pages/CDSS/CDSSDashboard'));

export default function CDSSRoutes() {
  return (
    <>
      <Route path="cdss" element={<CDSSDashboard />} />
      <Route path="cdss/*" element={<CDSSDashboard />} />
    </>
  );
}

/**
 * MHPSS Routes — مسارات الصحة النفسية والدعم النفسي الاجتماعي
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const MHPSSDashboard = lazyWithRetry(() => import('../pages/mhpss/MHPSSDashboard'));

export default function MHPSSRoutes() {
  return (
    <>
      <Route path="mhpss" element={<MHPSSDashboard />} />
    </>
  );
}

/**
 * Measures Library Routes — مسارات مكتبة المقاييس السريرية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const MeasuresLibraryPage = lazyWithRetry(
  () => import('../pages/measures-library/MeasuresLibraryPage')
);

export default function MeasuresLibraryRoutes() {
  return (
    <>
      {/* Standalone library browser */}
      <Route path="measures-library" element={<MeasuresLibraryPage />} />
      {/* Beneficiary-scoped: /beneficiaries/:id/measures */}
      <Route path="beneficiaries/:beneficiaryId/measures" element={<MeasuresLibraryPage />} />
    </>
  );
}

/**
 * NPHIES Routes — مسارات التأمين الصحي
 * المنصة الوطنية لتبادل المعلومات الصحية والتأمينية — HL7 FHIR R4
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const NphiesPage = lazyWithRetry(
  () => import('../pages/NPHIES/NphiesPage')
);

export default function NphiesRoutes() {
  return (
    <>
      {/* NPHIES — التأمين الصحي FHIR */}
      <Route path="nphies" element={<NphiesPage />} />
      <Route path="nphies/*" element={<NphiesPage />} />

      {/* مسارات بديلة */}
      <Route path="health-insurance" element={<NphiesPage />} />
      <Route path="insurance-claims" element={<NphiesPage />} />
      <Route path="fhir" element={<NphiesPage />} />
      <Route path="claims" element={<NphiesPage />} />
    </>
  );
}

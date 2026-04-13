/**
 * ZATCA Phase 2 Routes — مسارات الفوترة الإلكترونية
 * هيئة الزكاة والضريبة والجمارك — منصة فاتورة FATOORA
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ZatcaPhase2Page = lazyWithRetry(
  () => import('../pages/ZatcaPhase2/ZatcaPhase2Page')
);

export default function ZatcaPhase2Routes() {
  return (
    <>
      {/* ZATCA Phase 2 — الفوترة الإلكترونية */}
      <Route path="zatca-phase2" element={<ZatcaPhase2Page />} />
      <Route path="zatca-phase2/*" element={<ZatcaPhase2Page />} />

      {/* مسارات بديلة */}
      <Route path="zatca" element={<ZatcaPhase2Page />} />
      <Route path="e-invoicing" element={<ZatcaPhase2Page />} />
      <Route path="fatoora" element={<ZatcaPhase2Page />} />
      <Route path="electronic-invoicing" element={<ZatcaPhase2Page />} />
    </>
  );
}

/**
 * Beneficiary 360° Routes — مسارات الملف الشامل للمستفيد
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const Beneficiary360Page = lazyWithRetry(
  () => import('../pages/beneficiary-360/Beneficiary360Page')
);

export default function Beneficiary360Routes() {
  return (
    <>
      <Route path="beneficiary-360/:id" element={<Beneficiary360Page />} />
      <Route path="beneficiaries/:id/360" element={<Beneficiary360Page />} />
    </>
  );
}

/**
 * E-Signature Routes — مسارات التوقيع الإلكتروني
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ESignatureDashboard = lazyWithRetry(() => import('../pages/e-signature/ESignatureDashboard'));
const ESignature = lazyWithRetry(() => import('../pages/e-signature/ESignature'));
const ESignatureCreate = lazyWithRetry(() => import('../pages/e-signature/ESignatureCreate'));
const ESignatureTemplates = lazyWithRetry(() => import('../pages/e-signature/ESignatureTemplates'));
const ESignatureVerify = lazyWithRetry(() => import('../pages/e-signature/ESignatureVerify'));
const EStamp = lazyWithRetry(() => import('../pages/e-signature/EStamp'));
const EStampCreate = lazyWithRetry(() => import('../pages/e-signature/EStampCreate'));

export default function ESignatureRoutes() {
  return (
    <>
      <Route path="e-signature" element={<ESignatureDashboard />} />
      <Route path="e-signature/list" element={<ESignature />} />
      <Route path="e-signature/create" element={<ESignatureCreate />} />
      <Route path="e-signature/templates" element={<ESignatureTemplates />} />
      <Route path="e-signature/verify" element={<ESignatureVerify />} />
      <Route path="e-stamp" element={<EStamp />} />
      <Route path="e-stamp/create" element={<EStampCreate />} />
    </>
  );
}

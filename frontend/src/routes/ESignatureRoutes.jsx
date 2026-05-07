/**
 * E-Signature & E-Stamp Routes — مسارات التوقيع والختم الإلكتروني
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

/* ─── E-Signature Pages ──────────────────────────────────────────────────── */
const ESignatureDashboard = lazyWithRetry(() => import('../pages/e-signature/ESignatureDashboard'));
const ESignature = lazyWithRetry(() => import('../pages/e-signature/ESignature'));
const ESignatureCreate = lazyWithRetry(() => import('../pages/e-signature/ESignatureCreate'));
const ESignatureTemplates = lazyWithRetry(() => import('../pages/e-signature/ESignatureTemplates'));
const ESignatureVerify = lazyWithRetry(() => import('../pages/e-signature/ESignatureVerify'));
const ESignatureSigning = lazyWithRetry(() => import('../pages/e-signature/ESignatureSigning'));
// Nafath Signing Admin — إدارة توقيعات نفاذ (BC-10 Critical P1)
const NafathSigningAdmin = lazyWithRetry(() => import('../pages/e-signature/NafathSigningAdmin'));

/* ─── E-Stamp Pages ──────────────────────────────────────────────────────── */
const EStamp = lazyWithRetry(() => import('../pages/e-signature/EStamp'));
const EStampCreate = lazyWithRetry(() => import('../pages/e-signature/EStampCreate'));
const EStampEdit = lazyWithRetry(() => import('../pages/e-signature/EStampEdit'));
const EStampDetail = lazyWithRetry(() => import('../pages/e-signature/EStampDetail'));
const EStampApply = lazyWithRetry(() => import('../pages/e-signature/EStampApply'));
const EStampVerify = lazyWithRetry(() => import('../pages/e-signature/EStampVerify'));

export default function ESignatureRoutes() {
  return (
    <>
      {/* ── التوقيع الإلكتروني ─────────────────────────────────── */}
      <Route path="e-signature" element={<ESignatureDashboard />} />
      <Route path="e-signature/list" element={<ESignature />} />
      <Route path="e-signature/create" element={<ESignatureCreate />} />
      <Route path="e-signature/templates" element={<ESignatureTemplates />} />
      <Route path="e-signature/verify" element={<ESignatureVerify />} />
      <Route path="e-signature/verify/:id" element={<ESignatureVerify />} />
      <Route path="e-signature/sign/:id" element={<ESignatureSigning />} />
      <Route path="e-signature/nafath-signing" element={<NafathSigningAdmin />} />

      {/* ── الختم الإلكتروني ───────────────────────────────────── */}
      <Route path="e-stamp" element={<EStamp />} />
      <Route path="e-stamp/create" element={<EStampCreate />} />
      <Route path="e-stamp/edit/:id" element={<EStampEdit />} />
      <Route path="e-stamp/:id" element={<EStampDetail />} />
      <Route path="e-stamp/apply/:id" element={<EStampApply />} />
      <Route path="e-stamp/verify" element={<EStampVerify />} />
    </>
  );
}

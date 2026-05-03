/**
 * Blockchain Certificates Routes
 * مسارات شهادات البلوكتشين
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BlockchainDashboard = lazyWithRetry(() => import('../pages/blockchain/BlockchainDashboard'));
const TemplateBuilder = lazyWithRetry(() => import('../pages/blockchain/TemplateBuilder'));
const BatchIssue = lazyWithRetry(() => import('../pages/blockchain/BatchIssue'));
const VerificationLogs = lazyWithRetry(() => import('../pages/blockchain/VerificationLogs'));
const CertificateDetail = lazyWithRetry(() => import('../pages/blockchain/CertificateDetail'));

export default function BlockchainRoutes() {
  return (
    <>
      <Route path="blockchain-certificates" element={<BlockchainDashboard />} />
      <Route path="blockchain-certificates/templates" element={<TemplateBuilder />} />
      <Route path="blockchain-certificates/batch-issue" element={<BatchIssue />} />
      <Route path="blockchain-certificates/logs" element={<VerificationLogs />} />
      <Route path="blockchain/:id" element={<CertificateDetail />} />
    </>
  );
}

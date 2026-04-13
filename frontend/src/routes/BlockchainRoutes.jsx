/**
 * Blockchain Certificates Routes
 * مسارات شهادات البلوكتشين
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const BlockchainDashboard = lazyWithRetry(
  () => import('../pages/blockchain/BlockchainDashboard')
);

export default function BlockchainRoutes() {
  return (
    <>
      <Route path="blockchain-certificates" element={<BlockchainDashboard />} />
    </>
  );
}

/**
 * Knowledge Center Routes — مسارات مركز المعرفة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const KnowledgeDashboard = lazyWithRetry(() => import('../pages/knowledge/KnowledgeDashboard'));
const KnowledgeCenterPage = lazyWithRetry(() => import('../pages/knowledge/KnowledgeCenterPage'));

export default function KnowledgeCenterRoutes() {
  return (
    <>
      <Route path="knowledge-center" element={<KnowledgeDashboard />} />
      <Route path="knowledge-center/browse" element={<KnowledgeCenterPage />} />
    </>
  );
}

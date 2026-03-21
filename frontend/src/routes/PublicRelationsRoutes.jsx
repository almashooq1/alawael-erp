/**
 * Public Relations Routes — مسارات العلاقات العامة والإعلام
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const PRDashboard = lazyWithRetry(() => import('../pages/PublicRelations/PRDashboard'));
const CampaignsList = lazyWithRetry(() => import('../pages/PublicRelations/CampaignsList'));

export default function PublicRelationsRoutes() {
  return (
    <>
      <Route path="public-relations" element={<PRDashboard />} />
      <Route path="public-relations/campaigns" element={<CampaignsList />} />
    </>
  );
}

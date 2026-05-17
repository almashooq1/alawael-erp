/**
 * Episodes of Care Routes — مسارات حلقات الرعاية
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const EpisodesPage = lazyWithRetry(() => import('../pages/episodes/EpisodesPage'));
const EpisodeCenterPage = lazyWithRetry(() => import('../pages/episodes/EpisodeCenterPage'));

export default function EpisodesRoutes() {
  return (
    <>
      <Route path="episodes" element={<EpisodesPage />} />
      <Route path="rehab/episodes" element={<EpisodesPage />} />
      <Route path="episode-center" element={<EpisodeCenterPage />} />
      <Route path="episode-center/:id" element={<EpisodeCenterPage />} />
    </>
  );
}

/**
 * TeleRehabRoutes — مسارات التأهيل عن بُعد
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const TeleRehabPage = lazyWithRetry(() => import('../pages/tele-rehab/TeleRehabPage'));

export default function TeleRehabRoutes() {
  return (
    <>
      <Route path="tele-rehab" element={<TeleRehabPage />} />
    </>
  );
}

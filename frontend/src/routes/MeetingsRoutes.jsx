/**
 * Meetings Routes — مسارات إدارة الاجتماعات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const MeetingsDashboard = lazyWithRetry(() => import('../pages/Meetings/MeetingsDashboard'));
const MeetingManagementPage = lazyWithRetry(() => import('../pages/meetings/MeetingManagementPage'));

export default function MeetingsRoutes() {
  return (
    <>
      <Route path="meetings-management" element={<MeetingsDashboard />} />
      <Route path="meetings-management/list" element={<MeetingManagementPage />} />
    </>
  );
}

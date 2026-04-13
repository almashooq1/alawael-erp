/**
 * Help Desk Routes — مسارات مكتب المساعدة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const HelpDeskDashboard = lazyWithRetry(() => import('../pages/HelpDesk/HelpDeskDashboard'));
const TicketsList = lazyWithRetry(() => import('../pages/HelpDesk/TicketsList'));

export default function HelpDeskRoutes() {
  return (
    <>
      <Route path="helpdesk" element={<HelpDeskDashboard />} />
      <Route path="helpdesk/tickets" element={<TicketsList />} />
    </>
  );
}

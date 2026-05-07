/**
 * Complaints Routes — مسارات الشكاوى والمقترحات
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ComplaintsDashboard = lazyWithRetry(() => import('../pages/complaints/ComplaintsDashboard'));
const ComplaintsManagementPage = lazyWithRetry(
  () => import('../pages/complaints/ComplaintsManagementPage')
);
// BC-09: SLA config admin
const ComplaintSlaAdmin = lazyWithRetry(() => import('../pages/complaints/ComplaintSlaAdmin'));

export default function ComplaintsRoutes() {
  return (
    <>
      <Route path="complaints" element={<ComplaintsDashboard />} />
      <Route path="complaints/management" element={<ComplaintsManagementPage />} />
      {/* BC-09: SLA إدارة إعدادات خدمة SLA (ISO 10002 §6.2) */}
      <Route path="complaints/sla-admin" element={<ComplaintSlaAdmin />} />
    </>
  );
}

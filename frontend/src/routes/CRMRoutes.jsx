/**
 * CRM Routes — مسارات إدارة علاقات العملاء
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const CRMDashboard = lazyWithRetry(() => import('../pages/crm/CRMDashboard'));
const ContactsManagement = lazyWithRetry(() => import('../pages/crm/ContactsManagement'));
const LeadsManagement = lazyWithRetry(() => import('../pages/crm/LeadsManagement'));
const CRMReports = lazyWithRetry(() => import('../pages/crm/CRMReports'));

export default function CRMRoutes() {
  return (
    <>
      <Route path="crm" element={<CRMDashboard />} />
      <Route path="crm/contacts" element={<ContactsManagement />} />
      <Route path="crm/leads" element={<LeadsManagement />} />
      <Route path="crm/reports" element={<CRMReports />} />
    </>
  );
}

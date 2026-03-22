/**
 * Beneficiary Portal Routes — مسارات بوابة المستفيدين
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BeneficiariesDashboard = lazyWithRetry(() => import('../pages/Beneficiaries/BeneficiariesDashboard'));
const BeneficiariesManagementPage = lazyWithRetry(() => import('../pages/Beneficiaries/BeneficiariesManagementPage'));

export default function BeneficiaryRoutes() {
  return (
    <>
      <Route path="beneficiary-portal" element={<BeneficiariesDashboard />} />
      <Route path="beneficiary-portal/management" element={<BeneficiariesManagementPage />} />
    </>
  );
}

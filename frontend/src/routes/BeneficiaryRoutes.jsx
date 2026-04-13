/**
 * Beneficiary Portal Routes — مسارات بوابة المستفيدين
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const BeneficiariesDashboard = lazyWithRetry(() => import('../pages/Beneficiaries/BeneficiariesDashboard'));
const BeneficiariesManagementPage = lazyWithRetry(() => import('../pages/Beneficiaries/BeneficiariesManagementPage'));
const BeneficiaryProfilePage = lazyWithRetry(() => import('../pages/Beneficiaries/BeneficiaryProfilePage'));

export default function BeneficiaryRoutes() {
  return (
    <>
      <Route path="beneficiary-portal" element={<BeneficiariesDashboard />} />
      <Route path="beneficiary-portal/management" element={<BeneficiariesManagementPage />} />
      <Route path="beneficiary-portal/:id" element={<BeneficiaryProfilePage />} />
    </>
  );
}

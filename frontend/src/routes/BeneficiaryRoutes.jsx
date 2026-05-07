/**
 * Beneficiary Portal Routes — مسارات بوابة المستفيدين
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BeneficiariesDashboard = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiariesDashboard')
);
const BeneficiariesManagementPage = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiariesManagementPage')
);
const BeneficiaryProfilePage = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiaryProfilePage')
);
const BeneficiaryConsentAdmin = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiaryConsentAdmin')
);
const BeneficiaryTransferAdmin = lazyWithRetry(
  () => import('../pages/Beneficiaries/BeneficiaryTransferAdmin')
);

export default function BeneficiaryRoutes() {
  return (
    <>
      <Route path="beneficiary-portal" element={<BeneficiariesDashboard />} />
      <Route path="beneficiary-portal/management" element={<BeneficiariesManagementPage />} />
      <Route path="beneficiary-portal/consent-management" element={<BeneficiaryConsentAdmin />} />
      <Route path="beneficiary-portal/transfers" element={<BeneficiaryTransferAdmin />} />
      <Route path="beneficiary-portal/:id" element={<BeneficiaryProfilePage />} />
    </>
  );
}

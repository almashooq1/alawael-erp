/**
 * Medical Files Routes — مسارات السجلات الطبية
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MedicalFilesDashboard = lazyWithRetry(() => import('../pages/medical-files/MedicalFilesDashboard'));

export default function MedicalFilesRoutes() {
  return (
    <>
      <Route path="medical-files" element={<MedicalFilesDashboard />} />
    </>
  );
}

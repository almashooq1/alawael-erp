/**
 * Muqeem Routes — مسارات مقيم (إدارة الإقامات)
 * وزارة الداخلية — إقامات الموظفين الأجانب
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MuqeemPage = lazyWithRetry(
  () => import('../pages/muqeem/MuqeemPage')
);

export default function MuqeemRoutes() {
  return (
    <>
      {/* إدارة إقامات الموظفين الأجانب */}
      <Route path="muqeem" element={<MuqeemPage />} />
      <Route path="muqeem/*" element={<MuqeemPage />} />

      {/* مسارات بديلة */}
      <Route path="iqama" element={<MuqeemPage />} />
      <Route path="residence-management" element={<MuqeemPage />} />
      <Route path="foreign-workers" element={<MuqeemPage />} />
    </>
  );
}

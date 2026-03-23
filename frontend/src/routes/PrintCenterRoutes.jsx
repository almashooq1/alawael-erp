/**
 * Print Center Routes — مسارات مركز الطباعة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const PrintCenterPage = lazyWithRetry(() =>
  import('../pages/PrintCenter/PrintCenterPage')
);

export default function PrintCenterRoutes() {
  return (
    <>
      <Route path="print-center" element={<PrintCenterPage />} />
      <Route path="print-center/:module" element={<PrintCenterPage />} />
    </>
  );
}

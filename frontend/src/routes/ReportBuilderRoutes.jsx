import { lazyWithRetry } from '../utils/lazyLoader';

const ReportBuilderDashboard = lazyWithRetry(
  () => import('../pages/report-builder/ReportBuilderDashboard'),
);
const ReportViewer = lazyWithRetry(
  () => import('../pages/report-builder/ReportViewer'),
);

export default function ReportBuilderRoutes() {
  return (
    <>
      <Route path="/report-builder" element={<ReportBuilderDashboard />} />
      <Route path="/report-builder/view/:id" element={<ReportViewer />} />
    </>
  );
}

/**
 * Montessori Routes — مسارات منتسوري
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const MontessoriDashboard = lazyWithRetry(() => import('../pages/Montessori/MontessoriDashboard'));
const MontessoriPrograms = lazyWithRetry(() => import('../pages/Montessori/MontessoriPrograms'));
const MontessoriSessions = lazyWithRetry(() => import('../pages/Montessori/MontessoriSessions'));
const MontessoriStudents = lazyWithRetry(() => import('../pages/Montessori/MontessoriStudents'));
const MontessoriTeam = lazyWithRetry(() => import('../pages/Montessori/MontessoriTeam'));

export default function MontessoriRoutes() {
  return (
    <>
      <Route path="montessori" element={<MontessoriDashboard />} />
      <Route path="montessori/programs" element={<MontessoriPrograms />} />
      <Route path="montessori/sessions" element={<MontessoriSessions />} />
      <Route path="montessori/students" element={<MontessoriStudents />} />
      <Route path="montessori/team" element={<MontessoriTeam />} />
    </>
  );
}

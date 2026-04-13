/**
 * Project Management Routes — مسارات إدارة المشاريع
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const ProjectDashboard = lazyWithRetry(() => import('../pages/Projects/ProjectDashboard'));
const ProjectsList = lazyWithRetry(() => import('../pages/Projects/ProjectsList'));

export default function ProjectManagementRoutes() {
  return (
    <>
      <Route path="projects" element={<ProjectDashboard />} />
      <Route path="projects/list" element={<ProjectsList />} />
    </>
  );
}

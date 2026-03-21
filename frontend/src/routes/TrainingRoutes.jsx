/**
 * Training & Development Routes — مسارات التدريب والتطوير
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const TrainingDashboard = lazyWithRetry(() => import('../pages/Training/TrainingDashboard'));
const CoursesList = lazyWithRetry(() => import('../pages/Training/CoursesList'));
const TrainingPlans = lazyWithRetry(() => import('../pages/Training/TrainingPlans'));

export default function TrainingRoutes() {
  return (
    <>
      <Route path="training" element={<TrainingDashboard />} />
      <Route path="training/courses" element={<CoursesList />} />
      <Route path="training/plans" element={<TrainingPlans />} />
    </>
  );
}

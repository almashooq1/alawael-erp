/**
 * EquipmentLifecycleRoutes — مسارات دورة حياة المعدات والأجهزة
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const EquipmentLifecyclePage = lazyWithRetry(
  () => import('../pages/equipment-lifecycle/EquipmentLifecyclePage')
);

export default function EquipmentLifecycleRoutes() {
  return (
    <>
      <Route path="equipment-lifecycle" element={<EquipmentLifecyclePage />} />
    </>
  );
}

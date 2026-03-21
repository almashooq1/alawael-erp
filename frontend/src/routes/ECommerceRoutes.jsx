/**
 * E-Commerce Routes — مسارات المتجر الإلكتروني
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ECommerceDashboard = lazyWithRetry(() => import('../pages/ecommerce/ECommerceDashboard'));

export default function ECommerceRoutes() {
  return (
    <>
      <Route path="ecommerce" element={<ECommerceDashboard />} />
    </>
  );
}

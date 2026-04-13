import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const BusTrackingDashboard = lazyWithRetry(
  () => import('../pages/bus-tracking/BusTrackingDashboard'),
);
const ParentBusTracker = lazyWithRetry(
  () => import('../pages/bus-tracking/ParentBusTracker'),
);

export default function BusTrackingRoutes() {
  return (
    <>
      <Route path="/bus-tracking" element={<BusTrackingDashboard />} />
      <Route path="/bus-tracking/parent" element={<ParentBusTracker />} />
    </>
  );
}

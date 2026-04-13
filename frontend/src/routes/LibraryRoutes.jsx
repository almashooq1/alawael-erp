import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const LibraryDashboard = lazyWithRetry(
  () => import('../pages/library/LibraryDashboard'),
);
const LibraryDetail = lazyWithRetry(
  () => import('../pages/library/LibraryDetail'),
);

export default function LibraryRoutes() {
  return (
    <>
      <Route path="/library" element={<LibraryDashboard />} />
      <Route path="/library/resource/:id" element={<LibraryDetail />} />
    </>
  );
}

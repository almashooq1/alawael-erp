/**
 * TelehealthRoutes — مسارات الطب عن بُعد في الواجهة
 */
import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const TelehealthDashboard = lazyWithRetry(() => import('../pages/telehealth/TelehealthDashboard'));
const TelehealthSessionsPage = lazyWithRetry(() => import('../pages/telehealth/TelehealthSessionsPage'));
const TelehealthVideoRoom = lazyWithRetry(() => import('../pages/telehealth/TelehealthVideoRoom'));
const TelehealthRecordingsPage = lazyWithRetry(() => import('../pages/telehealth/TelehealthRecordingsPage'));
const TelehealthWaitingRoom = lazyWithRetry(() => import('../pages/telehealth/TelehealthWaitingRoom'));

export default function TelehealthRoutes() {
  return (
    <>
      <Route path="/telehealth" element={<TelehealthDashboard />} />
      <Route path="/telehealth/sessions" element={<TelehealthSessionsPage />} />
      <Route path="/telehealth/video-room" element={<TelehealthVideoRoom />} />
      <Route path="/telehealth/video-room/:sessionId" element={<TelehealthVideoRoom />} />
      <Route path="/telehealth/recordings" element={<TelehealthRecordingsPage />} />
      <Route path="/telehealth/waiting-room" element={<TelehealthWaitingRoom />} />
    </>
  );
}

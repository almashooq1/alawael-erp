/**
 * EMRRoutes.jsx — مسارات السجل الطبي الإلكتروني
 */
import React from 'react';
import { Route } from 'react-router-dom';
import SafeRouteWrapper from '../components/SafeRouteWrapper';
import { lazyWithRetry } from '../utils/lazyLoader';

const ElectronicMedicalRecord = lazyWithRetry(() => import('../pages/emr/ElectronicMedicalRecord'));

export default function EMRRoutes() {
  return (
    <Route path="emr/*" element={<SafeRouteWrapper><ElectronicMedicalRecord /></SafeRouteWrapper>}>
      <Route path=":beneficiaryId" element={<SafeRouteWrapper><ElectronicMedicalRecord /></SafeRouteWrapper>} />
    </Route>
  );
}

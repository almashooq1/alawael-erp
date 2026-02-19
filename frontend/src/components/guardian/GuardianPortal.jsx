/**
 * GuardianPortal Component
 * البوابة الرئيسية لولي الأمر
 * تحتوي على جميع مكونات بوابة ولي الأمر والملاحة المتقدمة
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress } from '@material-ui/core';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import GuardianDashboard from './GuardianDashboard';
import BeneficiaryManagement from './BeneficiaryManagement';
import ProgressMonitoring from './ProgressMonitoring';
import FinancialManagement from './FinancialManagement';
import PaymentProcessor from './PaymentProcessor';
import ReportViewer from './ReportViewer';
import AnalyticsDashboard from './AnalyticsDashboard';
import MessageCenter from './MessageCenter';
import NotificationHub from './NotificationHub';
import guardianService from '../../services/guardian.service';
import './GuardianPortal.css';

const GuardianPortal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, portal } = useSelector(state => state.auth);
  const { loading } = useSelector(state => state.guardian);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // التحقق من الصلاحيات
    if (!isAuthenticated || portal !== 'guardian') {
      navigate('/login');
      return;
    }

    // تحميل البيانات الأساسية
    loadInitialData();
  }, [isAuthenticated, portal, navigate]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // تحميل لوحة التحكم الشاملة
      const dashboardData = await guardianService.getDashboard();
      dispatch({
        type: 'FETCH_GUARDIAN_DASHBOARD_SUCCESS',
        payload: dashboardData,
      });

      // تحميل البيانات المالية
      const [profile, beneficiaries, financial] = await Promise.all([
        guardianService.getProfile(),
        guardianService.getBeneficiaries(),
        guardianService.getFinancialSummary(),
      ]);

      dispatch({
        type: 'FETCH_GUARDIAN_PROFILE_SUCCESS',
        payload: profile,
      });

      dispatch({
        type: 'FETCH_BENEFICIARIES_SUCCESS',
        payload: beneficiaries,
      });

      dispatch({
        type: 'FETCH_FINANCIAL_SUMMARY_SUCCESS',
        payload: financial,
      });

      // تحميل الإخطارات
      const notifications = await guardianService.getNotifications();
      dispatch({
        type: 'FETCH_GUARDIAN_NOTIFICATIONS_SUCCESS',
        payload: notifications,
      });
    } catch (err) {
      console.error('Error loading guardian data:', err);
      dispatch({
        type: 'SET_GUARDIAN_ERROR',
        payload: t('errors.loadingData'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box className="loading-container">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="guardian-portal">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showMenu={true}
      />

      <Box className="portal-container">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          portal="guardian"
        />

        <main className="portal-content">
          <Routes>
            <Route path="/" element={<GuardianDashboard />} />
            <Route path="/dashboard" element={<GuardianDashboard />} />
            <Route path="/beneficiaries" element={<BeneficiaryManagement />} />
            <Route path="/monitoring/progress" element={<ProgressMonitoring />} />
            <Route path="/monitoring/*" element={<ProgressMonitoring />} />
            <Route path="/financial/*" element={<FinancialManagement />} />
            <Route path="/payments" element={<PaymentProcessor />} />
            <Route path="/reports" element={<ReportViewer />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/messages" element={<MessageCenter />} />
            <Route path="/notifications" element={<NotificationHub />} />
          </Routes>
        </main>
      </Box>
    </div>
  );
};

export default GuardianPortal;

/**
 * BeneficiaryPortal Component
 * البوابة الرئيسية للمتعلم
 * تحتوي على جميع مكونات بوابة المتعلم والملاحة
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress } from '@material-ui/core';
import Header from '../common/Header';
import Sidebar from '../common/Sidebar';
import BeneficiaryDashboard from './BeneficiaryDashboard';
import ProgressTracker from './ProgressTracker';
import GradesViewer from './GradesViewer';
import AttendanceTracker from './AttendanceTracker';
import ProgramsList from './ProgramsList';
import MessageCenter from './MessageCenter';
import DocumentManager from './DocumentManager';
import NotificationPanel from './NotificationPanel';
import ProfileEditor from './ProfileEditor';
import SettingsPanel from './SettingsPanel';
import beneficiaryService from '../../services/beneficiary.service';
import './BeneficiaryPortal.css';

const BeneficiaryPortal = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, portal } = useSelector(state => state.auth);
  const { loading, error } = useSelector(state => state.beneficiary);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // التحقق من الصلاحيات
    if (!isAuthenticated || portal !== 'beneficiary') {
      navigate('/login');
      return;
    }

    // تحميل البيانات الأساسية
    loadInitialData();
  }, [isAuthenticated, portal, navigate]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);

      // تحميل لوحة التحكم
      const dashboardData = await beneficiaryService.getDashboard();
      dispatch({
        type: 'FETCH_DASHBOARD_SUCCESS',
        payload: dashboardData,
      });

      // تحميل الملف الشخصي
      const profileData = await beneficiaryService.getProfile();
      dispatch({
        type: 'FETCH_PROFILE_SUCCESS',
        payload: profileData,
      });

      // تحميل الإخطارات
      const notificationsData = await beneficiaryService.getNotifications();
      dispatch({
        type: 'FETCH_NOTIFICATIONS_SUCCESS',
        payload: notificationsData,
      });
    } catch (err) {
      console.error('Error loading beneficiary data:', err);
      dispatch({
        type: 'SET_ERROR',
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
    <div className="beneficiary-portal">
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showMenu={true}
      />

      <Box className="portal-container">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          portal="beneficiary"
        />

        <main className="portal-content">
          <Routes>
            <Route path="/" element={<BeneficiaryDashboard />} />
            <Route path="/dashboard" element={<BeneficiaryDashboard />} />
            <Route path="/progress" element={<ProgressTracker />} />
            <Route path="/grades" element={<GradesViewer />} />
            <Route path="/attendance" element={<AttendanceTracker />} />
            <Route path="/programs" element={<ProgramsList />} />
            <Route path="/messages" element={<MessageCenter />} />
            <Route path="/documents" element={<DocumentManager />} />
            <Route path="/notifications" element={<NotificationPanel />} />
            <Route path="/profile" element={<ProfileEditor />} />
            <Route path="/settings" element={<SettingsPanel />} />
          </Routes>
        </main>
      </Box>

      {/* Error Display */}
      {error && (
        <Box className="error-banner">
          {error}
        </Box>
      )}
    </div>
  );
};

export default BeneficiaryPortal;

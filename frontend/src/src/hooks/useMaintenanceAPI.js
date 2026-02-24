/**
 * =====================================================
 * useMaintenanceAPI - Hook لإدارة حالة الصيانة
 * =====================================================
 * 
 * Hook شامل يدير جميع عمليات الصيانة والـ state
 */

import { useState, useCallback, useEffect } from 'react';
import {
  scheduleService,
  taskService,
  predictionService,
  analyticsService,
  inventoryService,
  issueService,
  providerService,
} from '../services/maintenanceService';

export const useMaintenanceAPI = () => {
  // STATE MANAGEMENT
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [issues, setIssues] = useState([]);
  const [providers, setProviders] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // LOADING & ERROR STATES
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // UTILITY FUNCTIONS
  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  const handleError = useCallback((err, message) => {
    console.error(message, err);
    setError(message || err.message || 'حدث خطأ ما');
    setLoading(false);
  }, []);

  const handleSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setError(null);
    setTimeout(() => clearSuccess(), 3000);
  }, [clearSuccess]);

  // SCHEDULES
  const loadSchedules = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await scheduleService.getAllSchedules(filters);
      setSchedules(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل الجداول');
    }
  }, [handleError]);

  const createSchedule = useCallback(async (scheduleData) => {
    setLoading(true);
    try {
      const newSchedule = await scheduleService.createSchedule(scheduleData);
      setSchedules((prev) => [...prev, newSchedule]);
      handleSuccess('تم إنشاء الجدول بنجاح');
      return newSchedule;
    } catch (err) {
      handleError(err, 'خطأ في إنشاء الجدول');
    }
  }, [handleError, handleSuccess]);

  const updateSchedule = useCallback(async (scheduleId, scheduleData) => {
    setLoading(true);
    try {
      const updated = await scheduleService.updateSchedule(scheduleId, scheduleData);
      setSchedules((prev) =>
        prev.map((s) => (s._id === scheduleId ? updated : s))
      );
      handleSuccess('تم تحديث الجدول بنجاح');
      return updated;
    } catch (err) {
      handleError(err, 'خطأ في تحديث الجدول');
    }
  }, [handleError, handleSuccess]);

  const deleteSchedule = useCallback(async (scheduleId) => {
    setLoading(true);
    try {
      await scheduleService.deleteSchedule(scheduleId);
      setSchedules((prev) => prev.filter((s) => s._id !== scheduleId));
      handleSuccess('تم حذف الجدول بنجاح');
    } catch (err) {
      handleError(err, 'خطأ في حذف الجدول');
    }
  }, [handleError, handleSuccess]);

  // TASKS
  const loadTasks = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await taskService.getAllTasks(filters);
      setTasks(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل المهام');
    }
  }, [handleError]);

  const createTask = useCallback(async (taskData) => {
    setLoading(true);
    try {
      const newTask = await taskService.createTask(taskData);
      setTasks((prev) => [...prev, newTask]);
      handleSuccess('تم إنشاء المهمة بنجاح');
      return newTask;
    } catch (err) {
      handleError(err, 'خطأ في إنشاء المهمة');
    }
  }, [handleError, handleSuccess]);

  const updateTaskStatus = useCallback(async (taskId, status) => {
    setLoading(true);
    try {
      const updated = await taskService.updateTaskStatus(taskId, status);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? updated : t))
      );
      handleSuccess('تم تحديث حالة المهمة بنجاح');
      return updated;
    } catch (err) {
      handleError(err, 'خطأ في تحديث حالة المهمة');
    }
  }, [handleError, handleSuccess]);

  // PREDICTIONS & ALERTS
  const loadPredictions = useCallback(async (vehicleId) => {
    setLoading(true);
    try {
      const data = await predictionService.getPredictions(vehicleId);
      setPredictions(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل التنبؤات');
    }
  }, [handleError]);

  const loadAlerts = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await predictionService.getAlerts(filters);
      setAlerts(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل التنبيهات');
    }
  }, [handleError]);

  const loadRecommendations = useCallback(async (vehicleId) => {
    setLoading(true);
    try {
      const data = await predictionService.getRecommendations(vehicleId);
      setRecommendations(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل التوصيات');
    }
  }, [handleError]);

  // ANALYTICS
  const loadAnalytics = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await analyticsService.getComprehensiveReport(filters);
      setAnalytics(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل التحليلات');
    }
  }, [handleError]);

  const exportReport = useCallback(async (reportType, format = 'pdf') => {
    setLoading(true);
    try {
      const data = await analyticsService.exportReport(reportType, format);
      handleSuccess(`تم تصدير التقرير بصيغة ${format}`);
      return data;
    } catch (err) {
      handleError(err, 'خطأ في تصدير التقرير');
    }
  }, [handleError, handleSuccess]);

  // INVENTORY
  const loadInventory = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await inventoryService.getInventory(filters);
      setInventory(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل المخزون');
    }
  }, [handleError]);

  const orderPart = useCallback(async (partId, supplierId, quantity) => {
    setLoading(true);
    try {
      const result = await inventoryService.orderPart(partId, supplierId, quantity);
      handleSuccess('تم طلب الجزء بنجاح');
      return result;
    } catch (err) {
      handleError(err, 'خطأ في طلب الجزء');
    }
  }, [handleError, handleSuccess]);

  // ISSUES
  const reportIssue = useCallback(async (issueData) => {
    setLoading(true);
    try {
      const newIssue = await issueService.reportIssue(issueData);
      setIssues((prev) => [...prev, newIssue]);
      handleSuccess('تم تقرير المشكلة بنجاح');
      return newIssue;
    } catch (err) {
      handleError(err, 'خطأ في تقرير المشكلة');
    }
  }, [handleError, handleSuccess]);

  const loadIssues = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const data = await issueService.getIssues(filters);
      setIssues(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل المشاكل');
    }
  }, [handleError]);

  // PROVIDERS
  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await providerService.getProviders();
      setProviders(data);
      setLoading(false);
    } catch (err) {
      handleError(err, 'خطأ في تحميل الموردين');
    }
  }, [handleError]);

  return {
    // STATE
    schedules,
    tasks,
    predictions,
    alerts,
    recommendations,
    inventory,
    issues,
    providers,
    analytics,
    loading,
    error,
    successMessage,

    // ACTIONS
    clearError,
    clearSuccess,

    // SCHEDULES
    loadSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,

    // TASKS
    loadTasks,
    createTask,
    updateTaskStatus,

    // PREDICTIONS
    loadPredictions,
    loadAlerts,
    loadRecommendations,

    // ANALYTICS
    loadAnalytics,
    exportReport,

    // INVENTORY
    loadInventory,
    orderPart,

    // ISSUES
    reportIssue,
    loadIssues,

    // PROVIDERS
    loadProviders,
  };
};

export default useMaintenanceAPI;

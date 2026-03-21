/**
 * useStudentReport — Custom hook for Student Reports data management
 *
 * Handles: state, data loading, caching, filters, formatters, export, summary cards.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { triggerBlobDownload } from 'utils/downloadHelper';

import studentPortalService from 'services/studentPortalService';
import apiClient from 'services/api.client';
import { formatNumber } from 'utils/formatters';
import logger from 'utils/logger';
import {
  getStudentReportsFilters,
  setStudentReportsFilters,
  getStudentReportsReport,
  setStudentReportsReport,
  clearStudentReports,
} from 'utils/storageService';
import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from 'contexts/SnackbarContext';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PsychologyIcon from '@mui/icons-material/Psychology';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export const DEFAULT_FILTERS = {
  dateFrom: '2025-09-01',
  dateTo: '2026-01-31',
  reportType: 'comprehensive',
  focusArea: 'all',
};

export default function useStudentReport() {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [hasCachedData, setHasCachedData] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const requestIdRef = useRef(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const isDateRangeInvalid =
    Boolean(filters.dateFrom) && Boolean(filters.dateTo) && filters.dateFrom > filters.dateTo;
  const isDefaultFilters = Object.entries(DEFAULT_FILTERS).every(
    ([key, value]) => filters[key] === value
  );

  // ─── Data Loading ──────────────────────────────
  const loadReport = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      if (isDateRangeInvalid) {
        setLoadError('نطاق التاريخ غير صالح. تأكد أن تاريخ البداية يسبق تاريخ النهاية.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadError('');
      setExportError('');
      const data = await studentPortalService.getStudentAdvancedReport(userId, filters);
      if (requestId !== requestIdRef.current) return;
      setReportData(data);
      setLastLoadedAt(new Date().toISOString());
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      logger.error('Error loading student report:', error);
      showSnackbar('تعذر تحميل التقرير', 'error');
      const errorMessage =
        error instanceof Error && 'An internal error occurred'
          ? `تعذر تحميل التقرير. ${'حدث خطأ، يرجى المحاولة لاحقاً'}`
          : 'تعذر تحميل التقرير. الرجاء المحاولة لاحقًا.';
      setLoadError(errorMessage);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, isDateRangeInvalid, userId, showSnackbar]);

  // ─── Effects ───────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => loadReport(), 350);
    return () => clearTimeout(timer);
  }, [loadReport]);

  useEffect(() => {
    try {
      const savedFilters = getStudentReportsFilters();
      const savedReport = getStudentReportsReport();
      if (savedFilters) {
        setFilters(prev => ({ ...prev, ...savedFilters }));
        setHasCachedData(true);
      }
      if (savedReport) {
        setReportData(savedReport);
        setLoading(false);
        setHasCachedData(true);
        if (savedReport?.generatedAt) setLastLoadedAt(savedReport.generatedAt);
      }
    } catch (error) {
      logger.warn('Failed to restore cached report data:', error);
    }
  }, []);

  useEffect(() => {
    try {
      setStudentReportsFilters(filters);
      setHasCachedData(true);
    } catch (error) {
      logger.warn('Failed to persist report filters:', error);
    }
  }, [filters]);

  useEffect(() => {
    if (!reportData) return;
    try {
      setStudentReportsReport(reportData);
      setHasCachedData(true);
      if (reportData?.generatedAt) setLastLoadedAt(reportData.generatedAt);
    } catch (error) {
      logger.warn('Failed to persist report data:', error);
    }
  }, [reportData]);

  useEffect(() => {
    if (!isDateRangeInvalid) setLoadError('');
  }, [filters, isDateRangeInvalid]);

  useEffect(() => {
    setExportError('');
  }, [exportFormat]);

  // ─── Handlers ──────────────────────────────────
  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setLoadError('');
  };

  const handleClearCache = () => {
    try {
      clearStudentReports();
    } catch (error) {
      logger.warn('Failed to clear cached report data:', error);
    }
    setReportData(null);
    setLoadError('');
    setExportError('');
    setFilters(DEFAULT_FILTERS);
    setHasCachedData(false);
  };

  // ─── Formatters ────────────────────────────────
  const numberFormatter = useMemo(() => new Intl.NumberFormat('ar-EG'), []);
  const formatPercent = useCallback(
    value =>
      typeof value === 'number' && Number.isFinite(value)
        ? `${numberFormatter.format(value)}%`
        : '—',
    [numberFormatter]
  );
  const formatScore = useCallback(
    value =>
      typeof value === 'number' && Number.isFinite(value)
        ? `${numberFormatter.format(value)}/100`
        : '—',
    [numberFormatter]
  );
  const formatDeltaValue = value =>
    typeof value === 'number' && Number.isFinite(value) ? numberFormatter.format(value) : value;

  // ─── Summary Cards ─────────────────────────────
  const summaryCards = useMemo(() => {
    if (!reportData) return [];
    const summary = reportData?.summary || {};
    return [
      {
        title: 'المعدل التراكمي المتوقع',
        value: formatNumber(summary.predictedGpa),
        icon: <TrendingUpIcon />,
        color: gradients.ocean,
      },
      {
        title: 'نسبة الحضور',
        value: formatPercent(summary.attendanceRate),
        icon: <AssessmentIcon />,
        color: gradients.primary,
      },
      {
        title: 'مؤشر السلوك',
        value: formatScore(summary.behaviorScore),
        icon: <PsychologyIcon />,
        color: gradients.warning,
      },
      {
        title: 'مستوى المخاطر',
        value: summary.riskLevelLabel ?? '—',
        icon: summary.riskLevel === 'low' ? <CheckCircleIcon /> : <WarningAmberIcon />,
        color: gradients.orange,
      },
    ];
  }, [reportData, formatPercent, formatScore]);

  // ─── Export ────────────────────────────────────
  const handleExport = async () => {
    if (!reportData || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const payload = {
        report_data: {
          ...reportData,
          report_type: reportData.reportType || 'Advanced Student Report',
          student_name: reportData.student?.name || 'Unknown',
          generated_at: reportData.generatedAt || new Date().toISOString(),
        },
      };
      const response = await apiClient.post(`/exports/${exportFormat}`, payload, {
        responseType: 'blob',
      });
      const blob = response instanceof Blob ? response : new Blob([response]);
      const extensionMap = { pdf: 'pdf', excel: 'xlsx', csv: 'csv', json: 'json' };
      const extension = extensionMap[exportFormat] || exportFormat;
      const dateLabel = new Date().toISOString().split('T')[0];
      triggerBlobDownload(blob, `student-advanced-report-${dateLabel}.${extension}`);
      showSnackbar('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      logger.error('Error exporting report:', error);
      showSnackbar('تعذر تصدير التقرير', 'error');
      const errorMessage =
        error instanceof Error && 'An internal error occurred'
          ? `تعذر تصدير التقرير. ${'حدث خطأ، يرجى المحاولة لاحقاً'}`
          : 'تعذر تصدير التقرير. تأكد من تشغيل الخادم وخدمة التصدير.';
      setExportError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  return {
    // State
    loading,
    reportData,
    setReportData,
    loadError,
    exportFormat,
    setExportFormat,
    exporting,
    exportError,
    hasCachedData,
    lastLoadedAt,
    filters,
    setFilters,
    // Derived
    isDateRangeInvalid,
    isDefaultFilters,
    summaryCards,
    // Handlers
    loadReport,
    handleResetFilters,
    handleClearCache,
    handleExport,
    // Formatters
    formatDeltaValue,
    // Identity
    userId,
  };
}

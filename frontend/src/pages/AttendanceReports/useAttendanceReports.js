import { useState, useEffect } from 'react';
import api from 'services/api.client';
import exportService from 'services/exportService';
import { parentService } from 'services/parentService';
import { getAttendanceCols, setAttendanceCols as persistCols } from 'utils/storageService';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { attendanceColumns, defaultAttendanceCols } from './constants';

const useAttendanceReports = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [reportData, setReportData] = useState(null);
  const [selectedAttendanceCols, setSelectedAttendanceCols] = useState(() =>
    getAttendanceCols(defaultAttendanceCols)
  );
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [reportType, setReportType] = useState('attendance');

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getAttendanceReports(userId);
      setReportData(data);
    };
    fetchData();
  }, [userId]);

  const handleExportAIPrediction = format => {
    if (!aiPrediction) return;
    const data = [
      {
        'نسبة احتمال الغياب': aiPrediction.absenceProbability
          ? `${(aiPrediction.absenceProbability * 100).toFixed(1)}%`
          : 'غير متوفر',
        ...(aiPrediction.reason ? { ملاحظة: aiPrediction.reason } : {}),
        'تاريخ التوقع': new Date().toLocaleString(),
      },
    ];
    if (format === 'excel') exportService.toExcel(data, 'ai-absence-prediction');
    if (format === 'csv') exportService.toCSV(data, 'ai-absence-prediction');
    if (format === 'pdf') exportService.toPDF('ai-prediction-export', 'ai-absence-prediction');
  };

  const handleAIPredictAbsence = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiPrediction(null);
    try {
      const absencesLast30Days =
        reportData.attendanceRecords?.filter(r => r.status === 'غياب').length || 0;
      const attendanceRate = 0.95;
      const behaviorScore = 0.9;
      const performanceScore = 0.8;
      const studentId = '123';
      const res = await api.post('/ai/predict-absence', {
        studentId,
        absencesLast30Days,
        attendanceRate,
        behaviorScore,
        performanceScore,
      });
      setAiPrediction(res);
      showSnackbar('تم توقع الغياب بنجاح', 'success');
    } catch {
      setAiError('حدث خطأ أثناء توقع الغياب.');
      showSnackbar('حدث خطأ أثناء توقع الغياب', 'error');
    } finally {
      setAiLoading(false);
    }
    setAiDialogOpen(true);
  };

  const handleExport = (type, format) => {
    let data = [];
    let fileName = '';
    let elementId = '';
    let columns = null;
    if (type === 'attendance') {
      data = reportData?.attendanceRecords || [];
      fileName = `attendance-report-${selectedMonth}`;
      elementId = 'attendance-table';
      columns = attendanceColumns.filter(c => selectedAttendanceCols.includes(c.id));
      data = data.map(row => {
        const filtered = {};
        columns.forEach(col => {
          filtered[col.id] = row[col.id];
        });
        return filtered;
      });
    } else if (type === 'behavior') {
      data = reportData?.behaviorReports || [];
      fileName = `behavior-report-${selectedMonth}`;
      elementId = 'behavior-table';
    } else if (type === 'performance') {
      data = reportData?.performanceMetrics || [];
      fileName = `performance-report-${selectedMonth}`;
      elementId = 'performance-table';
    }
    if (!data.length) return;
    if (format === 'excel') exportService.toExcel(data, fileName);
    if (format === 'csv') exportService.toCSV(data, fileName);
    if (format === 'pdf') exportService.toPDF(elementId, fileName);
  };

  const updateCols = cols => {
    setSelectedAttendanceCols(cols);
    persistCols(cols);
  };

  return {
    reportData,
    selectedAttendanceCols,
    updateCols,
    colSelectorOpen,
    setColSelectorOpen,
    aiDialogOpen,
    setAiDialogOpen,
    aiPrediction,
    aiLoading,
    aiError,
    openDialog,
    setOpenDialog,
    selectedMonth,
    setSelectedMonth,
    reportType,
    setReportType,
    handleExport,
    handleExportAIPrediction,
    handleAIPredictAbsence,
  };
};

export default useAttendanceReports;

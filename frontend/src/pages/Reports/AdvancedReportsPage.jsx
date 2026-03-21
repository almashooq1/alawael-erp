/**
 * صفحة التقارير المتقدمة
 * Advanced Reports Page
 *
 * Features:
 * - Smart Reports Dashboard
 * - Advanced data export
 * - Real-time notifications
 * - Custom report generation
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import exportService from 'services/exportService';
import smartReportsService from 'services/smartReportsService';
import notificationService from 'services/notificationService';
import { WS_URL } from 'config/apiConfig';
import logger from 'utils/logger';
import { gradients } from '../../theme/palette';
import { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import Assessment from '@mui/icons-material/Assessment';
import Refresh from '@mui/icons-material/Refresh';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Download from '@mui/icons-material/Download';
import Share from '@mui/icons-material/Share';
import Delete from '@mui/icons-material/Delete';

// Static sample reports data
const SAMPLE_REPORTS = [
    {
      id: 1,
      name: 'تقرير الأداء الشهري',
      type: 'Performance',
      date: '2026-01-15',
      status: 'completed',
      format: 'PDF',
      size: '2.4 MB',
      description: 'تقرير شامل عن أداء المركز خلال شهر يناير'
    },
    {
      id: 2,
      name: 'تحليل الاتجاهات السنوي',
      type: 'Trends',
      date: '2026-01-14',
      status: 'completed',
      format: 'Excel',
      size: '1.2 MB',
      description: 'تحليل تفصيلي للاتجاهات على مدار السنة'
    },
    {
      id: 3,
      name: 'تقرير المستفيدين الجديد',
      type: 'Comprehensive',
      date: '2026-01-13',
      status: 'processing',
      format: 'Excel',
      size: '3.1 MB',
      description: 'قائمة شاملة بجميع المستفيدين الجدد'
    }
  ];

const AdvancedReportsPage = () => {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();
  const [tabValue, setTabValue] = useState(0);
  const [reports, setReports] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newReport, setNewReport] = useState({ name: '', type: 'comprehensive', format: 'pdf' });
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(() => {
    setRefreshing(true);
    // محاكاة تحميل التقارير
    setTimeout(() => {
      setReports(SAMPLE_REPORTS);
      setRefreshing(false);
    }, 1000);
  }, []);

  // Keep a stable ref so event handlers always call the latest loadReports
  const loadReportsRef = useRef(loadReports);
  useEffect(() => { loadReportsRef.current = loadReports; }, [loadReports]);

  // Initialize notifications
  useEffect(() => {
    notificationService.connect(`${WS_URL}/notifications`).catch(error => {
      logger.warn('Notification service error:', error);
    });

    notificationService.on('report-generated', () => {
      loadReportsRef.current();
    });

    notificationService.on('export-completed', (_data) => {
    });

    return () => {
      if (notificationService.isConnected()) {
        notificationService.disconnect?.();
      }
    };
  }, [showSnackbar]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleCreateReport = async () => {
    try {
      const _reportData = {
        name: newReport.name,
        type: newReport.type,
        timestamp: new Date().toISOString()
      };

      // استدعاء خدمة التقارير
      if (newReport.type === 'comprehensive') {
        await smartReportsService.getComprehensiveReport();
      } else if (newReport.type === 'performance') {
        await smartReportsService.getPerformanceAnalysis();
      }

      // تصدير التقرير
      if (newReport.format === 'excel') {
        exportService.toExcel(reports, `${newReport.name}`);
      } else if (newReport.format === 'pdf') {
        // PDF export
        await exportService.toPDF('reports-table', `${newReport.name}`);
      }

      notificationService.addNotification({
        type: 'success',
        title: 'تم إنشاء التقرير',
        message: `تم إنشاء تقرير "${newReport.name}" بنجاح`
      });
      showSnackbar('تم إنشاء التقرير بنجاح', 'success');

      setOpenDialog(false);
      setNewReport({ name: '', type: 'comprehensive', format: 'pdf' });
      loadReports();
    } catch (error) {
      logger.error('Error creating report:', error);
      notificationService.addNotification({
        type: 'error',
        title: 'خطأ',
        message: 'حدث خطأ في إنشاء التقرير'
      });
      showSnackbar('حدث خطأ في إنشاء التقرير', 'error');
    }
  };

  const handleExportReport = (report, format) => {
    try {
      if (format === 'excel') {
        exportService.toExcel([report], `${report.name}`);
      } else if (format === 'pdf') {
        exportService.toPDF('report-detail', `${report.name}`);
      } else if (format === 'csv') {
        exportService.toCSV([report], `${report.name}`);
      }

      notificationService.addNotification({
        type: 'success',
        title: 'تم التصدير',
        message: `تم تصدير التقرير بصيغة ${format.toUpperCase()}`
      });
      showSnackbar('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      logger.error('Export error:', error);
      showSnackbar('فشل تصدير التقرير', 'error');
    }
  };

  const handleDeleteReport = (reportId) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        setReports(reports.filter(r => r.id !== reportId));
        notificationService.addNotification({
          type: 'info',
          title: 'تم الحذف',
          message: 'تم حذف التقرير بنجاح'
        });
      },
    });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Assessment sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>التقارير المتقدمة</Typography>
            <Typography variant="body2">تحليلات وتقارير شاملة</Typography>
          </Box>
        </Box>
      </Box>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            📊 التقارير المتقدمة
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إنشاء وإدارة التقارير الذكية والتحليلات المتقدمة
          </Typography>
        </Box>
      </motion.div>

      {/* Actions */}
      <Grid container spacing={2} mb={3}>
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Assessment />}
            onClick={() => setOpenDialog(true)}
          >
            إنشاء تقرير جديد
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadReports}
            disabled={refreshing}
          >
            تحديث
          </Button>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="لوحة التقارير الذكية" icon={<Assessment />} iconPosition="start" />
          <Tab label="قائمة التقارير" icon={<FileDownload />} iconPosition="start" />
          <Tab label="الرسوم البيانية" icon={<TrendingUp />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Tab 1: Smart Reports Dashboard */}
        {tabValue === 0 && (
          <Box>
            <SmartReportsDashboard />
          </Box>
        )}

        {/* Tab 2: Reports List */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            {reports.map((report) => (
              <Grid item xs={12} md={6} key={report.id}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <Box flex={1}>
                          <Typography variant="h6" fontWeight="bold">
                            {report.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {report.date} • {report.size}
                          </Typography>
                        </Box>
                        <Chip
                          label={report.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                          color={report.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {report.description}
                      </Typography>

                      <Typography variant="caption" display="block" mb={2}>
                        النوع: {report.type} • الصيغة: {report.format}
                      </Typography>

                      <Box display="flex" gap={1}>
                        <Tooltip title="تحميل Excel">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="تنزيل Excel"
                            onClick={() => handleExportReport(report, 'excel')}
                          >
                            <Download />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تحميل PDF">
                          <IconButton
                            size="small"
                            color="primary"
                            aria-label="تنزيل PDF"
                            onClick={() => handleExportReport(report, 'pdf')}
                          >
                            <FileDownload />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="مشاركة">
                          <IconButton size="small" color="primary" aria-label="مشاركة">
                            <Share />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="حذف"
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tab 3: Charts */}
        {tabValue === 2 && (
          <Card>
            <CardContent>
              <AdvancedChartsComponent data={reports.map((r, _i) => ({
                name: r.name,
                value: Math.random() * 100,
                date: r.date
              }))} />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Create Report Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء تقرير جديد</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="اسم التقرير"
            value={newReport.name}
            onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>نوع التقرير</InputLabel>
            <Select
              value={newReport.type}
              label="نوع التقرير"
              onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
            >
              <MenuItem value="comprehensive">شامل</MenuItem>
              <MenuItem value="performance">الأداء</MenuItem>
              <MenuItem value="trends">الاتجاهات</MenuItem>
              <MenuItem value="comparative">مقارن</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>صيغة التصدير</InputLabel>
            <Select
              value={newReport.format}
              label="صيغة التصدير"
              onChange={(e) => setNewReport({ ...newReport, format: e.target.value })}
            >
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="excel">Excel</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateReport} variant="contained" color="primary">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default AdvancedReportsPage;

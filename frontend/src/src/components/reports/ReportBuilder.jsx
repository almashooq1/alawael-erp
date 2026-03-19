/**
 * Report Builder Component
 * مكون بناء التقارير
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import reportService from '../../services/reportService';
import './ReportBuilder.css';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReportBuilder() {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sales Report State
  const [salesReport, setSalesReport] = useState(null);
  const [salesStartDate, setSalesStartDate] = useState('2024-01-01');
  const [salesEndDate, setSalesEndDate] = useState('2024-01-31');

  // Revenue Report State
  const [revenueReport, setRevenueReport] = useState(null);
  const [revenueStartDate, setRevenueStartDate] = useState('2024-01-01');
  const [revenueEndDate, setRevenueEndDate] = useState('2024-01-31');
  const [revenueCategory, setRevenueCategory] = useState('all');

  // Users Report State
  const [usersReport, setUsersReport] = useState(null);
  const [usersRole, setUsersRole] = useState('all');
  const [usersStatus, setUsersStatus] = useState('all');

  // Attendance Report State
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [attendanceStartDate, setAttendanceStartDate] = useState('2024-01-01');
  const [attendanceEndDate, setAttendanceEndDate] = useState('2024-01-31');

  // All Reports
  const [allReports, setAllReports] = useState([]);
  
  // Template Dialog
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // ==================== Generate Reports ====================

  const handleGenerateSalesReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        start_date: salesStartDate,
        end_date: salesEndDate,
        group_by: 'day'
      };
      
      const report = await reportService.generateSalesReport(filters);
      setSalesReport(report);
      setSuccess('تم توليد تقرير المبيعات بنجاح');
      
      // Refresh all reports
      await loadAllReports();
    } catch (err) {
      setError('فشل في توليد تقرير المبيعات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRevenueReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        start_date: revenueStartDate,
        end_date: revenueEndDate,
        category: revenueCategory
      };
      
      const report = await reportService.generateRevenueReport(filters);
      setRevenueReport(report);
      setSuccess('تم توليد تقرير الإيرادات بنجاح');
      
      await loadAllReports();
    } catch (err) {
      setError('فشل في توليد تقرير الإيرادات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUsersReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        role: usersRole,
        status: usersStatus
      };
      
      const report = await reportService.generateUsersReport(filters);
      setUsersReport(report);
      setSuccess('تم توليد تقرير المستخدمين بنجاح');
      
      await loadAllReports();
    } catch (err) {
      setError('فشل في توليد تقرير المستخدمين');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAttendanceReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        start_date: attendanceStartDate,
        end_date: attendanceEndDate
      };
      
      const report = await reportService.generateAttendanceReport(filters);
      setAttendanceReport(report);
      setSuccess('تم توليد تقرير الحضور بنجاح');
      
      await loadAllReports();
    } catch (err) {
      setError('فشل في توليد تقرير الحضور');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== Export ====================

  const handleExportCSV = async (reportId) => {
    try {
      await reportService.exportReportCSV(reportId);
      setSuccess('تم تصدير التقرير إلى CSV بنجاح');
    } catch (err) {
      setError('فشل في تصدير التقرير');
      console.error(err);
    }
  };

  const handleExportJSON = async (reportId) => {
    try {
      await reportService.exportReportJSON(reportId);
      setSuccess('تم تصدير التقرير إلى JSON بنجاح');
    } catch (err) {
      setError('فشل في تصدير التقرير');
      console.error(err);
    }
  };

  // ==================== Templates ====================

  const handleSaveTemplate = async () => {
    try {
      const currentReport = tabValue === 0 ? salesReport :
                           tabValue === 1 ? revenueReport :
                           tabValue === 2 ? usersReport :
                           attendanceReport;
      
      if (!currentReport) {
        setError('لا يوجد تقرير لحفظه كقالب');
        return;
      }

      const templateData = {
        name: templateName,
        description: templateDescription,
        report_type: currentReport.report_type,
        filters: currentReport.metadata?.filters || {}
      };

      await reportService.createTemplate(templateData);
      setSuccess('تم حفظ القالب بنجاح');
      setTemplateDialogOpen(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (err) {
      setError('فشل في حفظ القالب');
      console.error(err);
    }
  };

  // ==================== Load Reports ====================

  const loadAllReports = async () => {
    try {
      const response = await reportService.getAllReports();
      setAllReports(response.reports || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  useEffect(() => {
    loadAllReports();
  }, []);

  // ==================== Delete Report ====================

  const handleDeleteReport = async (reportId) => {
    try {
      await reportService.deleteReport(reportId);
      setSuccess('تم حذف التقرير بنجاح');
      await loadAllReports();
    } catch (err) {
      setError('فشل في حذف التقرير');
      console.error(err);
    }
  };

  // ==================== Render Functions ====================

  const renderSalesReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          label="تاريخ البداية"
          type="date"
          value={salesStartDate}
          onChange={(e) => setSalesStartDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="تاريخ النهاية"
          type="date"
          value={salesEndDate}
          onChange={(e) => setSalesEndDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={handleGenerateSalesReport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
          fullWidth
        >
          {loading ? 'جاري التوليد...' : 'توليد تقرير المبيعات'}
        </Button>
      </Grid>

      {salesReport && (
        <>
          <Grid item xs={12}>
            <Card className="summary-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>الملخص</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">إجمالي المبيعات</Typography>
                    <Typography variant="h6">${salesReport.summary?.total_sales?.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">عدد المعاملات</Typography>
                    <Typography variant="h6">{salesReport.summary?.total_transactions}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">المتوسط اليومي</Typography>
                    <Typography variant="h6">${salesReport.summary?.average_daily_sales?.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">متوسط المعاملة</Typography>
                    <Typography variant="h6">${salesReport.summary?.average_transaction_value?.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportCSV(salesReport.report_id)}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportJSON(salesReport.report_id)}
              >
                تصدير JSON
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => setTemplateDialogOpen(true)}
              >
                حفظ كقالب
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table className="report-table">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell align="right">المبيعات</TableCell>
                    <TableCell align="right">عدد المعاملات</TableCell>
                    <TableCell align="right">متوسط المعاملة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salesReport.data?.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell align="right">${row.sales?.toFixed(2)}</TableCell>
                      <TableCell align="right">{row.transactions}</TableCell>
                      <TableCell align="right">${row.average_transaction?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderRevenueReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <TextField
          label="تاريخ البداية"
          type="date"
          value={revenueStartDate}
          onChange={(e) => setRevenueStartDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField
          label="تاريخ النهاية"
          type="date"
          value={revenueEndDate}
          onChange={(e) => setRevenueEndDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth>
          <InputLabel>الفئة</InputLabel>
          <Select
            value={revenueCategory}
            onChange={(e) => setRevenueCategory(e.target.value)}
            label="الفئة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="Products">المنتجات</MenuItem>
            <MenuItem value="Services">الخدمات</MenuItem>
            <MenuItem value="Subscriptions">الاشتراكات</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={handleGenerateRevenueReport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
          fullWidth
        >
          {loading ? 'جاري التوليد...' : 'توليد تقرير الإيرادات'}
        </Button>
      </Grid>

      {revenueReport && (
        <>
          <Grid item xs={12}>
            <Card className="summary-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>الملخص</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">إجمالي الإيرادات</Typography>
                    <Typography variant="h6">${revenueReport.summary?.total_revenue?.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">عدد الفئات</Typography>
                    <Typography variant="h6">{revenueReport.summary?.categories_count}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="text.secondary">متوسط الإيرادات</Typography>
                    <Typography variant="h6">${revenueReport.summary?.average_revenue_per_category?.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportCSV(revenueReport.report_id)}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportJSON(revenueReport.report_id)}
              >
                تصدير JSON
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table className="report-table">
                <TableHead>
                  <TableRow>
                    <TableCell>الفئة</TableCell>
                    <TableCell align="right">الإيرادات</TableCell>
                    <TableCell align="right">النمو %</TableCell>
                    <TableCell align="right">عدد المعاملات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revenueReport.data?.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell align="right">${row.revenue?.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${row.growth_percentage}%`}
                          color={row.growth_percentage > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{row.transactions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderUsersReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>الدور</InputLabel>
          <Select
            value={usersRole}
            onChange={(e) => setUsersRole(e.target.value)}
            label="الدور"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="admin">مدير</MenuItem>
            <MenuItem value="manager">مشرف</MenuItem>
            <MenuItem value="staff">موظف</MenuItem>
            <MenuItem value="user">مستخدم</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={usersStatus}
            onChange={(e) => setUsersStatus(e.target.value)}
            label="الحالة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="active">نشط</MenuItem>
            <MenuItem value="inactive">غير نشط</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={handleGenerateUsersReport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
          fullWidth
        >
          {loading ? 'جاري التوليد...' : 'توليد تقرير المستخدمين'}
        </Button>
      </Grid>

      {usersReport && (
        <>
          <Grid item xs={12}>
            <Card className="summary-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>الملخص</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">إجمالي المستخدمين</Typography>
                    <Typography variant="h6">{usersReport.summary?.total_users}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">النشطون</Typography>
                    <Typography variant="h6" color="success.main">{usersReport.summary?.active_users}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">غير النشطين</Typography>
                    <Typography variant="h6" color="error.main">{usersReport.summary?.inactive_users}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2" color="text.secondary">معدل النشاط</Typography>
                    <Typography variant="h6">{usersReport.summary?.overall_activity_rate}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportCSV(usersReport.report_id)}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportJSON(usersReport.report_id)}
              >
                تصدير JSON
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table className="report-table">
                <TableHead>
                  <TableRow>
                    <TableCell>الدور</TableCell>
                    <TableCell align="right">إجمالي المستخدمين</TableCell>
                    <TableCell align="right">النشطون</TableCell>
                    <TableCell align="right">غير النشطين</TableCell>
                    <TableCell align="right">معدل النشاط</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersReport.data?.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.role}</TableCell>
                      <TableCell align="right">{row.total_users}</TableCell>
                      <TableCell align="right">{row.active_users}</TableCell>
                      <TableCell align="right">{row.inactive_users}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${row.activity_rate}%`}
                          color={row.activity_rate > 80 ? 'success' : row.activity_rate > 60 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderAttendanceReport = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          label="تاريخ البداية"
          type="date"
          value={attendanceStartDate}
          onChange={(e) => setAttendanceStartDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          label="تاريخ النهاية"
          type="date"
          value={attendanceEndDate}
          onChange={(e) => setAttendanceEndDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button
          variant="contained"
          onClick={handleGenerateAttendanceReport}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
          fullWidth
        >
          {loading ? 'جاري التوليد...' : 'توليد تقرير الحضور'}
        </Button>
      </Grid>

      {attendanceReport && (
        <>
          <Grid item xs={12}>
            <Card className="summary-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>الملخص</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">متوسط الحضور</Typography>
                    <Typography variant="h6" color="success.main">{attendanceReport.summary?.average_present_rate?.toFixed(2)}%</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">متوسط الغياب</Typography>
                    <Typography variant="h6" color="error.main">{attendanceReport.summary?.average_absent_rate?.toFixed(2)}%</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportCSV(attendanceReport.report_id)}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => handleExportJSON(attendanceReport.report_id)}
              >
                تصدير JSON
              </Button>
            </Box>

            <TableContainer component={Paper}>
              <Table className="report-table">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>اليوم</TableCell>
                    <TableCell align="right">نسبة الحضور</TableCell>
                    <TableCell align="right">نسبة الغياب</TableCell>
                    <TableCell align="right">في الوقت</TableCell>
                    <TableCell align="right">متأخرون</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendanceReport.data?.slice(0, 15).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.day}</TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${row.present_rate}%`}
                          color={row.present_rate > 90 ? 'success' : row.present_rate > 75 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{row.absent_rate}%</TableCell>
                      <TableCell align="right">{row.on_time}%</TableCell>
                      <TableCell align="right">{row.late}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderAllReports = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">جميع التقارير</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadAllReports}
          >
            تحديث
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>نوع التقرير</TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>تاريخ التوليد</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allReports.map((report, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip label={report.report_type} size="small" />
                  </TableCell>
                  <TableCell>{report.title}</TableCell>
                  <TableCell>{report.metadata?.generated_at?.split('T')[0]}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleExportCSV(report.report_id)}
                      title="تصدير CSV"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteReport(report.report_id)}
                      title="حذف"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );

  return (
    <Box className="report-builder-container">
      <Typography variant="h4" gutterBottom>
        <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        بناء التقارير
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="تقرير المبيعات" />
          <Tab label="تقرير الإيرادات" />
          <Tab label="تقرير المستخدمين" />
          <Tab label="تقرير الحضور" />
          <Tab label="جميع التقارير" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>{renderSalesReport()}</TabPanel>
        <TabPanel value={tabValue} index={1}>{renderRevenueReport()}</TabPanel>
        <TabPanel value={tabValue} index={2}>{renderUsersReport()}</TabPanel>
        <TabPanel value={tabValue} index={3}>{renderAttendanceReport()}</TabPanel>
        <TabPanel value={tabValue} index={4}>{renderAllReports()}</TabPanel>
      </Card>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)}>
        <DialogTitle>حفظ كقالب</DialogTitle>
        <DialogContent>
          <TextField
            label="اسم القالب"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الوصف"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveTemplate} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

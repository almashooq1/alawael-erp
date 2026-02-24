import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import smartReportsService from '../services/smartReportsService';
import exportService from '../services/exportService';

/**
 * مكون لوحة التقارير الذكية
 * Smart Reports Dashboard Component
 * 
 * يوفر نظام تقارير متقدم مع التحليلات الذكية
 * Provides advanced reporting system with intelligent analytics
 */

const SmartReportsDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newReport, setNewReport] = useState({
    name: '',
    type: 'comprehensive',
    filters: {},
  });
  const [kpis, setKpis] = useState({
    total: 0,
    unread: 0,
    byType: {},
  });

  // تحميل البيانات
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // محاكاة تحميل البيانات
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // بيانات نموذجية
      setReports([
        {
          id: 1,
          name: 'تقرير الأداء الشهري',
          type: 'performance',
          createdAt: new Date(),
          status: 'completed',
          metrics: { revenue: 45000, growth: 12, efficiency: 85 },
        },
        {
          id: 2,
          name: 'تحليل الاتجاهات',
          type: 'trends',
          createdAt: new Date(),
          status: 'completed',
          metrics: { trend: 'up', change: 15 },
        },
        {
          id: 3,
          name: 'التقرير التنفيذي',
          type: 'executive',
          createdAt: new Date(),
          status: 'processing',
          metrics: {},
        },
      ]);

      setKpis({
        total: 12,
        unread: 3,
        byType: { performance: 5, trends: 4, executive: 3 },
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async () => {
    try {
      setLoading(true);
      // محاكاة حفظ التقرير
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const newReportData = {
        id: reports.length + 1,
        ...newReport,
        createdAt: new Date(),
        status: 'completed',
      };

      setReports([...reports, newReportData]);
      setOpenDialog(false);
      setNewReport({
        name: '',
        type: 'comprehensive',
        filters: {},
      });
    } catch (error) {
      console.error('Error creating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = (id) => {
    setReports(reports.filter((r) => r.id !== id));
  };

  const handleExportReport = async (report) => {
    try {
      setLoading(true);
      const fileName = `${report.name}-${new Date().toLocaleDateString('ar-SA')}`;
      await exportService.toExcel(
        {
          name: report.name,
          type: report.type,
          createdAt: report.createdAt,
          metrics: report.metrics,
        },
        fileName
      );
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = (report) => {
    exportService.print('report-content', {
      title: report.name,
    });
  };

  // Tab 1: Overview
  const renderOverview = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 32, fontWeight: 'bold', mb: 1 }}>{kpis.total}</Box>
            <Box sx={{ fontSize: 14 }}>إجمالي التقارير</Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 32, fontWeight: 'bold', mb: 1 }}>{kpis.unread}</Box>
            <Box sx={{ fontSize: 14 }}>تقارير جديدة</Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 32, fontWeight: 'bold', mb: 1 }}>
              {reports.filter((r) => r.status === 'completed').length}
            </Box>
            <Box sx={{ fontSize: 14 }}>مكتملة</Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: 32, fontWeight: 'bold', mb: 1 }}>
              {reports.filter((r) => r.status === 'processing').length}
            </Box>
            <Box sx={{ fontSize: 14 }}>قيد المعالجة</Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Reports */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="التقارير الأخيرة" subheader="آخر التقارير المنشأة" />
          <CardContent>
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#f3f4f6' }}>
                  <TableCell align="right">اسم التقرير</TableCell>
                  <TableCell align="right">النوع</TableCell>
                  <TableCell align="right">الحالة</TableCell>
                  <TableCell align="right">التاريخ</TableCell>
                  <TableCell align="right">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.slice(0, 5).map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell align="right">{report.name}</TableCell>
                    <TableCell align="right">{report.type}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={report.status === 'completed' ? 'مكتمل' : 'قيد المعالجة'}
                        color={report.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{report.createdAt.toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleExportReport(report)}
                      >
                        تصدير
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Tab 2: Performance Analysis
  const renderPerformanceAnalysis = () => (
    <Grid container spacing={3}>
      {reports
        .filter((r) => r.type === 'performance')
        .map((report) => (
          <Grid item xs={12} md={6} key={report.id}>
            <Card>
              <CardHeader
                title={report.name}
                subheader={`تم الإنشاء: ${report.createdAt.toLocaleDateString('ar-SA')}`}
                action={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" startIcon={<EditIcon />}>
                      تعديل
                    </Button>
                    <Button size="small" startIcon={<DeleteIcon />} onClick={() => handleDeleteReport(report.id)}>
                      حذف
                    </Button>
                  </Box>
                }
              />
              <CardContent>
                {Object.entries(report.metrics).map(([key, value]) => (
                  <Box key={key} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ fontWeight: 'bold' }}>{key}</Box>
                      <Box>{value}</Box>
                    </Box>
                    <LinearProgress variant="determinate" value={typeof value === 'number' ? value : 0} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );

  // Tab 3: Trend Analysis
  const renderTrendAnalysis = () => (
    <Grid container spacing={3}>
      {reports
        .filter((r) => r.type === 'trends')
        .map((report) => (
          <Grid item xs={12} key={report.id}>
            <Card>
              <CardHeader title={report.name} />
              <CardContent>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  {Object.entries(report.metrics).map(([key, value]) => (
                    <Box key={key}>
                      <Box sx={{ fontSize: 12, color: '#666' }}>{key}</Box>
                      <Box sx={{ fontSize: 24, fontWeight: 'bold', color: '#667eea' }}>{value}</Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
    </Grid>
  );

  return (
    <Box sx={{ p: 2 }}>
      {loading && <CircularProgress />}

      {!loading && (
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Box variant="h5" sx={{ fontSize: 24, fontWeight: 'bold', mb: 1 }}>
                📊 لوحة التقارير الذكية
              </Box>
              <Box sx={{ fontSize: 14, color: '#666' }}>نظام متقدم للتحليلات والتقارير</Box>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              إنشاء تقرير جديد
            </Button>
          </Box>

          {/* Tabs */}
          <Card sx={{ mb: 3 }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{
                borderBottom: '1px solid #e0e0e0',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                },
              }}
            >
              <Tab label="النظرة العامة" />
              <Tab label="تحليل الأداء" />
              <Tab label="تحليل الاتجاهات" />
            </Tabs>

            {tabValue === 0 && <Box sx={{ p: 2 }}>{renderOverview()}</Box>}
            {tabValue === 1 && <Box sx={{ p: 2 }}>{renderPerformanceAnalysis()}</Box>}
            {tabValue === 2 && <Box sx={{ p: 2 }}>{renderTrendAnalysis()}</Box>}
          </Card>

          {/* Create Report Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>إنشاء تقرير جديد</DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="اسم التقرير"
                value={newReport.name}
                onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                margin="normal"
              />
              <Select
                fullWidth
                value={newReport.type}
                onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}
                margin="normal"
                sx={{ mt: 2 }}
              >
                <MenuItem value="comprehensive">تقرير شامل</MenuItem>
                <MenuItem value="performance">تحليل الأداء</MenuItem>
                <MenuItem value="trends">تحليل الاتجاهات</MenuItem>
                <MenuItem value="executive">التقرير التنفيذي</MenuItem>
              </Select>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
              <Button onClick={handleCreateReport} variant="contained" disabled={!newReport.name}>
                إنشاء
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default SmartReportsDashboard;

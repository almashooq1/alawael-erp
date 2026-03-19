import React, { useState, useEffect } from 'react';
import CustomColumnSelector from '../components/CustomColumnSelector';
import api from '../utils/api';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
} from '@mui/material';
import {
  EventNote as EventNoteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableView as TableViewIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import exportService from '../services/exportService';
import { parentService } from '../services/parentService';

const AttendanceReports = () => {
  const [reportData, setReportData] = useState(null);
  // تخصيص الأعمدة
  const attendanceColumns = [
    { id: 'date', label: 'التاريخ', alwaysVisible: true },
    { id: 'time', label: 'الوقت' },
    { id: 'therapist', label: 'المعالج' },
    { id: 'status', label: 'الحالة', alwaysVisible: true },
    { id: 'notes', label: 'الملاحظات' },
  ];
  const defaultAttendanceCols = attendanceColumns
    .filter(c => c.alwaysVisible || c.id === 'time' || c.id === 'therapist')
    .map(c => c.id);
  const [selectedAttendanceCols, setSelectedAttendanceCols] = useState(() => {
    return JSON.parse(localStorage.getItem('attendanceCols')) || defaultAttendanceCols;
  });
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // تصدير نتيجة الذكاء الاصطناعي
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
  // استدعاء توقع الغياب بالذكاء الاصطناعي
  const handleAIPredictAbsence = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiPrediction(null);
    try {
      // بيانات افتراضية من التقرير الحالي (يمكن تطويرها لاحقاً)
      const absencesLast30Days =
        reportData.attendanceRecords?.filter(r => r.status === 'غياب').length || 0;
      const attendanceRate = 0.95; // نسبة الحضور من الإحصائيات
      const behaviorScore = 0.9; // تقدير افتراضي
      const performanceScore = 0.8; // تقدير افتراضي
      const studentId = '123'; // يمكن ربطه بالطالب لاحقاً
      const res = await api.post('/ai/predict-absence', {
        studentId,
        absencesLast30Days,
        attendanceRate,
        behaviorScore,
        performanceScore,
      });
      setAiPrediction(res.data || res.result || res);
    } catch (err) {
      setAiError('حدث خطأ أثناء توقع الغياب.');
    } finally {
      setAiLoading(false);
    }
    setAiDialogOpen(true);
  };
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [reportType, setReportType] = useState('attendance');

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getAttendanceReports('parent001');
      setReportData(data);
    };
    fetchData();
  }, []);

  if (!reportData) return <Typography>جاري التحميل...</Typography>;

  const getStatusChipColor = status => {
    if (status === 'حاضر') return 'success';
    if (status === 'غياب') return 'error';
    if (status === 'متأخر') return 'warning';
    return 'info';
  };

  // Export handlers by type (يدعم الأعمدة المختارة)
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
      // تصدير فقط الأعمدة المختارة
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <EventNoteIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تقارير الحضور والسلوك
            </Typography>
            <Typography variant="body2">متابعة حضور الجلسات والسلوك خلال الجلسات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {reportData.summaryStats?.map(stat => (
          <Grid item xs={12} sm={6} md={3} key={stat.id}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: stat.color, fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters & Export + تخصيص الأعمدة */}
      <Card sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الشهر</InputLabel>
              <Select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                label="الشهر"
              >
                <MenuItem value="January">يناير</MenuItem>
                <MenuItem value="February">فبراير</MenuItem>
                <MenuItem value="March">مارس</MenuItem>
                <MenuItem value="April">إبريل</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع التقرير</InputLabel>
              <Select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                label="نوع التقرير"
              >
                <MenuItem value="attendance">الحضور</MenuItem>
                <MenuItem value="behavior">السلوك</MenuItem>
                <MenuItem value="performance">الأداء</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {/* تخصيص الأعمدة للحضور */}
          {reportType === 'attendance' && (
            <Grid item xs={12} sm={6} md={2}>
              <Button variant="outlined" color="secondary" onClick={() => setColSelectorOpen(true)}>
                تخصيص الأعمدة
              </Button>
            </Grid>
          )}
          {/* Export Buttons */}
          {(reportType === 'attendance' ||
            reportType === 'behavior' ||
            reportType === 'performance') && (
            <Grid
              item
              xs={12}
              sm={12}
              md={reportType === 'attendance' ? 4 : 6}
              sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
            >
              <Button
                variant="outlined"
                color="primary"
                startIcon={<TableViewIcon />}
                onClick={() => handleExport(reportType, 'excel')}
                sx={{ minWidth: 120 }}
              >
                تصدير Excel
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<FileDownloadIcon />}
                onClick={() => handleExport(reportType, 'csv')}
                sx={{ minWidth: 120 }}
              >
                تصدير CSV
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<PictureAsPdfIcon />}
                onClick={() => handleExport(reportType, 'pdf')}
                sx={{ minWidth: 120 }}
              >
                تصدير PDF
              </Button>
            </Grid>
          )}
        </Grid>
      </Card>

      {/* نافذة اختيار الأعمدة */}
      <Dialog
        open={colSelectorOpen}
        onClose={() => setColSelectorOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تخصيص أعمدة جدول الحضور</DialogTitle>
        <DialogContent>
          <CustomColumnSelector
            columns={attendanceColumns}
            selected={selectedAttendanceCols}
            onChange={cols => {
              setSelectedAttendanceCols(cols);
              localStorage.setItem('attendanceCols', JSON.stringify(cols));
            }}
            onClose={() => setColSelectorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Attendance Table مع تخصيص الأعمدة */}
      {reportType === 'attendance' && (
        <Card sx={{ mb: 4 }}>
          <CardHeader title={`تقرير الحضور - ${selectedMonth}`} />
          <TableContainer>
            <Table id="attendance-table">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  {attendanceColumns
                    .filter(col => selectedAttendanceCols.includes(col.id))
                    .map(col => (
                      <TableCell key={col.id} sx={{ fontWeight: 'bold' }}>
                        {col.label}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.attendanceRecords?.map(record => (
                  <TableRow key={record.id} hover>
                    {attendanceColumns
                      .filter(col => selectedAttendanceCols.includes(col.id))
                      .map(col => (
                        <TableCell key={col.id} sx={col.id === 'status' ? { minWidth: 90 } : {}}>
                          {col.id === 'status' ? (
                            <Chip
                              label={record.status}
                              color={getStatusChipColor(record.status)}
                              size="small"
                            />
                          ) : (
                            record[col.id]
                          )}
                        </TableCell>
                      ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Behavior Report */}
      {reportType === 'behavior' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TableContainer>
              <Table id="behavior-table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>السلوكيات الإيجابية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>نقاط تحتاج تحسين</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الملخص</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.behaviorReports?.map(report => (
                    <TableRow key={report.id} hover>
                      <TableCell>{report.date}</TableCell>
                      <TableCell>{report.therapist}</TableCell>
                      <TableCell>
                        {report.positiveTraits?.map(trait => (
                          <Chip
                            key={trait}
                            label={trait}
                            color="success"
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>
                        {report.areasToImprove?.map(area => (
                          <Chip
                            key={area}
                            label={area}
                            color="error"
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </TableCell>
                      <TableCell>{report.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Performance Chart */}
      {reportType === 'performance' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TableContainer>
              <Table id="performance-table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>المؤشر</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الدرجة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.performanceMetrics?.map(metric => (
                    <TableRow key={metric.id} hover>
                      <TableCell>{metric.name}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 'bold', color: metric.color }}
                          >
                            {metric.score}/10
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={metric.score * 10}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: '#f0f0f0',
                              width: 80,
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: metric.color,
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{metric.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {/* Action Buttons + AI Absence Prediction */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<CheckCircleIcon />}
          onClick={() => setOpenDialog(true)}
        >
          مقابلة مع المعالج
        </Button>
        <Button variant="outlined" startIcon={CancelIcon}>
          تحميل التقرير PDF
        </Button>
        <Button
          variant="contained"
          color="secondary"
          sx={{ fontWeight: 'bold' }}
          onClick={handleAIPredictAbsence}
        >
          توقع الغياب بالذكاء الاصطناعي
        </Button>
      </Box>

      {/* AI Absence Prediction Dialog + Export */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>توقع الغياب بالذكاء الاصطناعي</DialogTitle>
        <DialogContent
          sx={{
            minHeight: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          {aiLoading ? (
            <Box sx={{ width: '100%' }}>
              <LinearProgress />
              <Typography align="center" sx={{ mt: 2 }}>
                جاري التوقع...
              </Typography>
            </Box>
          ) : aiError ? (
            <Typography color="error">{aiError}</Typography>
          ) : aiPrediction ? (
            <Box sx={{ width: '100%' }}>
              <Typography align="center" variant="h6" sx={{ mb: 2 }}>
                نسبة احتمال الغياب المتوقعة:{' '}
                <span style={{ color: '#fa709a', fontWeight: 'bold' }}>
                  {aiPrediction.absenceProbability
                    ? `${(aiPrediction.absenceProbability * 100).toFixed(1)}%`
                    : 'غير متوفر'}
                </span>
              </Typography>
              {aiPrediction.reason && (
                <Typography align="center" variant="body2" sx={{ color: '#666' }}>
                  {aiPrediction.reason}
                </Typography>
              )}
              {/* زر تصدير نتيجة الذكاء الاصطناعي */}
              <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => handleExportAIPrediction('pdf')}
                  startIcon={<PictureAsPdfIcon />}
                >
                  تصدير PDF
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  onClick={() => handleExportAIPrediction('excel')}
                  startIcon={<TableViewIcon />}
                >
                  تصدير Excel
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => handleExportAIPrediction('csv')}
                  startIcon={<FileDownloadIcon />}
                >
                  تصدير CSV
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography align="center">لا توجد بيانات توقع متاحة.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* عنصر مخفي لتصدير PDF */}
      <div id="ai-prediction-export" style={{ display: 'none' }}>
        {aiPrediction && (
          <div>
            <h2>تقرير توقع الغياب بالذكاء الاصطناعي</h2>
            <p>
              <b>نسبة احتمال الغياب:</b>{' '}
              {aiPrediction.absenceProbability
                ? `${(aiPrediction.absenceProbability * 100).toFixed(1)}%`
                : 'غير متوفر'}
            </p>
            {aiPrediction.reason && (
              <p>
                <b>ملاحظة:</b> {aiPrediction.reason}
              </p>
            )}
            <p>
              <b>تاريخ التوقع:</b> {new Date().toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تحديد موعد مقابلة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="التاريخ"
            type="date"
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>المعالج</InputLabel>
            <Select label="المعالج">
              <MenuItem value="therapist1">أ. فاطمة علي</MenuItem>
              <MenuItem value="therapist2">د. محمد إبراهيم</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="الموضوع" multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            تحديد الموعد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AttendanceReports;

import React, { useState, useEffect } from 'react';
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
import { EventNote as EventNoteIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { parentService } from '../services/parentService';

const AttendanceReports = () => {
  const [reportData, setReportData] = useState(null);
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

      {/* Filters */}
      <Card sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الشهر</InputLabel>
              <Select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} label="الشهر">
                <MenuItem value="January">يناير</MenuItem>
                <MenuItem value="February">فبراير</MenuItem>
                <MenuItem value="March">مارس</MenuItem>
                <MenuItem value="April">إبريل</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع التقرير</InputLabel>
              <Select value={reportType} onChange={e => setReportType(e.target.value)} label="نوع التقرير">
                <MenuItem value="attendance">الحضور</MenuItem>
                <MenuItem value="behavior">السلوك</MenuItem>
                <MenuItem value="performance">الأداء</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              fullWidth
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              }}
            >
              طباعة
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Attendance Table */}
      {reportType === 'attendance' && (
        <Card sx={{ mb: 4 }}>
          <CardHeader title={`تقرير الحضور - ${selectedMonth}`} />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.attendanceRecords?.map(record => (
                  <TableRow key={record.id} hover>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.time}</TableCell>
                    <TableCell>{record.therapist}</TableCell>
                    <TableCell>
                      <Chip label={record.status} color={getStatusChipColor(record.status)} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{record.notes}</TableCell>
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
          {reportData.behaviorReports?.map(report => (
            <Grid item xs={12} md={6} key={report.id}>
              <Card>
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {report.date}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      المعالج: {report.therapist}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      السلوكيات الإيجابية
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {report.positiveTraits?.map(trait => (
                        <Chip key={trait} label={trait} color="success" size="small" />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      نقاط تحتاج تحسين
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {report.areasToImprove?.map(area => (
                        <Chip key={area} label={area} color="error" size="small" />
                      ))}
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: '#666' }}>
                    {report.summary}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Performance Chart */}
      {reportType === 'performance' && (
        <Grid container spacing={3}>
          {reportData.performanceMetrics?.map(metric => (
            <Grid item xs={12} key={metric.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {metric.name}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: metric.color }}>
                      {metric.score}/10
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={metric.score * 10}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: metric.color,
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#999', mt: 1, display: 'block' }}>
                    {metric.notes}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
        <Button variant="outlined" startIcon={<CheckCircleIcon />} onClick={() => setOpenDialog(true)}>
          مقابلة مع المعالج
        </Button>
        <Button variant="outlined" startIcon={CancelIcon}>
          تحميل التقرير PDF
        </Button>
      </Box>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تحديد موعد مقابلة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="التاريخ" type="date" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
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

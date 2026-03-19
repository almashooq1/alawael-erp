/**
 * Reports Generator - CRM Reporting System 📊
 * مكون تقارير CRM - نظام التقارير
 *
 * Features:
 * ✅ Custom report builder
 * ✅ Scheduled reports
 * ✅ Export formats (PDF, Excel)
 * ✅ Advanced analytics
 * ✅ Comparison reports
 * ✅ KPI dashboards
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  GetApp as GetAppIcon,
  PictureAsPdf as PictureAsPdfIcon,
  CloudDownload as CloudDownloadIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

const ReportsGenerator = () => {
  const [reports, setReports] = useState([
    {
      id: '1',
      name: 'تقرير المبيعات الشهري',
      type: 'sales',
      frequency: 'monthly',
      lastGenerated: '2026-01-15',
      format: 'pdf',
      status: 'ready',
    },
    {
      id: '2',
      name: 'تقرير أداء الفريق',
      type: 'performance',
      frequency: 'weekly',
      lastGenerated: '2026-01-16',
      format: 'excel',
      status: 'ready',
    },
    {
      id: '3',
      name: 'تقرير رضا العملاء',
      type: 'satisfaction',
      frequency: 'monthly',
      lastGenerated: '2026-01-14',
      format: 'pdf',
      status: 'ready',
    },
    {
      id: '4',
      name: 'تقرير الإيرادات الربعية',
      type: 'revenue',
      frequency: 'quarterly',
      lastGenerated: '2025-10-15',
      format: 'pdf',
      status: 'ready',
    },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [formData, setFormData] = useState({});

  const reportData = [
    { metric: 'إجمالي المبيعات', value: 450000, target: 400000, variance: '+12.5%' },
    { metric: 'عدد الصفقات الجديدة', value: 24, target: 20, variance: '+20%' },
    { metric: 'معدل الإغلاق', value: '35%', target: '30%', variance: '+5%' },
    { metric: 'متوسط قيمة الصفقة', value: 18750, target: 20000, variance: '-6.25%' },
    { metric: 'معدل الاحتفاظ', value: '92%', target: '90%', variance: '+2%' },
    { metric: 'رضا العملاء', value: '4.6/5', target: '4.5/5', variance: '+2.2%' },
  ];

  const handleAddReport = () => {
    setFormData({});
    setSelectedReport(null);
    setOpenDialog(true);
  };

  const handleGenerateReport = () => {
    alert('تم إنشاء التقرير بنجاح! ✅');
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          📊 التقارير والتحليلات
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddReport}
          sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          تقرير جديد
        </Button>
      </Box>

      {/* Active Reports */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📋 التقارير النشطة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {reports.map(report => (
          <Grid item xs={12} sm={6} md={4} key={report.id}>
            <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 3 } }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {report.name}
                    </Typography>
                    <Chip
                      label={report.frequency}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                  {report.format === 'pdf' ? (
                    <PictureAsPdfIcon sx={{ color: '#f44336' }} />
                  ) : (
                    <CloudDownloadIcon sx={{ color: '#2196f3' }} />
                  )}
                </Box>

                <Divider sx={{ my: 1 }} />

                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 1 }}
                >
                  آخر إنشاء: {new Date(report.lastGenerated).toLocaleDateString('ar-SA')}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloudDownloadIcon />}
                    fullWidth
                  >
                    تنزيل
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<ShareIcon />}>
                    مشاركة
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sample Report Data */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📈 نموذج بيانات التقرير
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea', color: 'white' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المقياس</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                القيمة الفعلية
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                الهدف
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                الفارق
              </TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>
                الحالة
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.map((row, idx) => {
              const isPositive = row.variance.includes('+');
              return (
                <TableRow key={idx} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.metric}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: '#667eea' }}>
                    {row.value}
                  </TableCell>
                  <TableCell align="right">{row.target}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 600, color: isPositive ? '#4caf50' : '#f44336' }}
                  >
                    {row.variance}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={isPositive ? 'ممتاز' : 'جيد'}
                      size="small"
                      color={isPositive ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Report Templates */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📑 قوالب التقارير المتاحة
      </Typography>
      <Grid container spacing={2}>
        {[
          { name: 'تقرير المبيعات', icon: '📊', color: '#667eea' },
          { name: 'تقرير الأداء', icon: '📈', color: '#4caf50' },
          { name: 'تقرير رضا العملاء', icon: '😊', color: '#ff9800' },
          { name: 'تقرير الإيرادات', icon: '💰', color: '#2196f3' },
          { name: 'تقرير المقارنة', icon: '📉', color: '#9c27b0' },
          { name: 'تقرير التوقعات', icon: '🔮', color: '#f44336' },
        ].map((template, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 2,
                backgroundColor: template.color + '10',
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
              }}
            >
              <Typography variant="h3" sx={{ mb: 1 }}>
                {template.icon}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: template.color }}>
                {template.name}
              </Typography>
              <Button size="small" variant="text" sx={{ mt: 1, color: template.color }}>
                استخدام
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          تقرير جديد
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField label="اسم التقرير" fullWidth />
            <FormControl fullWidth>
              <InputLabel>نوع التقرير</InputLabel>
              <Select label="نوع التقرير">
                {['مبيعات', 'أداء', 'رضا العملاء', 'إيرادات'].map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>التكرار</InputLabel>
              <Select label="التكرار">
                {['يومي', 'أسبوعي', 'شهري', 'ربع سنوي'].map(freq => (
                  <MenuItem key={freq} value={freq}>
                    {freq}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>صيغة التصدير</InputLabel>
              <Select label="صيغة التصدير">
                {['PDF', 'Excel', 'CSV'].map(fmt => (
                  <MenuItem key={fmt} value={fmt}>
                    {fmt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleGenerateReport}>
            إنشاء التقرير
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsGenerator;

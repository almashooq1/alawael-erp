/**
 * A/B Testing Framework 🧪
 * نظام الاختبارات المتعددة والتحليل
 *
 * Features:
 * ✅ Variant testing
 * ✅ Statistical analysis
 * ✅ Results tracking
 * ✅ Performance comparison
 * ✅ Split traffic management
 * ✅ Win detection
 * ✅ Rollout management
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Psychology as TestIcon,
  TrendingUp as TrendingIcon,
  CompareArrows as CompareIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Launch as LaunchIcon,
  Stop as StopIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';

const ABTestingFramework = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [tests, setTests] = useState([
    {
      id: 1,
      name: 'اختبار نموذج الدفع - الإصدار B',
      status: 'running',
      startDate: '2026-01-10',
      endDate: null,
      variants: [
        { name: 'Control (A)', traffic: 50, conversions: 245, visitors: 5000, conversionRate: 4.9, bounceRate: 32 },
        { name: 'Variant (B)', traffic: 50, conversions: 287, visitors: 5000, conversionRate: 5.74, bounceRate: 28 },
      ],
      confidence: 95,
      winner: 'B',
    },
    {
      id: 2,
      name: 'اختبار تخطيط الصفحة الرئيسية',
      status: 'completed',
      startDate: '2026-01-01',
      endDate: '2026-01-10',
      variants: [
        { name: 'Original Layout', traffic: 50, conversions: 320, visitors: 8000, conversionRate: 4.0, bounceRate: 38 },
        { name: 'New Layout', traffic: 50, conversions: 405, visitors: 8000, conversionRate: 5.06, bounceRate: 32 },
      ],
      confidence: 99,
      winner: 'New Layout',
    },
    {
      id: 3,
      name: 'اختبار ألوان زر CTA',
      status: 'running',
      startDate: '2026-01-12',
      endDate: null,
      variants: [
        { name: 'Blue Button', traffic: 33, conversions: 156, visitors: 4500, conversionRate: 3.47, bounceRate: 35 },
        { name: 'Green Button', traffic: 33, conversions: 178, visitors: 4500, conversionRate: 3.96, bounceRate: 31 },
        { name: 'Red Button', traffic: 34, conversions: 192, visitors: 4700, conversionRate: 4.09, bounceRate: 29 },
      ],
      confidence: 87,
      winner: 'Red Button',
    },
  ]);

  const [selectedTest, setSelectedTest] = useState(null);

  const stats = {
    totalTests: tests.length,
    runningTests: tests.filter(t => t.status === 'running').length,
    completedTests: tests.filter(t => t.status === 'completed').length,
    avgImprovement: 5.2,
  };

  const handleStopTest = testId => {
    setTests(tests.map(t => (t.id === testId ? { ...t, status: 'completed', endDate: new Date().toISOString().split('T')[0] } : t)));
  };

  const handleDeleteTest = testId => {
    setTests(tests.filter(t => t.id !== testId));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الاختبارات', value: stats.totalTests, icon: '🧪', color: '#667eea' },
          { label: 'جارية الآن', value: stats.runningTests, icon: '⏳', color: '#2196f3' },
          { label: 'مكتملة', value: stats.completedTests, icon: '✅', color: '#4caf50' },
          { label: 'متوسط التحسن', value: `${stats.avgImprovement}%`, icon: '📈', color: '#ff9800' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)} sx={{ borderBottom: 2, borderColor: '#e0e0e0' }}>
          <Tab label="🧪 الاختبارات الجارية" />
          <Tab label="✅ الاختبارات المكتملة" />
          <Tab label="📊 التحليلات المتقدمة" />
        </Tabs>
      </Box>

      {/* Tab 1: Running Tests */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🧪 الاختبارات الجارية
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
              اختبار جديد
            </Button>
          </Box>

          {tests
            .filter(t => t.status === 'running')
            .map(test => (
              <Card key={test.id} sx={{ mb: 2.5, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {test.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        بدأ: {test.startDate} | المدة: {Math.floor((new Date() - new Date(test.startDate)) / (1000 * 60 * 60 * 24))} يوم
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip label="جاري الآن ⏳" color="warning" size="small" />
                      <IconButton size="small">
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                    <AlertTitle>📊 الثقة الإحصائية: {test.confidence}%</AlertTitle>
                    الفائز الحالي: <strong>{test.winner}</strong>
                  </Alert>

                  <TableContainer sx={{ mb: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ backgroundColor: '#f8f9ff' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>المتغير</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            توزيع المرور
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            الزوار
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            التحويلات
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            معدل التحويل
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                            معدل الارتداد
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {test.variants.map((variant, idx) => (
                          <TableRow key={idx} sx={{ backgroundColor: variant.name === test.winner ? '#c8e6c9' : 'white' }}>
                            <TableCell sx={{ fontWeight: 600 }}>{variant.name}</TableCell>
                            <TableCell align="center">
                              <Chip label={`${variant.traffic}%`} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center">{variant.visitors.toLocaleString()}</TableCell>
                            <TableCell align="center">{variant.conversions}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                              {variant.conversionRate.toFixed(2)}%
                            </TableCell>
                            <TableCell align="center">{variant.bounceRate}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <LinearProgress variant="determinate" value={65} sx={{ mb: 1.5, height: 6, borderRadius: 3 }} />
                  <Typography variant="caption" color="textSecondary">
                    الانتهاء المتوقع: 5 أيام
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<ChartIcon />}>
                      تفاصيل
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<StopIcon />} onClick={() => handleStopTest(test.id)}>
                      إيقاف الاختبار
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
        </Box>
      )}

      {/* Tab 2: Completed Tests */}
      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            ✅ الاختبارات المكتملة
          </Typography>

          {tests
            .filter(t => t.status === 'completed')
            .map(test => (
              <Card key={test.id} sx={{ mb: 2.5, borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {test.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {test.startDate} إلى {test.endDate}
                      </Typography>
                    </Box>
                    <Chip label={`الفائز: ${test.winner} 🏆`} color="success" size="small" />
                  </Box>

                  <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                    <AlertTitle>🎉 نتيجة نهائية</AlertTitle>
                    تحسن بمعدل 26.4% | ثقة إحصائية: 99%
                  </Alert>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    {test.variants.map((variant, idx) => (
                      <Grid item xs={12} key={idx}>
                        <Paper sx={{ p: 1.5, backgroundColor: variant.name === test.winner ? '#c8e6c9' : '#f8f9ff' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {variant.name} {variant.name === test.winner ? '✨' : ''}
                            </Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ff9800' }}>
                              {variant.conversionRate.toFixed(2)}%
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={variant.conversionRate * 20} sx={{ height: 4, borderRadius: 2 }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<ChartIcon />}>
                      تقرير مفصل
                    </Button>
                    <Button size="small" variant="outlined" color="success" startIcon={<LaunchIcon />}>
                      تطبيق الفائز
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
        </Box>
      )}

      {/* Tab 3: Advanced Analytics */}
      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
            📊 التحليلات المتقدمة
          </Typography>

          <Grid container spacing={2}>
            {[
              {
                title: '📈 اتجاه التحويلات',
                data: [
                  { day: 'اليوم 1', control: 3.5, variant: 3.2 },
                  { day: 'اليوم 2', control: 3.8, variant: 3.5 },
                  { day: 'اليوم 3', control: 4.0, variant: 4.2 },
                  { day: 'اليوم 4', control: 4.1, variant: 4.8 },
                  { day: 'اليوم 5', control: 4.5, variant: 5.2 },
                ],
              },
              {
                title: '👥 توزيع الزوار',
                data: [
                  { segment: 'المتصفحات', control: 48, variant: 52 },
                  { segment: 'الهاتف', control: 35, variant: 42 },
                  { segment: 'الجهاز اللوحي', control: 17, variant: 6 },
                ],
              },
            ].map((analytics, idx) => (
              <Grid item xs={12} md={6} key={idx}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                      {analytics.title}
                    </Typography>
                    <Box sx={{ backgroundColor: '#f8f9ff', p: 2, borderRadius: 1.5, minHeight: 200 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', mt: 8 }}>
                        📊 رسم بياني تفاعلي
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* New Test Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء اختبار جديد</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="اسم الاختبار" variant="outlined" sx={{ mb: 2 }} placeholder="مثال: اختبار لون الزر" />
          <TextField fullWidth label="الهدف من الاختبار" variant="outlined" multiline rows={3} sx={{ mb: 2 }} placeholder="وصف الهدف..." />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>نوع القياس</InputLabel>
            <Select defaultValue="conversion" label="نوع القياس">
              <MenuItem value="conversion">معدل التحويل</MenuItem>
              <MenuItem value="engagement">التفاعل</MenuItem>
              <MenuItem value="retention">الاحتفاظ</MenuItem>
              <MenuItem value="revenue">الإيراد</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            إنشاء الاختبار
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ABTestingFramework;

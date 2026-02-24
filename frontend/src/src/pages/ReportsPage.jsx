/**
 * Reports Page - Comprehensive Reporting System
 * صفحة التقارير الشاملة
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  DateRange as DateIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  DirectionsBus as BusIcon,
  AttachMoney as MoneyIcon,
  Schedule as TimeIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as LineChartIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

// Tab Panel
const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

// Report Categories
const reportCategories = [
  { id: 'attendance', label: 'تقارير الحضور', icon: PeopleIcon },
  { id: 'transport', label: 'تقارير النقل', icon: BusIcon },
  { id: 'financial', label: 'التقارير المالية', icon: MoneyIcon },
  { id: 'performance', label: 'تقارير الأداء', icon: TrendingUpIcon },
];

// Reports Page
const ReportsPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('summary');

  // Chart Data
  const monthlyAttendanceData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        label: 'نسبة الحضور',
        data: [92, 88, 95, 91, 89, 93],
        borderColor: '#6366F1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const disabilityDistributionData = {
    labels: ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'متعددة'],
    datasets: [
      {
        data: [35, 25, 20, 30, 25, 15],
        backgroundColor: [
          '#6366F1',
          '#8B5CF6',
          '#EC4899',
          '#10B981',
          '#F59E0B',
          '#EF4444',
        ],
      },
    ],
  };

  const transportEfficiencyData = {
    labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
    datasets: [
      {
        label: 'في الموعد',
        data: [85, 88, 92, 90],
        backgroundColor: '#10B981',
      },
      {
        label: 'متأخر',
        data: [10, 8, 5, 7],
        backgroundColor: '#F59E0B',
      },
      {
        label: 'ملغي',
        data: [5, 4, 3, 3],
        backgroundColor: '#EF4444',
      },
    ],
  };

  const financialData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        label: 'الإيرادات',
        data: [150000, 165000, 180000, 175000, 190000, 200000],
        backgroundColor: '#10B981',
      },
      {
        label: 'المصروفات',
        data: [120000, 125000, 130000, 128000, 135000, 140000],
        backgroundColor: '#EF4444',
      },
    ],
  };

  // Report Templates
  const reportTemplates = [
    { id: 1, name: 'تقرير الحضور اليومي', category: 'attendance', lastRun: 'اليوم' },
    { id: 2, name: 'تقرير الحضور الشهري', category: 'attendance', lastRun: 'منذ 3 أيام' },
    { id: 3, name: 'تقرير كفاءة النقل', category: 'transport', lastRun: 'الأمس' },
    { id: 4, name: 'تقرير المصروفات', category: 'financial', lastRun: 'منذ أسبوع' },
    { id: 5, name: 'تقرير أداء الموظفين', category: 'performance', lastRun: 'منذ شهر' },
    { id: 6, name: 'تقرير رضا المستفيدين', category: 'performance', lastRun: 'منذ 2 أسبوع' },
  ];

  // Recent Reports
  const recentReports = [
    { id: 1, name: 'تقرير الحضور - فبراير 2026', date: '2026-02-23', status: 'completed', size: '2.5 MB' },
    { id: 2, name: 'تقرير النقل - الأسبوع 8', date: '2026-02-22', status: 'completed', size: '1.8 MB' },
    { id: 3, name: 'التقرير المالي - يناير 2026', date: '2026-02-01', status: 'completed', size: '3.2 MB' },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: '#F3F4F6', minHeight: '100vh' }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            التقارير والإحصائيات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير شاملة و تحليلات متقدمة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الفترة الزمنية</InputLabel>
            <Select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <MenuItem value="today">اليوم</MenuItem>
              <MenuItem value="week">هذا الأسبوع</MenuItem>
              <MenuItem value="month">هذا الشهر</MenuItem>
              <MenuItem value="quarter">هذا الربع</MenuItem>
              <MenuItem value="year">هذا العام</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            تصدير
          </Button>
        </Box>
      </Box>

      {/* Stats Summary */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <PeopleIcon sx={{ color: 'primary.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">150</Typography>
                  <Typography variant="body2" color="text.secondary">إجمالي المستفيدين</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                  <TrendingUpIcon sx={{ color: 'success.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">92%</Typography>
                  <Typography variant="body2" color="text.secondary">معدل الحضور</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                  <BusIcon sx={{ color: 'warning.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">94%</Typography>
                  <Typography variant="body2" color="text.secondary">كفاءة النقل</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                  <MoneyIcon sx={{ color: 'info.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">87%</Typography>
                  <Typography variant="body2" color="text.secondary">نسبة الرضا</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="نظرة عامة" icon={<BarChartIcon />} iconPosition="start" />
          <Tab label="تقارير الحضور" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="تقارير النقل" icon={<BusIcon />} iconPosition="start" />
          <Tab label="التقارير المالية" icon={<MoneyIcon />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Attendance Chart */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      معدل الحضور الشهري
                    </Typography>
                    <Line
                      data={monthlyAttendanceData}
                      options={{
                        responsive: true,
                        plugins: { legend: { position: 'top' } },
                        scales: { y: { beginAtZero: true, max: 100 } },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Distribution Chart */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      توزيع المستفيدين
                    </Typography>
                    <Doughnut
                      data={disabilityDistributionData}
                      options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Report Templates */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      قوالب التقارير
                    </Typography>
                    <List>
                      {reportTemplates.slice(0, 4).map((template) => (
                        <ListItem
                          key={template.id}
                          secondaryAction={
                            <Box>
                              <Tooltip title="PDF">
                                <IconButton size="small"><PdfIcon /></IconButton>
                              </Tooltip>
                              <Tooltip title="Excel">
                                <IconButton size="small"><ExcelIcon /></IconButton>
                              </Tooltip>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            <ReportsIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={template.name}
                            secondary={`آخر تشغيل: ${template.lastRun}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Reports */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      التقارير الأخيرة
                    </Typography>
                    <List>
                      {recentReports.map((report) => (
                        <ListItem
                          key={report.id}
                          secondaryAction={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {report.size}
                              </Typography>
                              <IconButton size="small"><DownloadIcon /></IconButton>
                            </Box>
                          }
                        >
                          <ListItemIcon>
                            <PdfIcon color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={report.name}
                            secondary={report.date}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Attendance Reports Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  تقارير الحضور التفصيلية
                </Typography>
                <Line data={monthlyAttendanceData} options={{ responsive: true }} />
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Transport Reports Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  تقارير كفاءة النقل
                </Typography>
                <Bar data={transportEfficiencyData} options={{ responsive: true }} />
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* Financial Reports Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  التقارير المالية
                </Typography>
                <Bar data={financialData} options={{ responsive: true }} />
              </CardContent>
            </Card>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ReportsPage;
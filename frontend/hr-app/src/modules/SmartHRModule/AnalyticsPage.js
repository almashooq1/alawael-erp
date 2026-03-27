/**
 * صفحة التقارير والتحليلات المتقدمة
 */
import React, { useEffect, useState } from 'react';
import {
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  Alert,
  Tab,
  Tabs,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  fetchWorkforceReport,
  fetchLeaveReport,
  fetchAttendanceReport,
  fetchPayrollReport,
  fetchSaudizationReport,
} from './api';

const TabPanel = ({ children, value, index }) =>
  value === index ? <Box py={2}>{children}</Box> : null;

const DistributionBar = ({ items, getLabel, getCount, total }) => (
  <Box>
    {items.map((item, i) => {
      const count = getCount(item);
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      return (
        <Box key={i} mb={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">{getLabel(item)}</Typography>
            <Typography variant="body2">
              {count} ({pct}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(pct, 100)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      );
    })}
  </Box>
);

const AnalyticsPage = () => {
  const [tab, setTab] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [workforce, leaves, attendance, payroll, saudization] = await Promise.all([
        fetchWorkforceReport().catch(() => null),
        fetchLeaveReport({}).catch(() => null),
        fetchAttendanceReport({}).catch(() => null),
        fetchPayrollReport({}).catch(() => null),
        fetchSaudizationReport().catch(() => null),
      ]);
      setData({
        workforce: workforce?.data,
        leaves: leaves?.data,
        attendance: attendance?.data,
        payroll: payroll?.data,
        saudization: saudization?.data,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box p={3} dir="rtl">
      <Typography variant="h5" fontWeight="bold" mb={2}>
        📊 التقارير والتحليلات
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 2 }}>
        <Tab label="القوى العاملة" />
        <Tab label="الإجازات" />
        <Tab label="الحضور" />
        <Tab label="الرواتب" />
        <Tab label="السعودة" />
      </Tabs>

      {/* ═══ Workforce ═══ */}
      <TabPanel value={tab} index={0}>
        {data.workforce ? (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">إجمالي الموظفين</Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {data.workforce.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب الحالة
                </Typography>
                <DistributionBar
                  items={data.workforce.distribution?.byStatus || []}
                  getLabel={i => i.status}
                  getCount={i => i.count}
                  total={data.workforce.total}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب نوع العمل
                </Typography>
                <DistributionBar
                  items={data.workforce.distribution?.byType || []}
                  getLabel={i => i.type}
                  getCount={i => i.count}
                  total={data.workforce.total}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب القسم (أعلى 10)
                </Typography>
                <DistributionBar
                  items={(data.workforce.distribution?.byDepartment || []).slice(0, 10)}
                  getLabel={i => i.department}
                  getCount={i => i.count}
                  total={data.workforce.total}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب الجنسية
                </Typography>
                <DistributionBar
                  items={data.workforce.distribution?.byNationality || []}
                  getLabel={i => i.nationality}
                  getCount={i => i.count}
                  total={data.workforce.total}
                />
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">لا تتوفر بيانات</Alert>
        )}
      </TabPanel>

      {/* ═══ Leaves ═══ */}
      <TabPanel value={tab} index={1}>
        {data.leaves ? (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption">إجمالي الطلبات</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {data.leaves.summary?.totalRequests}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: '3px solid green' }}>
                <CardContent>
                  <Typography variant="caption">مقبولة</Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {data.leaves.summary?.approved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: '3px solid red' }}>
                <CardContent>
                  <Typography variant="caption">مرفوضة</Typography>
                  <Typography variant="h4" fontWeight="bold" color="error">
                    {data.leaves.summary?.rejected}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: '3px solid orange' }}>
                <CardContent>
                  <Typography variant="caption">معلقة</Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {data.leaves.summary?.pending}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب نوع الإجازة
                </Typography>
                <DistributionBar
                  items={data.leaves.byType || []}
                  getLabel={i => `${i.type} (${i.totalDays} يوم)`}
                  getCount={i => i.count}
                  total={data.leaves.summary?.totalRequests || 1}
                />
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">لا تتوفر بيانات</Alert>
        )}
      </TabPanel>

      {/* ═══ Attendance ═══ */}
      <TabPanel value={tab} index={2}>
        {data.attendance ? (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption">إجمالي السجلات</Typography>
                  <Typography variant="h4">{data.attendance.summary?.totalRecords}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ borderTop: '3px solid green' }}>
                <CardContent>
                  <Typography variant="caption">نسبة الحضور</Typography>
                  <Typography variant="h4" color="success.main">
                    {data.attendance.summary?.attendanceRate}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption">غياب</Typography>
                  <Typography variant="h4" color="error">
                    {data.attendance.summary?.absent}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption">ساعات إضافية</Typography>
                  <Typography variant="h4">
                    {data.attendance.summary?.totalOvertimeHours}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">لا تتوفر بيانات</Alert>
        )}
      </TabPanel>

      {/* ═══ Payroll ═══ */}
      <TabPanel value={tab} index={3}>
        {data.payroll ? (
          <Grid container spacing={3}>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">إجمالي الرواتب</Typography>
                  <Typography variant="h4">
                    {(data.payroll.summary?.totalGross || 0).toLocaleString()} ر.س
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">صافي</Typography>
                  <Typography variant="h4">
                    {(data.payroll.summary?.totalNet || 0).toLocaleString()} ر.س
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">متوسط</Typography>
                  <Typography variant="h4">
                    {Math.round(data.payroll.summary?.avgSalary || 0).toLocaleString()} ر.س
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  حسب القسم
                </Typography>
                <DistributionBar
                  items={data.payroll.byDepartment || []}
                  getLabel={i => `${i.department} (${i.employees} موظف)`}
                  getCount={i => i.totalGross}
                  total={data.payroll.summary?.totalGross || 1}
                />
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">لا تتوفر بيانات</Alert>
        )}
      </TabPanel>

      {/* ═══ Saudization ═══ */}
      <TabPanel value={tab} index={4}>
        {data.saudization ? (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">نسبة السعودة</Typography>
                  <Typography
                    variant="h3"
                    fontWeight="bold"
                    color={
                      data.saudization.overall.saudizationRate >= 60 ? 'success.main' : 'error'
                    }
                  >
                    {data.saudization.overall.saudizationRate}%
                  </Typography>
                  <Chip
                    label={`نطاقات: ${data.saudization.overall.nitaqatCategory}`}
                    color={
                      data.saudization.overall.nitaqatCategory === 'بلاتيني'
                        ? 'success'
                        : data.saudization.overall.nitaqatCategory === 'أخضر مرتفع'
                          ? 'success'
                          : data.saudization.overall.nitaqatCategory === 'أخضر'
                            ? 'primary'
                            : data.saudization.overall.nitaqatCategory === 'أصفر'
                              ? 'warning'
                              : 'error'
                    }
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">سعوديون</Typography>
                  <Typography variant="h4" color="primary">
                    {data.saudization.overall.saudi}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent>
                  <Typography variant="caption">غير سعوديين</Typography>
                  <Typography variant="h4">{data.saudization.overall.nonSaudi}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={1}>
                  السعودة حسب القسم
                </Typography>
                {(data.saudization.byDepartment || []).map((dept, i) => (
                  <Box key={i} mb={1}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">{dept.department}</Typography>
                      <Typography variant="body2">
                        {dept.rate}% ({dept.saudi}/{dept.total})
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(dept.rate, 100)}
                      color={dept.rate >= 60 ? 'success' : dept.rate >= 40 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">لا تتوفر بيانات</Alert>
        )}
      </TabPanel>
    </Box>
  );
};

export default AnalyticsPage;

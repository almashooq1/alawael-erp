/**
 * WorkflowKPIDashboard — لوحة مؤشرات الأداء (KPI)
 *
 * Real-time KPI analytics, bottleneck analysis, workload distribution,
 * completion trends, and category breakdowns.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Divider,
  MenuItem,
  Select,
  FormControl,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  alpha,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
  CameraAlt as SnapshotIcon,
  BugReport as BottleneckIcon,
  PieChart as PieIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

function KPIStatCard({ title, value, subtitle, icon, color, trend }) {
  return (
    <Card
      sx={{
        height: '100%',
        borderTop: `4px solid ${color}`,
        transition: 'all 0.3s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: alpha(color, 0.12), color }}>{icon}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={700} color={color}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {trend >= 0 ? (
                <TrendUpIcon fontSize="small" sx={{ color: '#4CAF50' }} />
              ) : (
                <TrendDownIcon fontSize="small" sx={{ color: '#F44336' }} />
              )}
              <Typography variant="caption" color={trend >= 0 ? '#4CAF50' : '#F44336'}>
                {Math.abs(trend).toFixed(1)}% {trend >= 0 ? 'تحسن' : 'تراجع'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max, color, label }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: alpha(color, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
        }}
      />
    </Box>
  );
}

export default function WorkflowKPIDashboard() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState('week');

  const [realtime, setRealtime] = useState(null);
  const [trends, setTrends] = useState(null);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [completionTrend, setCompletionTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [_snapshots, setSnapshots] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rtRes, trRes, bnRes, wlRes, ctRes, cbRes] = await Promise.all([
        workflowService.getKPIRealtime(),
        workflowService.getKPITrends({ period }),
        workflowService.getKPIBottlenecks(),
        workflowService.getKPIWorkloadDistribution(),
        workflowService.getKPICompletionTrend({ period }),
        workflowService.getKPICategoryBreakdown(),
      ]);
      setRealtime(rtRes.data?.data || null);
      setTrends(trRes.data?.data || null);
      setBottlenecks(bnRes.data?.data || []);
      setWorkload(wlRes.data?.data || []);
      setCompletionTrend(ctRes.data?.data || []);
      setCategoryBreakdown(cbRes.data?.data || []);
    } catch (err) {
      showSnackbar('خطأ في تحميل بيانات KPI', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const takeSnapshot = async () => {
    try {
      await workflowService.takeKPISnapshot();
      showSnackbar('تم حفظ لقطة KPI', 'success');
      const snRes = await workflowService.getKPISnapshots({ limit: 10 });
      setSnapshots(snRes.data?.data || []);
    } catch (err) {
      showSnackbar('خطأ في حفظ اللقطة', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            لوحة مؤشرات الأداء
          </Typography>
          <Chip icon={<AssessmentIcon />} label="KPI" size="small" color="primary" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={period} onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="day">يوم</MenuItem>
              <MenuItem value="week">أسبوع</MenuItem>
              <MenuItem value="month">شهر</MenuItem>
              <MenuItem value="quarter">ربع سنوي</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SnapshotIcon />}
            onClick={takeSnapshot}
          >
            لقطة
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Real-time KPIs */}
      {realtime && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <KPIStatCard
              title="إجمالي المهام"
              value={realtime.totalTasks || 0}
              icon={<AssessmentIcon />}
              color="#2196F3"
              subtitle="كل المهام"
              trend={trends?.taskGrowth}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <KPIStatCard
              title="مكتملة"
              value={realtime.completedTasks || 0}
              icon={<CheckIcon />}
              color="#4CAF50"
              subtitle={`${realtime.completionRate?.toFixed(1) || 0}% معدل الإنجاز`}
              trend={trends?.completionGrowth}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <KPIStatCard
              title="قيد التنفيذ"
              value={realtime.inProgressTasks || 0}
              icon={<ScheduleIcon />}
              color="#FF9800"
              subtitle="مهام نشطة الآن"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <KPIStatCard
              title="متأخرة"
              value={realtime.overdueTasks || 0}
              icon={<WarningIcon />}
              color="#F44336"
              subtitle="تحتاج اهتمام فوري"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <KPIStatCard
              title="متوسط الإنجاز"
              value={`${realtime.avgCompletionTime?.toFixed(1) || 0}h`}
              icon={<TimerIcon />}
              color="#9C27B0"
              subtitle="المدة المتوسطة"
              trend={trends?.timeGrowth}
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="نقاط الاختناق" icon={<BottleneckIcon />} iconPosition="start" />
        <Tab label="توزيع العمل" icon={<GroupIcon />} iconPosition="start" />
        <Tab label="اتجاه الإنجاز" icon={<TrendUpIcon />} iconPosition="start" />
        <Tab label="التصنيفات" icon={<PieIcon />} iconPosition="start" />
      </Tabs>

      {/* Bottlenecks Tab */}
      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            نقاط الاختناق في سير العمل
          </Typography>
          {bottlenecks.length === 0 ? (
            <Alert severity="success" sx={{ mt: 1 }}>
              لا توجد نقاط اختناق حالياً - سير العمل يعمل بسلاسة!
            </Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الخطوة / المرحلة</TableCell>
                    <TableCell>المهام المتراكمة</TableCell>
                    <TableCell>متوسط وقت الانتظار</TableCell>
                    <TableCell>الشدة</TableCell>
                    <TableCell>التأثير</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bottlenecks.map((b, i) => (
                    <TableRow
                      key={i}
                      hover
                      sx={{ bgcolor: i === 0 ? alpha('#F44336', 0.04) : 'inherit' }}
                    >
                      <TableCell>
                        <Typography fontWeight={i === 0 ? 700 : 400}>
                          {b.step || b.stage || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={b.pendingCount || 0}
                          color={
                            b.pendingCount > 10
                              ? 'error'
                              : b.pendingCount > 5
                                ? 'warning'
                                : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {b.avgWaitTime ? `${b.avgWaitTime.toFixed(1)} ساعة` : '—'}
                      </TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((b.severity || 0) * 10, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            width: 80,
                            bgcolor: alpha(
                              b.severity > 7 ? '#F44336' : b.severity > 4 ? '#FF9800' : '#4CAF50',
                              0.15
                            ),
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                b.severity > 7 ? '#F44336' : b.severity > 4 ? '#FF9800' : '#4CAF50',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>{b.impact || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Workload Distribution Tab */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            توزيع عبء العمل
          </Typography>
          {workload.length === 0 ? (
            <Alert severity="info">لا تتوفر بيانات توزيع العمل حالياً</Alert>
          ) : (
            <Grid container spacing={2}>
              {workload.map((w, i) => {
                const maxTasks = Math.max(...workload.map(x => x.totalTasks || 1));
                return (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: alpha('#2196F3', 0.12),
                            color: '#2196F3',
                          }}
                        >
                          <GroupIcon fontSize="small" />
                        </Avatar>
                        <Typography fontWeight={600}>
                          {w.userName || w.department || `موظف ${i + 1}`}
                        </Typography>
                      </Box>
                      <ProgressBar
                        value={w.activeTasks || 0}
                        max={maxTasks}
                        color="#FF9800"
                        label="مهام نشطة"
                      />
                      <ProgressBar
                        value={w.completedTasks || 0}
                        max={maxTasks}
                        color="#4CAF50"
                        label="مكتملة"
                      />
                      <ProgressBar
                        value={w.overdueTasks || 0}
                        max={maxTasks}
                        color="#F44336"
                        label="متأخرة"
                      />
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        الإجمالي: {w.totalTasks || 0} &bull; معدل الإنجاز:{' '}
                        {w.completionRate?.toFixed(0) || 0}%
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Paper>
      )}

      {/* Completion Trend Tab */}
      {tab === 2 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            اتجاه الإنجاز (
            {period === 'day'
              ? 'يومي'
              : period === 'week'
                ? 'أسبوعي'
                : period === 'month'
                  ? 'شهري'
                  : 'ربع سنوي'}
            )
          </Typography>
          {completionTrend.length === 0 ? (
            <Alert severity="info">لا تتوفر بيانات اتجاه الإنجاز</Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الفترة</TableCell>
                    <TableCell>تم الإنشاء</TableCell>
                    <TableCell>مكتمل</TableCell>
                    <TableCell>معدل الإنجاز</TableCell>
                    <TableCell>الاتجاه</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {completionTrend.map((ct, i) => {
                    const rate = ct.created > 0 ? (ct.completed / ct.created) * 100 : 0;
                    return (
                      <TableRow key={i} hover>
                        <TableCell>{ct.period || ct.date || `الفترة ${i + 1}`}</TableCell>
                        <TableCell>{ct.created || 0}</TableCell>
                        <TableCell>{ct.completed || 0}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(rate, 100)}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#4CAF50', 0.12),
                                '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50' },
                              }}
                            />
                            <Typography variant="caption" fontWeight={600}>
                              {rate.toFixed(0)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {i > 0 && ct.completed > (completionTrend[i - 1]?.completed || 0) ? (
                            <TrendUpIcon fontSize="small" sx={{ color: '#4CAF50' }} />
                          ) : i > 0 ? (
                            <TrendDownIcon fontSize="small" sx={{ color: '#F44336' }} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Category Breakdown Tab */}
      {tab === 3 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            تحليل التصنيفات
          </Typography>
          {categoryBreakdown.length === 0 ? (
            <Alert severity="info">لا تتوفر بيانات تصنيف</Alert>
          ) : (
            <Grid container spacing={2}>
              {categoryBreakdown.map((cat, i) => {
                const colors = [
                  '#2196F3',
                  '#4CAF50',
                  '#FF9800',
                  '#9C27B0',
                  '#E91E63',
                  '#00BCD4',
                  '#FF5722',
                  '#795548',
                ];
                const color = colors[i % colors.length];
                const total = categoryBreakdown.reduce((s, c) => s + (c.count || 0), 0);
                const pct = total > 0 ? (cat.count / total) * 100 : 0;
                return (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ p: 2, borderRight: `4px solid ${color}` }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ width: 32, height: 32, bgcolor: alpha(color, 0.12), color }}
                          >
                            <CategoryIcon fontSize="small" />
                          </Avatar>
                          <Typography fontWeight={600}>
                            {cat.category || cat.name || `تصنيف ${i + 1}`}
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={700} color={color}>
                          {cat.count || 0}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(color, 0.12),
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        sx={{ mt: 0.5 }}
                      >
                        {pct.toFixed(1)}% من الإجمالي &bull; مكتمل: {cat.completed || 0}
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Paper>
      )}
    </Box>
  );
}

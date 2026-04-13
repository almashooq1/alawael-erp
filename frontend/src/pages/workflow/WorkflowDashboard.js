/**
 * WorkflowDashboard — لوحة معلومات سير العمل
 *
 * Main overview page with KPIs, recent tasks, recent instances,
 * quick-start actions, and category distribution.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

// ─── KPI Card ──────────────────────────────────────────────────────────────
const KPICard = ({ title, value, icon, color, subtitle, onClick }) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s',
      '&:hover': onClick ? { transform: 'translateY(-4px)', boxShadow: 6 } : {},
      borderTop: `4px solid ${color}`,
      height: '100%',
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h3" fontWeight={700} sx={{ color }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: alpha(color, 0.12), color, width: 52, height: 52 }}>{icon}</Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ─── Category labels ─────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  approval: { ar: 'موافقات', color: '#4F46E5' },
  request: { ar: 'طلبات', color: '#7C3AED' },
  incident: { ar: 'حوادث', color: '#EF4444' },
  change: { ar: 'تغييرات', color: '#F59E0B' },
  project: { ar: 'مشاريع', color: '#10B981' },
  custom: { ar: 'مخصص', color: '#6B7280' },
};

const STATUS_COLORS = {
  running: 'info',
  completed: 'success',
  cancelled: 'error',
  suspended: 'warning',
  error: 'error',
  assigned: 'info',
  in_progress: 'warning',
  pending: 'default',
};

const STATUS_LABELS = {
  running: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  suspended: 'معلق',
  error: 'خطأ',
  assigned: 'معين',
  in_progress: 'جاري العمل',
  pending: 'قيد الانتظار',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const timeAgo = date => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
};

const slaRemaining = deadline => {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return { text: 'متأخر', color: '#EF4444', overdue: true };
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24)
    return { text: `${hrs} ساعة`, color: hrs < 4 ? '#F59E0B' : '#10B981', overdue: false };
  return { text: `${Math.floor(hrs / 24)} يوم`, color: '#10B981', overdue: false };
};

export default function WorkflowDashboard() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getDashboard();
      setData(res.data?.data || res.data);
    } catch {
      showSnackbar('حدث خطأ في تحميل لوحة المعلومات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = data?.kpis || {};
  const recentTasks = data?.recentTasks || [];
  const recentInstances = data?.recentInstances || [];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <Skeleton variant="rounded" height={130} />
            </Grid>
          ))}
          {[1, 2].map(i => (
            <Grid item xs={12} md={6} key={`s${i}`}>
              <Skeleton variant="rounded" height={380} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <WorkflowIcon color="primary" fontSize="large" />
            نظام سير العمل
          </Typography>
          <Typography variant="body2" color="text.secondary">
            لوحة المعلومات الرئيسية — إدارة شاملة وذكية لسير العمل
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/workflow/builder')}
          >
            إنشاء سير عمل
          </Button>
          <Button
            variant="outlined"
            startIcon={<StartIcon />}
            onClick={() => navigate('/workflow/templates')}
          >
            من القوالب
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="المهام المعلقة"
            value={kpis.pendingTasks || 0}
            icon={<TaskIcon />}
            color="#4F46E5"
            subtitle="بانتظار الإجراء"
            onClick={() => navigate('/workflow/my-tasks')}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="مهام متأخرة"
            value={kpis.overdueTasks || 0}
            icon={<OverdueIcon />}
            color="#EF4444"
            subtitle="تجاوزت المهلة"
            onClick={() => navigate('/workflow/my-tasks?overdue=true')}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="مكتمل هذا الأسبوع"
            value={kpis.completedThisWeek || 0}
            icon={<CompletedIcon />}
            color="#10B981"
            subtitle={`${kpis.completedThisMonth || 0} هذا الشهر`}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="سير عمل نشط"
            value={kpis.totalRunning || 0}
            icon={<TrendIcon />}
            color="#7C3AED"
            subtitle={`${kpis.totalCompleted || 0} مكتمل`}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="التعريفات"
            value={kpis.totalDefinitions || 0}
            icon={<DashboardIcon />}
            color="#3B82F6"
            subtitle={`${kpis.activeDefinitions || 0} مفعّل`}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KPICard
            title="انتهاكات SLA"
            value={kpis.slaViolations || 0}
            icon={<SLAIcon />}
            color={kpis.slaViolations > 0 ? '#EF4444' : '#10B981'}
            subtitle="قيد التشغيل"
          />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          إجراءات سريعة
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'مهامي', icon: <TaskIcon />, path: '/workflow/my-tasks', color: '#4F46E5' },
            {
              label: 'بناء سير عمل',
              icon: <AddIcon />,
              path: '/workflow/builder',
              color: '#7C3AED',
            },
            {
              label: 'القوالب الجاهزة',
              icon: <CategoryIcon />,
              path: '/workflow/templates',
              color: '#10B981',
            },
            {
              label: 'جميع المسارات',
              icon: <WorkflowIcon />,
              path: '/workflow/instances',
              color: '#3B82F6',
            },
            {
              label: 'التحليلات',
              icon: <TrendIcon />,
              path: '/workflow/analytics',
              color: '#F59E0B',
            },
          ].map(action => (
            <Button
              key={action.path}
              variant="outlined"
              startIcon={action.icon}
              onClick={() => navigate(action.path)}
              sx={{
                borderColor: alpha(action.color, 0.3),
                color: action.color,
                '&:hover': { borderColor: action.color, bgcolor: alpha(action.color, 0.05) },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Enhanced Features — الميزات المتقدمة */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          الميزات المتقدمة
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'التقويم', path: '/workflow/calendar', color: '#0891B2' },
            { label: 'التفويضات', path: '/workflow/delegation', color: '#6366F1' },
            { label: 'التقارير', path: '/workflow/reports', color: '#DC2626' },
            { label: 'التصنيفات', path: '/workflow/tags', color: '#16A34A' },
            { label: 'قوالب متقدمة', path: '/workflow/extended-templates', color: '#8B5CF6' },
            { label: 'البحث', path: '/workflow/search', color: '#64748B' },
            { label: 'Webhooks', path: '/workflow/webhooks', color: '#EA580C' },
            { label: 'الإشعارات', path: '/workflow/notification-prefs', color: '#0D9488' },
          ].map(action => (
            <Button
              key={action.path}
              variant="outlined"
              size="small"
              onClick={() => navigate(action.path)}
              sx={{
                borderColor: alpha(action.color, 0.3),
                color: action.color,
                '&:hover': { borderColor: action.color, bgcolor: alpha(action.color, 0.05) },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Pro Features — الميزات الاحترافية */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          الميزات الاحترافية
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'مصمم النماذج', path: '/workflow/form-builder', color: '#2196F3' },
            { label: 'إدارة التصعيد', path: '/workflow/escalations', color: '#F44336' },
            { label: 'سياسات SLA', path: '/workflow/sla-policies', color: '#00BCD4' },
            { label: 'مؤشرات الأداء', path: '/workflow/kpi-dashboard', color: '#FF9800' },
            { label: 'سلاسل الموافقات', path: '/workflow/approval-chains', color: '#9C27B0' },
            { label: 'قواعد الأتمتة', path: '/workflow/automations', color: '#4CAF50' },
          ].map(action => (
            <Button
              key={action.path}
              variant="outlined"
              size="small"
              onClick={() => navigate(action.path)}
              sx={{
                borderColor: alpha(action.color, 0.3),
                color: action.color,
                '&:hover': { borderColor: action.color, bgcolor: alpha(action.color, 0.05) },
              }}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Recent Tasks */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%' }}>
            <Box
              sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <TaskIcon color="primary" /> مهامي الحالية
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/workflow/my-tasks')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider />
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>المهمة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المهلة</TableCell>
                    <TableCell>الوقت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          لا توجد مهام حالياً
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentTasks.map(task => {
                      const sla = slaRemaining(task.sla?.deadline);
                      return (
                        <TableRow
                          key={task._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/workflow/my-tasks`)}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              noWrap
                              sx={{ maxWidth: 180 }}
                            >
                              {task.nameAr || task.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 180, display: 'block' }}
                            >
                              {task.workflowInstance?.definition?.nameAr || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={STATUS_LABELS[task.status] || task.status}
                              color={STATUS_COLORS[task.status] || 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {sla ? (
                              <Chip
                                size="small"
                                icon={<TimerIcon />}
                                label={sla.text}
                                sx={{
                                  bgcolor: alpha(sla.color, 0.1),
                                  color: sla.color,
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {timeAgo(task.createdAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Instances */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ height: '100%' }}>
            <Box
              sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <WorkflowIcon color="secondary" /> آخر المسارات
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/workflow/instances')}
              >
                عرض الكل
              </Button>
            </Box>
            <Divider />
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>سير العمل</TableCell>
                    <TableCell>التصنيف</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الوقت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentInstances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                          لا توجد مسارات حالياً
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInstances.map(inst => {
                      const cat =
                        CATEGORY_LABELS[inst.definition?.category] || CATEGORY_LABELS.custom;
                      return (
                        <TableRow
                          key={inst._id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/workflow/instances/${inst._id}`)}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              noWrap
                              sx={{ maxWidth: 180 }}
                            >
                              {inst.title}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ maxWidth: 180, display: 'block' }}
                            >
                              {inst.definition?.nameAr || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={cat.ar}
                              sx={{ bgcolor: alpha(cat.color, 0.1), color: cat.color }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={STATUS_LABELS[inst.status] || inst.status}
                              color={STATUS_COLORS[inst.status] || 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {timeAgo(inst.updatedAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              توزيع سير العمل حسب التصنيف
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(CATEGORY_LABELS).map(([key, cat]) => {
                const found = (data?.workflowsByCategory || []).find(c => c._id === key);
                const count = found?.count || 0;
                return (
                  <Grid item xs={6} sm={4} md={2} key={key}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(cat.color, 0.05),
                        border: `1px solid ${alpha(cat.color, 0.2)}`,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="h4" fontWeight={700} sx={{ color: cat.color }}>
                        {count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {cat.ar}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

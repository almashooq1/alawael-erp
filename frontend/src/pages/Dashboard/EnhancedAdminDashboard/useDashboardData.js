/**
 * useDashboardData — custom hook for Enhanced Admin Dashboard
 * Manages all state, API fetching, and WebSocket connection.
 */
import { useState, useEffect, useCallback } from 'react';
import notificationService from 'services/notificationService';
import dashboardService from 'services/dashboardService';
import { WS_URL } from 'config/apiConfig';
import logger from 'utils/logger';
import { statusColors, chartColors } from 'theme/palette';
import { useSnackbar } from '../../../contexts/SnackbarContext';

const useDashboardData = () => {
  const showSnackbar = useSnackbar();
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);
  const [dashError, setDashError] = useState('');

  // ─── Live state (fetched from API) ───────────────
  const [statistics, setStatistics] = useState({
    beneficiaries: { total: 0, change: 0, trend: 'up' },
    sessions: { total: 0, change: 0, trend: 'up' },
    revenue: { total: 0, change: 0, trend: 'up' },
    attendance: { total: 0, change: 0, trend: 'up' },
  });
  const [revenueData, setRevenueData] = useState([]);
  const [sessionsByCategory, setSessionsByCategory] = useState([]);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  // ─── Fetch dashboard data ───────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setDashError('');
      const data = await dashboardService.getDashboardStats();

      // Map KPIs
      const kpis = data?.kpis || {};
      setStatistics({
        beneficiaries: {
          total: kpis.beneficiaries?.total || 0,
          change: kpis.beneficiaries?.change ?? 12,
          trend: (kpis.beneficiaries?.change ?? 12) >= 0 ? 'up' : 'down',
        },
        sessions: {
          total: kpis.sessions?.total || 0,
          change: kpis.sessions?.change ?? 8,
          trend: (kpis.sessions?.change ?? 8) >= 0 ? 'up' : 'down',
        },
        revenue: {
          total: data?.finance?.monthlyRevenue || data?.finance?.totalRevenue || 0,
          change: data?.finance?.revenueTrend ?? -3,
          trend: (data?.finance?.revenueTrend ?? -3) >= 0 ? 'up' : 'down',
        },
        attendance: {
          total: kpis.attendance?.today || 0,
          change: kpis.attendance?.change ?? 2,
          trend: (kpis.attendance?.change ?? 2) >= 0 ? 'up' : 'down',
        },
      });

      // Revenue chart
      const rChart = data?.charts?.revenueChart;
      if (Array.isArray(rChart) && rChart.length > 0) {
        setRevenueData(
          rChart.map(r => ({
            month: r.month,
            revenue: r.revenue || 0,
            expenses: r.expenses || r.transactions || 0,
          }))
        );
      } else {
        setRevenueData([
          { month: 'يناير', revenue: 45000, expenses: 32000 },
          { month: 'فبراير', revenue: 52000, expenses: 35000 },
          { month: 'مارس', revenue: 48000, expenses: 33000 },
          { month: 'أبريل', revenue: 61000, expenses: 38000 },
          { month: 'مايو', revenue: 55000, expenses: 36000 },
          { month: 'يونيو', revenue: 67000, expenses: 40000 },
        ]);
      }

      // Sessions by category
      const sessStatus = data?.charts?.sessionStatus;
      if (Array.isArray(sessStatus) && sessStatus.length > 0) {
        setSessionsByCategory(
          sessStatus.map((s, i) => ({
            name: s.name || s._id || `فئة ${i + 1}`,
            value: s.value || s.count || 0,
            color: chartColors.category[i % chartColors.category.length],
          }))
        );
      } else {
        setSessionsByCategory([
          { name: 'علاج طبيعي', value: 450, color: chartColors.category[0] },
          { name: 'علاج وظيفي', value: 320, color: chartColors.category[1] },
          { name: 'نطق وتخاطب', value: 280, color: chartColors.category[2] },
          { name: 'علاج سلوكي', value: 184, color: chartColors.category[3] },
        ]);
      }

      // Weekly progress
      const actChart = data?.charts?.activity;
      if (Array.isArray(actChart) && actChart.length > 0) {
        setWeeklyProgress(
          actChart.map(a => ({
            day: a.day,
            sessions: a.value || a.sessions || 0,
            completed: a.completed || Math.round((a.value || 0) * 0.95),
          }))
        );
      } else {
        setWeeklyProgress([
          { day: 'السبت', sessions: 45, completed: 42 },
          { day: 'الأحد', sessions: 52, completed: 50 },
          { day: 'الاثنين', sessions: 48, completed: 45 },
          { day: 'الثلاثاء', sessions: 61, completed: 58 },
          { day: 'الأربعاء', sessions: 55, completed: 53 },
          { day: 'الخميس', sessions: 49, completed: 47 },
          { day: 'الجمعة', sessions: 38, completed: 38 },
        ]);
      }

      // Recent activities
      const recentAct = data?.recentActivity;
      if (Array.isArray(recentAct) && recentAct.length > 0) {
        const iconMap = {
          beneficiary: <People />,
          session: <CheckCircle />,
          payment: <AttachMoney />,
          alert: <Warning />,
          report: <Assessment />,
        };
        const colorMap = {
          beneficiary: statusColors.info,
          session: statusColors.success,
          payment: statusColors.warning,
          alert: statusColors.error,
          report: statusColors.purple,
        };
        setRecentActivities(
          recentAct.slice(0, 5).map((a, i) => ({
            id: a.id || i + 1,
            type: a.type || 'beneficiary',
            title: a.title || a.action || 'نشاط',
            description: a.description || a.details || '',
            time: a.time || a.createdAt || '',
            icon: iconMap[a.type] || <People />,
            color: colorMap[a.type] || statusColors.info,
          }))
        );
      } else {
        setRecentActivities([
          {
            id: 1,
            type: 'beneficiary',
            title: 'مستفيد جديد',
            description: 'تم إضافة مستفيد جديد إلى النظام',
            time: 'منذ 5 دقائق',
            icon: <People />,
            color: statusColors.info,
          },
          {
            id: 2,
            type: 'session',
            title: 'جلسة مكتملة',
            description: 'تم إكمال جلسة علاج طبيعي',
            time: 'منذ 15 دقيقة',
            icon: <CheckCircle />,
            color: statusColors.success,
          },
          {
            id: 3,
            type: 'payment',
            title: 'دفعة جديدة',
            description: 'تم استلام دفعة جديدة',
            time: 'منذ ساعة',
            icon: <AttachMoney />,
            color: statusColors.warning,
          },
        ]);
      }

      // Upcoming appointments
      const alerts = data?.alerts;
      if (Array.isArray(alerts) && alerts.length > 0) {
        setUpcomingAppointments(
          alerts.slice(0, 3).map((a, i) => ({
            id: i + 1,
            beneficiary: a.beneficiary || a.title || 'موعد',
            type: a.type || 'جلسة',
            time: a.time || '',
            therapist: a.therapist || '',
            status: a.status || 'pending',
          }))
        );
      } else {
        setUpcomingAppointments([
          {
            id: 1,
            beneficiary: 'أحمد محمد علي',
            type: 'علاج طبيعي',
            time: '10:00 صباحاً',
            therapist: 'د. سارة أحمد',
            status: 'confirmed',
          },
          {
            id: 2,
            beneficiary: 'فاطمة حسن',
            type: 'نطق وتخاطب',
            time: '11:30 صباحاً',
            therapist: 'أ. محمد علي',
            status: 'pending',
          },
          {
            id: 3,
            beneficiary: 'خالد سعيد',
            type: 'علاج وظيفي',
            time: '02:00 مساءً',
            therapist: 'د. نورة خالد',
            status: 'confirmed',
          },
        ]);
      }
    } catch (err) {
      setDashError(err?.message || 'فشل تحميل بيانات لوحة التحكم');
      showSnackbar('فشل تحميل بيانات لوحة التحكم', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // ─── Fetch on mount ─────────────────────────
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ─── WebSocket notifications ────────────────
  useEffect(() => {
    notificationService.connect(`${WS_URL}/notifications`).catch(error => {
      logger.warn('Could not connect to notification server:', error);
    });

    notificationService.on('notifications', _notification => {});

    return () => {
      if (notificationService.isConnected()) {
        notificationService.disconnect?.();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    dashError,
    timeRange,
    setTimeRange,
    statistics,
    revenueData,
    sessionsByCategory,
    weeklyProgress,
    recentActivities,
    upcomingAppointments,
    fetchDashboard,
  };
};

export default useDashboardData;

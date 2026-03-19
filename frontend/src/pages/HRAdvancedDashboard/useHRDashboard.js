/**
 * useHRDashboard – state, data fetching, actions & derived data.
 */
import { useState, useEffect, useCallback } from 'react';
import hrService from 'services/hrService';
import { useSnackbar } from 'contexts/SnackbarContext';
import { statusColors } from '../../theme/palette';
import { isPresent, isLate, isAbsent } from './constants';

const useHRDashboard = () => {
  const showSnackbar = useSnackbar();
  const [kpis, setKpis] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, attRes, leaveRes, revRes] = await Promise.all([
        hrService.getDashboardKPIs(),
        hrService.getAttendance(),
        hrService.getLeaves(),
        hrService.getPerformanceReviews(),
      ]);
      setKpis(kpiRes.data);
      setAttendance(Array.isArray(attRes.data) ? attRes.data : []);
      setLeaves(Array.isArray(leaveRes.data) ? leaveRes.data : []);
      setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      setIsDemo(kpiRes.isDemo || attRes.isDemo);
    } catch {
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await hrService.checkIn();
      showSnackbar('تم تسجيل الحضور بنجاح', 'success');
      loadDashboard();
    } catch {
      showSnackbar('فشل في تسجيل الحضور', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await hrService.checkOut();
      showSnackbar('تم تسجيل الانصراف بنجاح', 'success');
      loadDashboard();
    } catch {
      showSnackbar('فشل في تسجيل الانصراف', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Derived data ── */
  const presentCount = attendance.filter(a => isPresent(a.status)).length;
  const lateCount = attendance.filter(a => isLate(a.status)).length;
  const absentCount = attendance.filter(a => isAbsent(a.status)).length;
  const pendingLeaves = leaves.filter(l => l.status === 'pending' || l.status === 'قيد المراجعة');

  const attendanceChartData = [
    { name: 'حاضر', value: presentCount, color: statusColors.success },
    { name: 'متأخر', value: lateCount, color: statusColors.warning },
    { name: 'غائب/إجازة', value: absentCount, color: statusColors.error },
  ].filter(d => d.value > 0);

  const deptData = attendance.reduce((acc, a) => {
    const dept = a.department || 'أخرى';
    if (!acc[dept]) acc[dept] = { name: dept, present: 0, absent: 0 };
    if (isPresent(a.status) || isLate(a.status)) acc[dept].present++;
    else acc[dept].absent++;
    return acc;
  }, {});
  const departmentChartData = Object.values(deptData);

  return {
    kpis,
    attendance,
    leaves,
    reviews,
    isDemo,
    loading,
    actionLoading,
    loadDashboard,
    handleCheckIn,
    handleCheckOut,
    presentCount,
    absentCount,
    pendingLeaves,
    attendanceChartData,
    departmentChartData,
  };
};

export default useHRDashboard;

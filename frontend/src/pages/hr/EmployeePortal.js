/**
 * EmployeePortal.js — بوابة الموظف الذاتية
 * Self-service portal: Profile, Leaves, Payslips, Documents, Requests
 * Aligned with hrService DEMO_EMPLOYEES (EMP-2501+)
 *
 * Split from 644L monolith → orchestrator + 3 new sub-modules:
 *   - DocumentsTab.jsx, RequestsTab.jsx, EmployeePortalDialogs.jsx
 *   - (plus pre-existing ProfileTab, LeavesTab, PayslipsTab, employeePortalData)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { DEPT_COLORS } from '../../constants/departmentColors';
import employeePortalService from '../../services/employeePortal.service';
import { useSnackbar } from '../../contexts/SnackbarContext';

import { gradients, statusColors } from '../../theme/palette';

/* Sub-components */

import {
  demoProfile,
  demoBalances,
  demoLeaveHistory,
  demoPayslips,
  demoDocuments,
  demoRequests,
} from './employee-portal/employeePortalData';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import PrintIcon from '@mui/icons-material/Print';
import { DocIcon, LeaveIcon } from 'utils/iconAliases';

/* ─── Component ─── */
export default function EmployeePortal() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [payslipDetailOpen, setPayslipDetailOpen] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [requestForm, setRequestForm] = useState({ type: 'salary_certificate', description: '' });
  const [profile, setProfile] = useState(demoProfile);
  const [leaveBalances, setLeaveBalances] = useState(demoBalances);
  const [leaveHistory, setLeaveHistory] = useState(demoLeaveHistory);
  const [payslips, setPayslips] = useState(demoPayslips);
  const [documents, setDocuments] = useState(demoDocuments);
  const [requests, setRequests] = useState(demoRequests);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, leavesRes, payRes, docRes, reqRes] = await Promise.allSettled([
          employeePortalService.getProfile(),
          employeePortalService.getLeaves(),
          employeePortalService.getPayslips(),
          employeePortalService.getDocuments(),
          employeePortalService.getRequests(),
        ]);
        if (profileRes.status === 'fulfilled' && profileRes.value?.data)
          setProfile(profileRes.value.data);
        if (leavesRes.status === 'fulfilled') {
          if (leavesRes.value?.data?.length) setLeaveHistory(leavesRes.value.data);
          if (leavesRes.value?.balances) setLeaveBalances(leavesRes.value.balances);
        }
        if (payRes.status === 'fulfilled' && payRes.value?.data?.length)
          setPayslips(payRes.value.data);
        if (docRes.status === 'fulfilled' && docRes.value?.data?.length)
          setDocuments(docRes.value.data);
        if (reqRes.status === 'fulfilled' && reqRes.value?.data?.length)
          setRequests(reqRes.value.data);
      } catch {
        /* keep demo data */
      }
    };
    loadData();
  }, []);

  /* ─── Computed ─── */
  const deptColor = DEPT_COLORS[profile.department] || statusColors.primaryBlue;

  const leaveStats = useMemo(() => {
    const totalUsed = Object.values(leaveBalances).reduce((s, b) => s + b.used, 0);
    const totalRemaining = Object.values(leaveBalances).reduce((s, b) => s + b.remaining, 0);
    const pendingCount = leaveHistory.filter(l => l.status === 'pending').length;
    return { totalUsed, totalRemaining, pendingCount };
  }, [leaveBalances, leaveHistory]);

  const payrollSummary = useMemo(() => {
    if (!payslips.length) return null;
    const latest = payslips[payslips.length - 1];
    const avgNet = payslips.reduce((s, p) => s + p.net, 0) / payslips.length;
    return { latest, avgNet, monthCount: payslips.length };
  }, [payslips]);

  /* ─── Handlers ─── */
  const handleLeaveRequest = useCallback(async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      showSnackbar('يرجى تحديد تاريخ البداية والنهاية', 'warning');
      return;
    }
    if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
      showSnackbar('تاريخ النهاية يجب أن يكون بعد تاريخ البداية', 'warning');
      return;
    }
    const days =
      Math.ceil((new Date(leaveForm.endDate) - new Date(leaveForm.startDate)) / 86400000) + 1;
    const balance = leaveBalances[leaveForm.type];
    if (balance && days > balance.remaining) {
      showSnackbar(`الرصيد المتبقي (${balance.remaining} يوم) لا يكفي لـ ${days} أيام`, 'warning');
      return;
    }
    try {
      const res = await employeePortalService.requestLeave(leaveForm);
      const newLeave = res.data || {
        ...leaveForm,
        _id: `l-${Date.now()}`,
        days,
        status: 'pending',
      };
      setLeaveHistory(prev => [...prev, newLeave]);
      showSnackbar('تم تقديم طلب الإجازة بنجاح', 'success');
    } catch {
      setLeaveHistory(prev => [
        ...prev,
        { ...leaveForm, _id: `l-${Date.now()}`, days, status: 'pending' },
      ]);
      showSnackbar('تم حفظ الطلب محلياً — الخادم غير متصل', 'warning');
    }
    setLeaveDialogOpen(false);
    setLeaveForm({ type: 'annual', startDate: '', endDate: '', reason: '' });
  }, [leaveForm, leaveBalances, showSnackbar]);

  const handleRequest = useCallback(async () => {
    if (!requestForm.description.trim()) {
      showSnackbar('يرجى إدخال وصف الطلب', 'warning');
      return;
    }
    try {
      const res = await employeePortalService.submitRequest(requestForm);
      const newReq = res.data || {
        ...requestForm,
        _id: `req-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setRequests(prev => [...prev, newReq]);
      showSnackbar('تم تقديم الطلب بنجاح', 'success');
    } catch {
      setRequests(prev => [
        ...prev,
        {
          ...requestForm,
          _id: `req-${Date.now()}`,
          status: 'pending',
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);
      showSnackbar('تم حفظ الطلب محلياً — الخادم غير متصل', 'warning');
    }
    setRequestDialogOpen(false);
    setRequestForm({ type: 'salary_certificate', description: '' });
  }, [requestForm, showSnackbar]);

  const handlePrint = useCallback(() => window.print(), []);

  /* ─── Tab Definitions ─── */
  const TABS = [
    {
      icon: <PersonIcon />,
      label: 'الملف الشخصي',
      content: () => (
        <ProfileTab
          profile={profile}
          leaveStats={leaveStats}
          requests={requests}
          payrollSummary={payrollSummary}
          documents={documents}
          deptColor={deptColor}
        />
      ),
    },
    {
      icon: <LeaveIcon />,
      label: 'الإجازات',
      content: () => (
        <LeavesTab
          leaveBalances={leaveBalances}
          leaveHistory={leaveHistory}
          onOpenLeaveDialog={() => setLeaveDialogOpen(true)}
        />
      ),
    },
    {
      icon: <PayslipIcon />,
      label: 'كشوف الرواتب',
      content: () => (
        <PayslipsTab
          payslips={payslips}
          payrollSummary={payrollSummary}
          onViewPayslip={p => {
            setSelectedPayslip(p);
            setPayslipDetailOpen(true);
          }}
          onPrint={handlePrint}
        />
      ),
    },
    {
      icon: <DocIcon />,
      label: 'المستندات',
      content: () => <DocumentsTab documents={documents} />,
    },
    {
      icon: <RequestIcon />,
      label: 'الطلبات',
      content: () => (
        <RequestsTab requests={requests} onOpenDialog={() => setRequestDialogOpen(true)} />
      ),
    },
  ];

  /* ─── Main Render ─── */
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BadgeIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              بوابة الموظف
            </Typography>
            <Typography variant="body2">إدارة البيانات الشخصية والخدمات الذاتية</Typography>
          </Box>
        </Box>
      </Box>

      {/* Header Banner */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${deptColor}ee, ${deptColor}99)`,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: 36,
              border: '3px solid rgba(255,255,255,0.5)',
            }}
          >
            {profile.name?.[0] || 'م'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {profile.name}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={profile.position}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={profile.department}
                size="small"
                icon={<DeptIcon sx={{ color: '#fff !important' }} />}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip
                label={profile.empId}
                size="small"
                icon={<BadgeIcon sx={{ color: '#fff !important' }} />}
                sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white' }}
              />
            </Stack>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.5)',
              '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
            }}
          >
            طباعة
          </Button>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontWeight: 'bold', minHeight: 56 } }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} icon={t.icon} label={t.label} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {TABS[tab]?.content()}

      {/* Dialogs */}
      <LeaveDialog
        open={leaveDialogOpen}
        onClose={() => setLeaveDialogOpen(false)}
        leaveForm={leaveForm}
        setLeaveForm={setLeaveForm}
        leaveBalances={leaveBalances}
        onSubmit={handleLeaveRequest}
      />
      <RequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        requestForm={requestForm}
        setRequestForm={setRequestForm}
        onSubmit={handleRequest}
      />
      <PayslipDetailDialog
        open={payslipDetailOpen}
        onClose={() => setPayslipDetailOpen(false)}
        payslip={selectedPayslip}
      />
    </Box>
  );
}

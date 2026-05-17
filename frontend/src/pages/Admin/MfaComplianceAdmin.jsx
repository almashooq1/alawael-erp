/**
 * MfaComplianceAdmin.jsx — امتثال المصادقة الثنائية على مستوى المؤسسة (BC-01 High P1)
 *
 * Backend:
 *   GET  /api/admin/users?limit=300  — user list with mfa.enabled, mfa.enabledAt
 *   PATCH /api/admin/users/:id/mfa/reset — admin resets MFA for a user
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Security,
  LockReset,
  CheckCircle,
  Cancel,
  Warning,
  Refresh,
  AdminPanelSettings,
  Person,
  Group,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import authHeader from '../../utils/authHeader';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ─── API ────────────────────────────────────────────────────────────────── */
const BASE_USERS = '/api/admin/users';
const apiUsers = () =>
  fetch(`${BASE_USERS}?limit=300`, { headers: authHeader() }).then(r => r.json());
const apiMfaReset = (id, reason) =>
  fetch(`${BASE_USERS}/${id}/mfa/reset`, {
    method: 'PATCH',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }).then(r => r.json());

/* ─── Demo fallback ──────────────────────────────────────────────────────── */
const DEMO_USERS = [
  {
    _id: 'u1',
    name: 'أحمد المنصور',
    email: 'ahmed@rehab.sa',
    role: 'admin',
    mfa: { enabled: false },
  },
  {
    _id: 'u2',
    name: 'فاطمة العمري',
    email: 'fatima@rehab.sa',
    role: 'manager',
    mfa: { enabled: false },
  },
  {
    _id: 'u3',
    name: 'خالد السعيد',
    email: 'khaled@rehab.sa',
    role: 'therapist',
    mfa: { enabled: true, enabledAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  },
  {
    _id: 'u4',
    name: 'نورا الراشد',
    email: 'nora@rehab.sa',
    role: 'therapist',
    mfa: { enabled: true, enabledAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  },
  { _id: 'u5', name: 'عمر الحربي', email: 'omar@rehab.sa', role: 'hr', mfa: { enabled: false } },
  {
    _id: 'u6',
    name: 'سارة الغامدي',
    email: 'sara@rehab.sa',
    role: 'finance',
    mfa: { enabled: true, enabledAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  },
  {
    _id: 'u7',
    name: 'يوسف القحطاني',
    email: 'yousef@rehab.sa',
    role: 'auditor',
    mfa: { enabled: true, enabledAt: new Date(Date.now() - 5 * 86400000).toISOString() },
  },
  {
    _id: 'u8',
    name: 'منى الدوسري',
    email: 'mona@rehab.sa',
    role: 'case_manager',
    mfa: { enabled: false },
  },
  {
    _id: 'u9',
    name: 'بدر الزهراني',
    email: 'badr@rehab.sa',
    role: 'super_admin',
    mfa: { enabled: true, enabledAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  },
  {
    _id: 'u10',
    name: 'ريم المطيري',
    email: 'reem@rehab.sa',
    role: 'compliance_officer',
    mfa: { enabled: false },
  },
];

/* ─── Role labels ────────────────────────────────────────────────────────── */
const ROLE_LABELS = {
  admin: 'مسؤول',
  super_admin: 'مسؤول عام',
  manager: 'مدير',
  therapist: 'معالج',
  case_manager: 'مدير حالة',
  hr: 'موارد بشرية',
  hr_manager: 'مدير موارد',
  finance: 'مالية',
  auditor: 'مدقق',
  compliance_officer: 'مسؤول امتثال',
  receptionist: 'استقبال',
  doctor: 'طبيب',
  nurse: 'ممرض',
  parent: 'ولي أمر',
  guardian: 'وصي',
};

/* Critical roles that MUST have MFA */
const CRITICAL_ROLES = [
  'admin',
  'super_admin',
  'manager',
  'auditor',
  'compliance_officer',
  'finance',
];

const TABS = ['الكل', 'مُفعَّل', 'غير مُفعَّل'];

/* ─── KPI Card ─────────────────────────────────────────────────────────── */
function KPICard({ icon, title, value, subValue, color }) {
  return (
    <Card
      sx={{
        flex: 1,
        minWidth: 140,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
        border: `1px solid ${color}44`,
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
        <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        {subValue !== undefined && (
          <Typography variant="body2" fontWeight={600} sx={{ color }}>
            {subValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function MfaComplianceAdmin() {
  const { showSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [roleFilter, setRoleFilter] = useState('');
  const [resetTarget, setResetTarget] = useState(null);
  const [resetReason, setResetReason] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiUsers();
      if (res.success && (res.users?.length >= 0 || res.data?.users?.length >= 0)) {
        setUsers(res.users || res.data?.users || []);
      } else {
        setUsers(DEMO_USERS);
      }
    } catch {
      setUsers(DEMO_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── KPIs ── */
  const total = users.length;
  const enabled = users.filter(u => u.mfa?.enabled).length;
  const disabled = total - enabled;
  const rate = total ? Math.round((enabled / total) * 100) : 0;
  const criticalWithoutMfa = users.filter(u => CRITICAL_ROLES.includes(u.role) && !u.mfa?.enabled);

  /* ── Filter ── */
  const filtered = users.filter(u => {
    const tabOk = tab === 0 ? true : tab === 1 ? u.mfa?.enabled : !u.mfa?.enabled;
    const roleOk = !roleFilter || u.role === roleFilter;
    return tabOk && roleOk;
  });

  /* ── Role breakdown ── */
  const roleStats = Object.entries(
    users.reduce((acc, u) => {
      if (!acc[u.role]) acc[u.role] = { total: 0, enabled: 0 };
      acc[u.role].total++;
      if (u.mfa?.enabled) acc[u.role].enabled++;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total - a[1].total);

  /* ── Reset ── */
  const handleReset = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const res = await apiMfaReset(resetTarget._id, resetReason || 'إعادة تعيين من قبل المسؤول');
      if (res.success) {
        setUsers(prev =>
          prev.map(u => (u._id === resetTarget._id ? { ...u, mfa: { enabled: false } } : u))
        );
        showSnackbar('تمت إعادة تعيين المصادقة الثنائية بنجاح', 'success');
      } else {
        showSnackbar(res.message || 'فشل إعادة التعيين', 'error');
      }
    } catch {
      showSnackbar('خطأ في إعادة التعيين', 'error');
    } finally {
      setResetTarget(null);
      setResetReason('');
      setResetLoading(false);
    }
  };

  const allRoles = [...new Set(users.map(u => u.role))].sort();
  const fmt = d => (d ? _fmtDate(d) : '—');

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }} dir="rtl">
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Security sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            امتثال المصادقة الثنائية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراقبة تفعيل المصادقة الثنائية (MFA) على مستوى المؤسسة
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="تحديث">
          <IconButton onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Critical role warning ── */}
      {!loading && criticalWithoutMfa.length > 0 && (
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
          <strong>تحذير:</strong> {criticalWithoutMfa.length} مستخدم من الأدوار الحرجة بدون مصادقة
          ثنائية:&nbsp;
          {criticalWithoutMfa.map(u => u.name).join('، ')}
        </Alert>
      )}

      {/* ── KPI Cards ── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <KPICard
          icon={<Group fontSize="large" />}
          title="إجمالي المستخدمين"
          value={total}
          color="#1976d2"
        />
        <KPICard
          icon={<CheckCircle fontSize="large" />}
          title="MFA مُفعَّل"
          value={enabled}
          subValue={`${rate}%`}
          color="#4caf50"
        />
        <KPICard
          icon={<Cancel fontSize="large" />}
          title="MFA غير مُفعَّل"
          value={disabled}
          color="#f44336"
        />
        <KPICard
          icon={<AdminPanelSettings fontSize="large" />}
          title="أدوار حرجة بدون MFA"
          value={criticalWithoutMfa.length}
          color={criticalWithoutMfa.length ? '#f44336' : '#4caf50'}
        />
      </Box>

      {/* ── Adoption bar ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            معدل اعتماد MFA
          </Typography>
          <Typography
            variant="body2"
            fontWeight={700}
            color={rate >= 80 ? 'success.main' : rate >= 50 ? 'warning.main' : 'error.main'}
          >
            {rate}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={rate}
          color={rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'error'}
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          الهدف: 100% للأدوار الحرجة، 80%+ للكل
        </Typography>
      </Paper>

      {/* ── Role breakdown accordion ── */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          <Group fontSize="small" sx={{ mr: 0.5 }} />
          توزيع MFA حسب الدور
        </Typography>
        <List dense disablePadding>
          {roleStats.map(([role, stat]) => (
            <ListItem key={role} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {CRITICAL_ROLES.includes(role) ? (
                  <AdminPanelSettings fontSize="small" color="warning" />
                ) : (
                  <Person fontSize="small" color="action" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={ROLE_LABELS[role] || role}
                primaryTypographyProps={{ variant: 'body2' }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={stat.total ? (stat.enabled / stat.total) * 100 : 0}
                  color={stat.enabled === stat.total ? 'success' : 'warning'}
                  sx={{ width: 80, height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption">
                  {stat.enabled}/{stat.total}
                </Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* ── Filter + Tabs ── */}
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ px: 2, pt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>تصفية حسب الدور</InputLabel>
            <Select
              value={roleFilter}
              label="تصفية حسب الدور"
              onChange={e => setRoleFilter(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {allRoles.map(r => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABELS[r] || r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          {TABS.map((t, i) => (
            <Tab key={i} label={t} />
          ))}
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* ── Table ── */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>حالة MFA</TableCell>
              <TableCell>تاريخ التفعيل</TableCell>
              <TableCell align="center">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">لا توجد نتائج</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(user => (
                <TableRow
                  key={user._id}
                  hover
                  sx={{
                    bgcolor:
                      CRITICAL_ROLES.includes(user.role) && !user.mfa?.enabled
                        ? 'error.50'
                        : 'inherit',
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                  <TableCell dir="ltr" sx={{ fontSize: 12 }}>
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[user.role] || user.role}
                      size="small"
                      color={CRITICAL_ROLES.includes(user.role) ? 'warning' : 'default'}
                      icon={
                        CRITICAL_ROLES.includes(user.role) ? (
                          <AdminPanelSettings fontSize="small" />
                        ) : (
                          <Person fontSize="small" />
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.mfa?.enabled ? 'مُفعَّل' : 'غير مُفعَّل'}
                      color={user.mfa?.enabled ? 'success' : 'error'}
                      size="small"
                      icon={
                        user.mfa?.enabled ? (
                          <CheckCircle fontSize="small" />
                        ) : (
                          <Cancel fontSize="small" />
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{fmt(user.mfa?.enabledAt)}</TableCell>
                  <TableCell align="center">
                    {user.mfa?.enabled && (
                      <Tooltip title="إعادة تعيين MFA">
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => {
                            setResetTarget(user);
                            setResetReason('');
                          }}
                        >
                          <LockReset fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Reset MFA Dialog ── */}
      <Dialog open={!!resetTarget} onClose={() => setResetTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockReset color="warning" />
          إعادة تعيين المصادقة الثنائية
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إلغاء إعداد MFA للمستخدم <strong>{resetTarget?.name}</strong>. سيحتاج إعادة التفعيل
            عند الدخول التالي.
          </Alert>
          <TextField
            fullWidth
            label="سبب إعادة التعيين"
            value={resetReason}
            onChange={e => setResetReason(e.target.value)}
            placeholder="مثال: فقدان الجهاز، طلب المستخدم..."
            multiline
            rows={2}
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetTarget(null)}>إلغاء</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={handleReset}
            disabled={resetLoading}
            startIcon={resetLoading ? <CircularProgress size={16} /> : <LockReset />}
          >
            تأكيد إعادة التعيين
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

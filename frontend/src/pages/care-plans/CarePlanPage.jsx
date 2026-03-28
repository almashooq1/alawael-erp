/**
 * Care Plan Management Page — إدارة خطط الرعاية
 * AlAwael ERP
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
} from '@mui/material';
import {
  Assignment as PlanIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Archive as ArchiveIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Dashboard as StatsIcon,
} from '@mui/icons-material';
import carePlanService from '../../services/carePlanService';

// ── Status Helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT: { label: 'مسودة', color: 'default', icon: '📝' },
  ACTIVE: { label: 'نشطة', color: 'success', icon: '✅' },
  UNDER_REVIEW: { label: 'قيد المراجعة', color: 'warning', icon: '🔍' },
  ARCHIVED: { label: 'مؤرشفة', color: 'error', icon: '📦' },
};

const getStatus = status => STATUS_CONFIG[status] || { label: status, color: 'default', icon: '❓' };

export default function CarePlanPage() {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    planNumber: '',
    beneficiary: '',
    startDate: '',
    reviewDate: '',
    notes: '',
  });

  // ── Fetch Data ──────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statusFilter =
        tab === 1 ? 'ACTIVE' : tab === 2 ? 'DRAFT' : tab === 3 ? 'ARCHIVED' : undefined;
      const res = await carePlanService.getAll({ status: statusFilter, limit: 50 });
      setPlans(res.data?.data || res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب خطط الرعاية');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await carePlanService.getStats();
      setStats(res.data?.data || res.data);
    } catch {
      // stats are optional
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchStats();
  }, [fetchPlans, fetchStats]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      await carePlanService.create(form);
      setDialogOpen(false);
      setForm({ planNumber: '', beneficiary: '', startDate: '', reviewDate: '', notes: '' });
      fetchPlans();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في إنشاء خطة الرعاية');
    }
  };

  const handleActivate = async id => {
    try {
      await carePlanService.activate(id);
      fetchPlans();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تفعيل الخطة');
    }
  };

  const handleArchive = async id => {
    try {
      await carePlanService.archive(id);
      fetchPlans();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في أرشفة الخطة');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PlanIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            إدارة خطط الرعاية
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} onClick={fetchPlans} variant="outlined" size="small">
            تحديث
          </Button>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
            variant="contained"
            color="primary"
          >
            خطة جديدة
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي الخطط', value: stats.total || 0, icon: <StatsIcon />, color: '#1976d2' },
            { label: 'نشطة', value: stats.active || 0, icon: <ActiveIcon />, color: '#2e7d32' },
            { label: 'مسودات', value: stats.draft || 0, icon: <EditIcon />, color: '#ed6c02' },
            { label: 'مؤرشفة', value: stats.archived || 0, icon: <ArchiveIcon />, color: '#d32f2f' },
          ].map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight="bold">
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="الكل" />
        <Tab label="نشطة" />
        <Tab label="مسودات" />
        <Tab label="مؤرشفة" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Plans Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم الخطة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>تاريخ البداية</TableCell>
              <TableCell>تاريخ المراجعة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    لا توجد خطط رعاية
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              plans.map(plan => {
                const st = getStatus(plan.status);
                return (
                  <TableRow key={plan._id} hover>
                    <TableCell>{plan.planNumber || '—'}</TableCell>
                    <TableCell>
                      {plan.beneficiary?.name || plan.beneficiary?.fullName || plan.beneficiary || '—'}
                    </TableCell>
                    <TableCell>
                      {plan.startDate ? new Date(plan.startDate).toLocaleDateString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>
                      {plan.reviewDate ? new Date(plan.reviewDate).toLocaleDateString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" title="عرض">
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        {plan.status === 'DRAFT' && (
                          <IconButton
                            size="small"
                            color="success"
                            title="تفعيل"
                            onClick={() => handleActivate(plan._id)}
                          >
                            <ActiveIcon fontSize="small" />
                          </IconButton>
                        )}
                        {plan.status === 'ACTIVE' && (
                          <IconButton
                            size="small"
                            color="warning"
                            title="أرشفة"
                            onClick={() => handleArchive(plan._id)}
                          >
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء خطة رعاية جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="رقم الخطة"
              value={form.planNumber}
              onChange={e => setForm(f => ({ ...f, planNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label="معرّف المستفيد"
              value={form.beneficiary}
              onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))}
              fullWidth
            />
            <TextField
              label="تاريخ البداية"
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="تاريخ المراجعة"
              type="date"
              value={form.reviewDate}
              onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

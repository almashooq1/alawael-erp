/**
 * EpisodeCenterPage — مركز الحلقة العلاجية الموحدة
 *
 * يتيح للأخصائي والمشرف الإكلينيكي:
 *  Tab 0 — لوحة التحكم (KPIs + توزيع الحلقات)
 *  Tab 1 — قائمة الحلقات (مع فلترة وبحث)
 *  Tab 2 — إنشاء حلقة علاجية جديدة
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  TextField,
  LinearProgress,
  Alert,
  Avatar,
  Tooltip,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  FolderOpen as EpisodeIcon,
  Dashboard as DashboardIcon,
  List as ListIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ArrowForward as PhaseIcon,
  Group as _TeamIcon,
  CheckCircle as ActiveIcon,
  Schedule as PendingIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { episodeCenterAPI } from '../../services/ddd';

/* ── palette ─────────────────────────────────────────────────────────── */
const PRIMARY = '#4a148c';
const BG = '#f3e5f5';

/* ── helpers ─────────────────────────────────────────────────────────── */
const STATUS_COLORS = {
  active: 'success',
  pending: 'warning',
  completed: 'default',
  suspended: 'error',
  discharged: 'info',
};

const STATUS_LABELS = {
  active: 'نشطة',
  pending: 'قيد الانتظار',
  completed: 'مكتملة',
  suspended: 'موقوفة',
  discharged: 'مُخرَّجة',
};

function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card elevation={2} sx={{ borderTop: `4px solid ${color || PRIMARY}` }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ bgcolor: color || PRIMARY, width: 44, height: 44 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {value ?? '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 0 — Dashboard
 * ════════════════════════════════════════════════════════════════════════ */
function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await episodeCenterAPI.dashboard();
      setData(res.data?.data || res.data);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};
  const byStatus = data?.byStatus || [];
  const byType = data?.byType || [];
  const byPhase = data?.byPhase || [];

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />} size="small">
          تحديث
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="إجمالي الحلقات"
            value={kpis.total}
            icon={<EpisodeIcon />}
            color="#4a148c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="الحلقات النشطة"
            value={kpis.active}
            icon={<ActiveIcon />}
            color="#1b5e20"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="قيد الانتظار"
            value={kpis.pending}
            icon={<PendingIcon />}
            color="#e65100"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="مكتملة" value={kpis.completed} icon={<TimelineIcon />} color="#0d47a1" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {byStatus.length > 0 && (
          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardHeader
                title="توزيع حسب الحالة"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              />
              <CardContent>
                <Stack spacing={1}>
                  {byStatus.map(item => (
                    <Stack
                      key={item.status}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Chip
                        label={STATUS_LABELS[item.status] || item.status}
                        color={STATUS_COLORS[item.status] || 'default'}
                        size="small"
                      />
                      <Typography fontWeight={700}>{item.count}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {byType.length > 0 && (
          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardHeader
                title="توزيع حسب النوع"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              />
              <CardContent>
                <Stack spacing={1}>
                  {byType.map(item => (
                    <Stack
                      key={item.type}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">{item.type}</Typography>
                      <Chip label={item.count} size="small" color="primary" variant="outlined" />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {byPhase.length > 0 && (
          <Grid item xs={12} md={4}>
            <Card elevation={1}>
              <CardHeader
                title="توزيع حسب المرحلة"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
              />
              <CardContent>
                <Stack spacing={1}>
                  {byPhase.map(item => (
                    <Stack
                      key={item.phase}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">{item.phase}</Typography>
                      <Chip label={item.count} size="small" color="secondary" variant="outlined" />
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {!loading && !data && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
          <EpisodeIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
          <Typography color="text.secondary" mt={1}>
            لا توجد بيانات حلقات علاجية
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 1 — Episodes List
 * ════════════════════════════════════════════════════════════════════════ */
function EpisodesListTab({ onAdvancePhase }) {
  const [episodes, setEpisodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [filters, setFilters] = useState({ status: '', type: '', priority: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      };
      const res = await episodeCenterAPI.list(params);
      setEpisodes(res.data?.episodes || res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          select
          label="الحالة"
          size="small"
          value={filters.status}
          onChange={e => {
            setFilters(p => ({ ...p, status: e.target.value }));
            setPage(0);
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <MenuItem key={v} value={v}>
              {l}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="النوع"
          size="small"
          value={filters.type}
          onChange={e => {
            setFilters(p => ({ ...p, type: e.target.value }));
            setPage(0);
          }}
        />
        <TextField
          select
          label="الأولوية"
          size="small"
          value={filters.priority}
          onChange={e => {
            setFilters(p => ({ ...p, priority: e.target.value }));
            setPage(0);
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">الكل</MenuItem>
          <MenuItem value="high">عالية</MenuItem>
          <MenuItem value="medium">متوسطة</MenuItem>
          <MenuItem value="low">منخفضة</MenuItem>
        </TextField>
        <Tooltip title="تحديث">
          <IconButton onClick={load} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {episodes.length > 0 ? (
        <Paper elevation={1} sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: PRIMARY }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المستفيد</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>نوع الحلقة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>المرحلة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>الأولوية</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>تاريخ البدء</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {episodes.map(ep => (
                <TableRow key={ep._id || ep.id} hover>
                  <TableCell>
                    {ep.beneficiaryName || ep.beneficiary?.name || ep.beneficiaryId}
                  </TableCell>
                  <TableCell>{ep.type}</TableCell>
                  <TableCell>
                    <Chip
                      label={ep.currentPhase || ep.phase}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[ep.status] || ep.status}
                      size="small"
                      color={STATUS_COLORS[ep.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[ep.priority] ||
                        ep.priority
                      }
                      size="small"
                      color={
                        ep.priority === 'high'
                          ? 'error'
                          : ep.priority === 'medium'
                            ? 'warning'
                            : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{ep.startDate?.slice(0, 10) || ep.createdAt?.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Tooltip title="تقدم للمرحلة التالية">
                      <span>
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={ep.status !== 'active'}
                          onClick={() => onAdvancePhase(ep._id || ep.id)}
                        >
                          <PhaseIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => {
              setRowsPerPage(+e.target.value);
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="صفوف:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          />
        </Paper>
      ) : (
        !loading && (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: BG }}>
            <EpisodeIcon sx={{ fontSize: 56, color: PRIMARY, opacity: 0.4 }} />
            <Typography color="text.secondary" mt={1}>
              لا توجد حلقات علاجية مطابقة
            </Typography>
          </Paper>
        )
      )}
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Tab 2 — Create Episode
 * ════════════════════════════════════════════════════════════════════════ */
const EMPTY_FORM = {
  beneficiaryId: '',
  type: '',
  priority: 'medium',
  notes: '',
};

function CreateEpisodeTab({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!form.beneficiaryId || !form.type) {
      setError('معرّف المستفيد ونوع الحلقة مطلوبان');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await episodeCenterAPI.create(form);
      setSuccess(true);
      setForm(EMPTY_FORM);
      if (onCreated) onCreated();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={600}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          تم إنشاء الحلقة العلاجية بنجاح
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          title="إنشاء حلقة علاجية جديدة"
          subheader="أدخل بيانات الحلقة الأساسية — يمكن تفصيلها لاحقاً"
          titleTypographyProps={{ fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <TextField
              required
              label="معرّف المستفيد (Beneficiary ID)"
              size="small"
              value={form.beneficiaryId}
              onChange={e => setForm(p => ({ ...p, beneficiaryId: e.target.value }))}
              fullWidth
            />
            <TextField
              required
              select
              label="نوع الحلقة"
              size="small"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              fullWidth
            >
              <MenuItem value="rehabilitation">تأهيل</MenuItem>
              <MenuItem value="assessment">تقييم</MenuItem>
              <MenuItem value="maintenance">صيانة مهارية</MenuItem>
              <MenuItem value="crisis">تدخل أزمة</MenuItem>
              <MenuItem value="transition">انتقال</MenuItem>
            </TextField>
            <TextField
              select
              label="الأولوية"
              size="small"
              value={form.priority}
              onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              fullWidth
            >
              <MenuItem value="high">عالية</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="low">منخفضة</MenuItem>
            </TextField>
            <TextField
              label="ملاحظات (اختياري)"
              size="small"
              multiline
              rows={3}
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              fullWidth
            />
          </Stack>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ bgcolor: PRIMARY }}
          >
            إنشاء الحلقة
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Advance Phase Dialog
 * ════════════════════════════════════════════════════════════════════════ */
function AdvancePhaseDialog({ episodeId, open, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await episodeCenterAPI.advancePhase(episodeId, notes);
      onDone();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>تقدم للمرحلة التالية</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="ملاحظات الانتقال (اختياري)"
          multiline
          rows={3}
          fullWidth
          size="small"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <PhaseIcon />}
        >
          تأكيد
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * Root Page
 * ════════════════════════════════════════════════════════════════════════ */
export default function EpisodeCenterPage() {
  const [tab, setTab] = useState(0);
  const [advanceTarget, setAdvanceTarget] = useState(null);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <EpisodeIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={PRIMARY}>
            مركز الحلقة العلاجية الموحدة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة الحلقات العلاجية الطولية — المراحل — الفريق — المخرجات
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<DashboardIcon />} iconPosition="start" label="لوحة التحكم" />
          <Tab icon={<ListIcon />} iconPosition="start" label="الحلقات" />
          <Tab icon={<AddIcon />} iconPosition="start" label="حلقة جديدة" />
        </Tabs>
      </Paper>

      {tab === 0 && <DashboardTab />}
      {tab === 1 && <EpisodesListTab onAdvancePhase={id => setAdvanceTarget(id)} />}
      {tab === 2 && <CreateEpisodeTab onCreated={() => setTab(1)} />}

      {advanceTarget && (
        <AdvancePhaseDialog
          episodeId={advanceTarget}
          open={Boolean(advanceTarget)}
          onClose={() => setAdvanceTarget(null)}
          onDone={() => setAdvanceTarget(null)}
        />
      )}
    </Box>
  );
}

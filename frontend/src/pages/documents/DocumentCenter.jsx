/**
 * DocumentCenter — مركز إدارة الوثائق الاحترافي الموحد
 * ══════════════════════════════════════════════════════════
 * واجهة شاملة تجمع كل وظائف إدارة الوثائق في مكان واحد:
 *  - لوحة التحكم الذكية
 *  - مكتبة المستندات
 *  - سير العمل والموافقات
 *  - الذكاء الاصطناعي والتصنيف
 *  - التقارير والتحليلات
 *  - رادار انتهاء الصلاحية
 *  - الأرشيف
 * ══════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, useCallback, useRef, useMemo as _useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  MenuItem,
  InputAdornment,
  CircularProgress,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Badge as _Badge,
  Divider,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Menu,
  ListItemText as MuiListItemText,
  ListItemIcon,
  useTheme,
  useMediaQuery,
  Fade as _Fade,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashIcon,
  LibraryBooks as LibIcon,
  AccountTree as WfIcon,
  AutoAwesome as AIIcon,
  BarChart as ReportIcon,
  Archive as _ArchiveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Add as _AddIcon,
  FilterList as _FilterIcon,
  MoreVert as MoreVertIcon,
  CloudUpload as UploadIcon,
  Description as DocIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  TableChart as SheetIcon,
  Slideshow as SlidesIcon,
  Folder as FolderIcon,
  CheckCircle as CheckIcon,
  Warning as _WarnIcon,
  Error as _ErrorIcon,
  Schedule as _ClockIcon,
  TrendingUp as TrendIcon,
  Security as _SecIcon,
  Psychology as _SmartIcon,
  ContentCopy as _DupeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  DriveFileMove as ArchBtn,
  Restore as _RestoreIcon,
  Download as _DownloadIcon,
  Visibility as ViewIcon,
  Edit as _EditIcon,
  Close as CloseIcon,
  Link as _LinkIcon,
  Timer as TimerIcon,
  NotificationsActive as AlertIcon,
  Analytics as _AnalyticsIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  SelectAll as _SelectAllIcon,
  BubbleChart as _BubbleIcon,
  LightbulbOutlined as _InsightIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  LineChart as _LineChart,
  Line as _Line,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import svc from '../../services/documentCenterService';
import logger from '../../utils/logger';

// ── Theme colors ──────────────────────────────────────────────
const C = {
  blue: '#2563EB',
  sky: '#0EA5E9',
  purple: '#7C3AED',
  green: '#059669',
  teal: '#0D9488',
  lime: '#65A30D',
  orange: '#EA580C',
  red: '#DC2626',
  pink: '#DB2777',
  gray: '#6B7280',
  slate: '#475569',
};

const CHART_PALETTE = [C.blue, C.green, C.purple, C.orange, C.teal, C.red, C.pink, C.lime];

const WORKFLOW_LABELS = {
  draft: { label: 'مسودة', color: C.gray },
  pending_review: { label: 'قيد المراجعة', color: C.orange },
  reviewed: { label: 'مراجع', color: C.sky },
  revision_required: { label: 'يحتاج تعديل', color: C.red },
  pending_approval: { label: 'قيد الاعتماد', color: C.purple },
  approved: { label: 'معتمد', color: C.green },
  rejected: { label: 'مرفوض', color: C.red },
  published: { label: 'منشور', color: C.teal },
  archived: { label: 'مؤرشف', color: C.gray },
  cancelled: { label: 'ملغي', color: C.gray },
};

const URGENCY_COLORS = {
  critical: C.red,
  high: C.orange,
  medium: '#D97706',
  low: C.green,
};

// ── Micro helpers ─────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function FileIcon({ type, size = 'small' }) {
  const sz = size === 'small' ? 18 : 28;
  const icons = {
    pdf: <PdfIcon sx={{ fontSize: sz, color: '#DC2626' }} />,
    jpg: <ImageIcon sx={{ fontSize: sz, color: '#7C3AED' }} />,
    jpeg: <ImageIcon sx={{ fontSize: sz, color: '#7C3AED' }} />,
    png: <ImageIcon sx={{ fontSize: sz, color: '#7C3AED' }} />,
    xls: <SheetIcon sx={{ fontSize: sz, color: '#059669' }} />,
    xlsx: <SheetIcon sx={{ fontSize: sz, color: '#059669' }} />,
    ppt: <SlidesIcon sx={{ fontSize: sz, color: '#EA580C' }} />,
    pptx: <SlidesIcon sx={{ fontSize: sz, color: '#EA580C' }} />,
  };
  return icons[type] || <DocIcon sx={{ fontSize: sz, color: C.blue }} />;
}

function WorkflowBadge({ status }) {
  const s = WORKFLOW_LABELS[status] || { label: status || '—', color: C.gray };
  return (
    <Chip
      label={s.label}
      size="small"
      sx={{ bgcolor: `${s.color}18`, color: s.color, fontWeight: 600, fontSize: 11 }}
    />
  );
}

function UrgencyBadge({ urgency, daysLeft }) {
  const color = URGENCY_COLORS[urgency] || C.gray;
  return (
    <Chip
      icon={<TimerIcon sx={{ fontSize: 13 }} />}
      label={`${daysLeft} يوم`}
      size="small"
      sx={{ bgcolor: `${color}18`, color, fontWeight: 700, fontSize: 11 }}
    />
  );
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, icon, color = C.blue, loading, trend }) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
        transition: 'all .25s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {loading ? (
          <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2 }} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1, mt: 0.5 }}>
                {typeof value === 'number' ? value.toLocaleString('ar-SA') : (value ?? '—')}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
              {trend !== undefined && (
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    icon={<TrendIcon sx={{ fontSize: 12 }} />}
                    label={trend}
                    size="small"
                    sx={{ bgcolor: `${color}15`, color, fontSize: 10, height: 20 }}
                  />
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: `${color}15`, color, width: 46, height: 46 }}>{icon}</Avatar>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Health Gauge ─────────────────────────────────────────────
function HealthGauge({ score, loading }) {
  if (loading) return <Skeleton variant="circular" width={100} height={100} />;
  const color = score >= 80 ? C.green : score >= 60 ? C.orange : C.red;
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={score}
        size={100}
        thickness={5}
        sx={{ color }}
      />
      <CircularProgress
        variant="determinate"
        value={100}
        size={100}
        thickness={5}
        sx={{ color: 'divider', position: 'absolute', top: 0, left: 0 }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" fontWeight={800} sx={{ color }}>
          {score}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          صحة
        </Typography>
      </Box>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 0: DASHBOARD ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function DashboardTab({ onNavigate }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData((await svc.getDashboard()).data);
    } catch (e) {
      setError(e.message);
      logger.error('Dashboard:', e);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis || {};

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          لوحة التحكم الذكية
        </Typography>
        <Button startIcon={<RefreshIcon />} size="small" onClick={load} disabled={busy}>
          تحديث
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { title: 'إجمالي المستندات', value: kpis.total, icon: <DocIcon />, color: C.blue },
          { title: 'نشط', value: kpis.active, icon: <CheckIcon />, color: C.green },
          { title: 'تنتهي قريباً', value: kpis.expiringSoon, icon: <TimerIcon />, color: C.orange },
          { title: 'قيد الموافقة', value: kpis.pendingWorkflow, icon: <WfIcon />, color: C.purple },
          { title: 'أولوية عاجلة', value: kpis.highPriority, icon: <AlertIcon />, color: C.red },
          {
            title: 'مساحة التخزين',
            value: kpis.storageFormatted,
            icon: <FolderIcon />,
            color: C.teal,
          },
        ].map((kpi, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <KpiCard {...kpi} loading={busy} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Category Pie */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 300,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              توزيع الفئات
            </Typography>
            {busy ? (
              <Skeleton height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={data?.categoryStats || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                  >
                    {(data?.categoryStats || []).map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Upload trend */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 300,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              اتجاه الرفع (30 يوم)
            </Typography>
            {busy ? (
              <Skeleton height={250} />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={data?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="_id" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={C.blue}
                    fill={`${C.blue}20`}
                    name="مستندات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Health + workflow */}
        <Grid item xs={12} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            <HealthGauge score={kpis.healthScore || 0} loading={busy} />
            <Stack spacing={0.5} sx={{ width: '100%' }}>
              {[
                { label: 'قيد المراجعة', val: kpis.pendingWorkflow, color: C.orange },
                { label: 'حرجة الانتهاء', val: kpis.criticalExpiry, color: C.red },
                { label: 'OCR معلّق', val: kpis.ocrPending, color: C.purple },
              ].map((r, i) => (
                <Box
                  key={i}
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {r.label}
                  </Typography>
                  <Chip
                    label={busy ? '…' : (r.val ?? 0)}
                    size="small"
                    sx={{
                      bgcolor: `${r.color}15`,
                      color: r.color,
                      fontSize: 11,
                      height: 20,
                      fontWeight: 700,
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Recent docs */}
        <Grid item xs={12} md={7}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                أحدث المستندات
              </Typography>
              <Button size="small" onClick={() => onNavigate(1)}>
                عرض الكل
              </Button>
            </Box>
            {busy ? (
              <Skeleton height={180} />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>الفئة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.recentDocuments || []).slice(0, 6).map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileIcon type={d.fileType} />
                          <Typography variant="caption" noWrap>
                            {d.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{d.category}</Typography>
                      </TableCell>
                      <TableCell>
                        <WorkflowBadge status={d.workflowStatus} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(d.createdAt)}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Expiry radar */}
        <Grid item xs={12} md={5}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                رادار الانتهاء
              </Typography>
              <Button size="small" color="warning" onClick={() => onNavigate(6)}>
                عرض الكل
              </Button>
            </Box>
            {busy ? (
              <Skeleton height={160} />
            ) : data?.expiringDocuments?.length ? (
              <Stack spacing={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {data.expiringDocuments.map(d => (
                  <Box
                    key={d._id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: d.daysLeft <= 7 ? `${C.red}08` : `${C.orange}08`,
                    }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        noWrap
                        sx={{ display: 'block', maxWidth: 160 }}
                      >
                        {d.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {d.category}
                      </Typography>
                    </Box>
                    <UrgencyBadge
                      urgency={d.daysLeft <= 7 ? 'critical' : 'medium'}
                      daysLeft={d.daysLeft}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CheckIcon sx={{ color: C.green, fontSize: 36 }} />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  لا توجد مستندات منتهية قريباً
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 1: LIBRARY ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function LibraryTab({ onUploadClick }) {
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRows] = useState(20);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    fileType: '',
    workflowStatus: '',
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [gridView, setGridView] = useState(false);
  const [meta, setMeta] = useState({ categories: [], fileTypes: [] });
  const [anchorEl, setAnchor] = useState(null);
  const [activeDoc, setActive] = useState(null);
  const [notification, setNote] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const p = {
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        ...(search ? { search } : {}),
      };
      const res = await svc.listDocuments(p);
      setDocs(res.documents || []);
      setTotal(res.pagination?.total || 0);
    } catch (e) {
      logger.error('Library:', e);
    } finally {
      setBusy(false);
    }
  }, [page, rowsPerPage, filters, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    svc
      .getMetadata()
      .then(r => setMeta(r.data || {}))
      .catch(() => {});
  }, []);

  const toggleSelect = id => {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  };
  const toggleAll = () => {
    setSelected(s => (s.length === docs.length ? [] : docs.map(d => d._id)));
  };

  const handleBulk = async op => {
    if (!selected.length) return;
    try {
      await svc.bulkOperation(selected, op);
      setSelected([]);
      setNote({ type: 'success', msg: `تمت العملية على ${selected.length} مستند` });
      load();
    } catch (e) {
      setNote({ type: 'error', msg: e.message });
    }
  };

  const handleFavorite = async id => {
    try {
      await svc.toggleFavorite(id);
      load();
    } catch {
      /* */
    }
  };

  const handleArchive = async id => {
    try {
      await svc.archiveDocument(id);
      setNote({ type: 'success', msg: 'تم الأرشفة' });
      load();
    } catch (e) {
      setNote({ type: 'error', msg: e.message });
    }
    setAnchor(null);
  };

  const handleDelete = async id => {
    try {
      await svc.deleteDocument(id);
      setNote({ type: 'success', msg: 'تم الحذف' });
      load();
    } catch (e) {
      setNote({ type: 'error', msg: e.message });
    }
    setAnchor(null);
  };

  return (
    <Box>
      {notification && (
        <Alert severity={notification.type} sx={{ mb: 2 }} onClose={() => setNote(null)}>
          {notification.msg}
        </Alert>
      )}

      {/* Toolbar */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField
          placeholder="بحث في المستندات..."
          size="small"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 250, flexGrow: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {['category', 'workflowStatus', 'fileType'].map(key => (
          <FormControl key={key} size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: 12 }}>
              {{ category: 'الفئة', workflowStatus: 'سير العمل', fileType: 'النوع' }[key]}
            </InputLabel>
            <Select
              label={key}
              value={filters[key]}
              onChange={e => {
                setFilters(f => ({ ...f, [key]: e.target.value }));
                setPage(0);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {(key === 'category'
                ? meta.categories || []
                : key === 'workflowStatus'
                  ? Object.keys(WORKFLOW_LABELS)
                  : meta.fileTypes || []
              ).map(opt => (
                <MenuItem key={opt} value={opt}>
                  {key === 'workflowStatus' ? WORKFLOW_LABELS[opt]?.label : opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
        <Tooltip title="تبديل العرض">
          <IconButton onClick={() => setGridView(v => !v)} size="small">
            {gridView ? <ListViewIcon /> : <GridViewIcon />}
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          size="small"
          onClick={onUploadClick}
          sx={{ ml: 'auto' }}
        >
          رفع مستند
        </Button>
      </Box>

      {/* Bulk actions */}
      <Collapse in={selected.length > 0}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            borderRadius: 2,
            border: `1px solid ${C.blue}`,
            bgcolor: `${C.blue}08`,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
            {selected.length} محدد
          </Typography>
          <Button size="small" startIcon={<ArchBtn />} onClick={() => handleBulk('archive')}>
            أرشفة
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleBulk('delete')}
          >
            حذف
          </Button>
          <Button size="small" startIcon={<RunIcon />} onClick={() => handleBulk('publish')}>
            نشر
          </Button>
          <Button size="small" onClick={() => setSelected([])} sx={{ ml: 'auto' }}>
            إلغاء
          </Button>
        </Paper>
      </Collapse>

      {/* Table */}
      {busy ? (
        <Stack spacing={1}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} height={44} sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : !gridView ? (
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={selected.length > 0 && selected.length < docs.length}
                    checked={docs.length > 0 && selected.length === docs.length}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell>العنوان</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>سير العمل</TableCell>
                <TableCell>تاريخ الرفع</TableCell>
                <TableCell>الرافع</TableCell>
                <TableCell>الانتهاء</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map(d => (
                <TableRow key={d._id} hover selected={selected.includes(d._id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={selected.includes(d._id)}
                      onChange={() => toggleSelect(d._id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 220 }}>
                      <FileIcon type={d.fileType} />
                      <Typography variant="caption" fontWeight={600} noWrap title={d.title}>
                        {d.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={d.category}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ textTransform: 'uppercase', color: C.gray }}
                    >
                      {d.fileType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <WorkflowBadge status={d.workflowStatus} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{fmtDate(d.createdAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" noWrap>
                      {d.uploadedByName || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {d.expiryDate ? (
                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            new Date(d.expiryDate) < new Date(Date.now() + 7 * 86400000)
                              ? C.red
                              : 'text.secondary',
                        }}
                      >
                        {fmtDate(d.expiryDate)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="مفضلة">
                        <IconButton size="small" onClick={() => handleFavorite(d._id)}>
                          {(d.isFavoriteOf || []).length > 0 ? (
                            <StarIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                          ) : (
                            <StarBorderIcon sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={e => {
                          setActive(d);
                          setAnchor(e.currentTarget);
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={e => {
              setRows(+e.target.value);
              setPage(0);
            }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="عدد الصفوف:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          />
        </Paper>
      ) : (
        /* Grid view */
        <Grid container spacing={2}>
          {docs.map(d => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={d._id}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: selected.includes(d._id) ? C.blue : 'divider',
                  borderRadius: 2.5,
                  cursor: 'pointer',
                  transition: 'all .2s',
                  '&:hover': { boxShadow: 3 },
                }}
                onClick={() => toggleSelect(d._id)}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <FileIcon type={d.fileType} size="large" />
                    <WorkflowBadge status={d.workflowStatus} />
                  </Box>
                  <Typography variant="body2" fontWeight={700} noWrap gutterBottom>
                    {d.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {d.category} · {fmtDate(d.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
          }}
        >
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <MuiListItemText>عرض</MuiListItemText>
        </MenuItem>
        <MenuItem onClick={() => activeDoc && handleArchive(activeDoc._id)}>
          <ListItemIcon>
            <ArchBtn fontSize="small" />
          </ListItemIcon>
          <MuiListItemText>أرشفة</MuiListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => activeDoc && handleDelete(activeDoc._id)} sx={{ color: C.red }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: C.red }} />
          </ListItemIcon>
          <MuiListItemText>حذف</MuiListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 2: WORKFLOW ───────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function WorkflowTab() {
  const [data, setData] = useState({ documents: [], stats: {}, pagination: {} });
  const [busy, setBusy] = useState(false);
  const [statusFilter, setSF] = useState('');
  const [page, setPage] = useState(0);
  const [note, setNote] = useState(null);
  const [dialog, setDialog] = useState(null); // { doc, action }
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await svc.getWorkflowQueue({ status: statusFilter || undefined, page: page + 1 });
      setData(res);
    } catch (e) {
      logger.error('Workflow:', e);
    } finally {
      setBusy(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const execAction = async () => {
    try {
      await svc.workflowAction(dialog.doc._id, dialog.action, comment);
      setNote({ type: 'success', msg: 'تم تنفيذ الإجراء بنجاح' });
      setDialog(null);
      setComment('');
      load();
    } catch (e) {
      setNote({ type: 'error', msg: e.message });
    }
  };

  const ACTIONS = [
    {
      key: 'approve_review',
      label: 'اعتماد المراجعة',
      color: 'success',
      forStatus: 'pending_review',
    },
    { key: 'request_revision', label: 'طلب تعديل', color: 'warning', forStatus: 'pending_review' },
    { key: 'approve', label: 'موافقة نهائية', color: 'success', forStatus: 'pending_approval' },
    { key: 'reject', label: 'رفض', color: 'error', forStatus: 'pending_approval' },
    { key: 'publish', label: 'نشر', color: 'info', forStatus: 'approved' },
  ];

  return (
    <Box>
      {note && (
        <Alert severity={note.type} sx={{ mb: 2 }} onClose={() => setNote(null)}>
          {note.msg}
        </Alert>
      )}

      {/* Stats bar */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        {[
          { key: 'pending_review', label: 'قيد المراجعة', color: C.orange },
          { key: 'pending_approval', label: 'قيد الاعتماد', color: C.purple },
          { key: 'revision_required', label: 'يحتاج تعديل', color: C.red },
          { key: 'approved', label: 'معتمد', color: C.green },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.key}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: statusFilter === s.key ? `${s.color}12` : 'transparent',
                transition: 'all .2s',
              }}
              onClick={() => setSF(v => (v === s.key ? '' : s.key))}
            >
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                {busy ? '…' : data.stats?.[s.key] || 0}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>المستند</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الرافع</TableCell>
              <TableCell>آخر تحديث</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {busy
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ))
              : data.documents.map(d => (
                  <TableRow key={d._id} hover>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>
                        {d.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={d.category}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell>
                      <WorkflowBadge status={d.workflowStatus} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{d.uploadedByName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{fmtDate(d.updatedAt)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                        }}
                      >
                        {ACTIONS.filter(a => a.forStatus === d.workflowStatus).map(a => (
                          <Button
                            key={a.key}
                            size="small"
                            color={a.color}
                            variant="outlined"
                            sx={{ fontSize: 10, py: 0.3, px: 1 }}
                            onClick={() => setDialog({ doc: d, action: a.key, label: a.label })}
                          >
                            {a.label}
                          </Button>
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={data.pagination?.total || 0}
          page={page}
          rowsPerPage={20}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPageOptions={[20]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} من ${count}`}
          labelRowsPerPage=""
        />
      </Paper>

      {/* Action dialog */}
      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog?.label} — {dialog?.doc?.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="ملاحظات (اختياري)"
            fullWidth
            multiline
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={execAction}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 3: AI INTELLIGENCE ────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function AITab() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [classifying, setClassifying] = useState(null);
  const [note, setNote] = useState(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData((await svc.getAIInsights()).data);
    } catch (e) {
      logger.error('AI:', e);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClassifyAll = async () => {
    if (!data?.needsClassification?.length) return;
    let done = 0;
    for (const doc of data.needsClassification) {
      setClassifying(doc._id);
      try {
        await svc.classifyDocument(doc._id);
        done++;
      } catch {
        /* */
      }
    }
    setNote({ type: 'success', msg: `تم تصنيف ${done} مستند بالذكاء الاصطناعي` });
    setClassifying(null);
    load();
  };

  return (
    <Box>
      {note && (
        <Alert severity={note.type} sx={{ mb: 2 }} onClose={() => setNote(null)}>
          {note.msg}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Overview */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AIIcon sx={{ color: C.purple }} /> نظرة عامة
            </Typography>
            {busy ? (
              <Skeleton height={120} />
            ) : (
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    معدل التصنيف
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={data?.overview?.classificationRate || 0}
                      sx={{
                        flexGrow: 1,
                        height: 8,
                        borderRadius: 4,
                        '& .MuiLinearProgress-bar': { bgcolor: C.purple },
                      }}
                    />
                    <Typography variant="caption" fontWeight={700} sx={{ color: C.purple }}>
                      {data?.overview?.classificationRate || 0}%
                    </Typography>
                  </Box>
                </Box>
                {[
                  { label: 'مصنّف', value: data?.overview?.classified, color: C.green },
                  { label: 'غير مصنّف', value: data?.overview?.unclassified, color: C.orange },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {r.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: r.color }}>
                      {r.value ?? 0}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Priority distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 200,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              توزيع الأولوية
            </Typography>
            {busy ? (
              <Skeleton height={150} />
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={Object.entries(data?.priorityStats || {}).map(([k, v]) => ({
                    name: k,
                    count: v,
                  }))}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip />
                  <Bar dataKey="count" fill={C.purple} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* OCR status */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 200,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              حالة OCR
            </Typography>
            {busy ? (
              <Skeleton height={150} />
            ) : (
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {Object.entries(data?.ocrStats || {}).map(([status, count]) => (
                  <Box
                    key={status}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="caption">
                      {{ completed: 'مكتمل', pending: 'معلّق', failed: 'فشل', none: 'لا يوجد' }[
                        status
                      ] || status}
                    </Typography>
                    <Chip
                      label={count}
                      size="small"
                      sx={{
                        bgcolor: {
                          completed: `${C.green}15`,
                          pending: `${C.orange}15`,
                          failed: `${C.red}15`,
                          none: `${C.gray}15`,
                        }[status],
                        color: {
                          completed: C.green,
                          pending: C.orange,
                          failed: C.red,
                          none: C.gray,
                        }[status],
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Needs classification */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                مستندات بحاجة إلى تصنيف ({data?.needsClassification?.length || 0})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AIIcon />}
                size="small"
                disabled={busy || !data?.needsClassification?.length}
                onClick={handleClassifyAll}
                sx={{ bgcolor: C.purple, '&:hover': { bgcolor: '#6D28D9' } }}
              >
                تصنيف الكل تلقائياً
              </Button>
            </Box>
            {busy ? (
              <Skeleton height={120} />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>العنوان</TableCell>
                    <TableCell>الفئة الحالية</TableCell>
                    <TableCell>تاريخ الرفع</TableCell>
                    <TableCell>الرافع</TableCell>
                    <TableCell align="center">تصنيف</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.needsClassification || []).slice(0, 15).map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        <Typography variant="caption" fontWeight={600}>
                          {d.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={d.category || 'أخرى'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(d.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{d.uploadedByName}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            classifying === d._id ? <CircularProgress size={12} /> : <AIIcon />
                          }
                          disabled={classifying === d._id}
                          onClick={async () => {
                            setClassifying(d._id);
                            try {
                              await svc.classifyDocument(d._id);
                              load();
                            } catch {
                              /* */
                            }
                            setClassifying(null);
                          }}
                          sx={{ fontSize: 10, color: C.purple, borderColor: C.purple }}
                        >
                          تصنيف
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 4: REPORTS ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function ReportsTab() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [months, setMonths] = useState(6);
  const theme = useTheme();

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData((await svc.getAnalytics(months)).data);
    } catch (e) {
      logger.error('Reports:', e);
    } finally {
      setBusy(false);
    }
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          التقارير والتحليلات
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>الفترة</InputLabel>
          <Select label="الفترة" value={months} onChange={e => setMonths(e.target.value)}>
            {[3, 6, 12, 24].map(m => (
              <MenuItem key={m} value={m}>
                {m} أشهر
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Trend */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 280,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              اتجاه الرفع الشهري
            </Typography>
            {busy ? (
              <Skeleton height={230} />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={data?.uploadTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={C.blue}
                    fill={`${C.blue}20`}
                    name="مستندات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Category */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 280,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              توزيع الفئات
            </Typography>
            {busy ? (
              <Skeleton height={230} />
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={data?.categoryBreakdown || []}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  >
                    {(data?.categoryBreakdown || []).map((_, i) => (
                      <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Expiry forecast */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 260,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              توقع انتهاء الصلاحية
            </Typography>
            {busy ? (
              <Skeleton height={210} />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data?.expiryForecast || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RTooltip />
                  <Bar dataKey="count" fill={C.orange} radius={[4, 4, 0, 0]} name="مستندات" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Top viewed */}
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              الأكثر مشاهدة
            </Typography>
            {busy ? (
              <Skeleton height={200} />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المستند</TableCell>
                    <TableCell align="center">مشاهدات</TableCell>
                    <TableCell align="center">تنزيلات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.topViewed || []).slice(0, 6).map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <FileIcon type={d.fileType} />
                          <Typography variant="caption" noWrap sx={{ maxWidth: 180 }}>
                            {d.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={d.viewCount}
                          size="small"
                          sx={{ bgcolor: `${C.blue}15`, color: C.blue, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={d.downloadCount}
                          size="small"
                          sx={{ bgcolor: `${C.green}15`, color: C.green, fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Storage by type */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              height: 260,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              التخزين حسب نوع الملف
            </Typography>
            {busy ? (
              <Skeleton height={210} />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={data?.storageByType || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="type" tick={{ fontSize: 10 }} width={40} />
                  <RTooltip formatter={v => `${v} ملف`} />
                  <Bar dataKey="count" fill={C.teal} radius={[0, 4, 4, 0]} name="ملفات" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 5: SEARCH ────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function SearchTab() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setHasSearched(true);
    try {
      const res = await svc.smartSearch(query.trim());
      setResults(res.results || []);
      setTotal(res.total || 0);
    } catch (e) {
      logger.error('Search:', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Box sx={{ maxWidth: 700, mx: 'auto', mb: 4 }}>
        <Typography variant="h6" fontWeight={700} textAlign="center" gutterBottom>
          البحث الذكي في المستندات
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="ابحث بالعنوان، الوصف، الكلمات المفتاحية..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            onClick={doSearch}
            disabled={busy || !query.trim()}
            sx={{ px: 3 }}
          >
            {busy ? <CircularProgress size={20} color="inherit" /> : 'بحث'}
          </Button>
        </Box>
      </Box>

      {hasSearched && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {total > 0 ? `${total} نتيجة للبحث عن "${query}"` : `لا توجد نتائج لـ "${query}"`}
          </Typography>
          <Stack spacing={1.5}>
            {results.map(d => (
              <Paper
                key={d._id}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all .2s',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <FileIcon type={d.fileType} size="large" />
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {d.title}
                      </Typography>
                      <WorkflowBadge status={d.workflowStatus} />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {d.snippet}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={d.category}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10 }}
                      />
                      <Chip
                        label={d.fileType?.toUpperCase()}
                        size="small"
                        sx={{ fontSize: 10, bgcolor: `${C.gray}15` }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {fmtDate(d.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {!hasSearched && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            أدخل كلمات البحث للعثور على المستندات
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── TAB 6: EXPIRY RADAR ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function ExpiryTab() {
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(60);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setDocs((await svc.getExpiryRadar(days)).data || []);
    } catch (e) {
      logger.error('Expiry:', e);
    } finally {
      setBusy(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = {
    critical: docs.filter(d => d.urgency === 'critical'),
    high: docs.filter(d => d.urgency === 'high'),
    medium: docs.filter(d => d.urgency === 'medium'),
    low: docs.filter(d => d.urgency === 'low'),
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AlertIcon sx={{ color: C.orange }} />
          رادار انتهاء صلاحية المستندات
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>الفترة</InputLabel>
          <Select label="الفترة" value={days} onChange={e => setDays(e.target.value)}>
            {[7, 14, 30, 60, 90].map(d => (
              <MenuItem key={d} value={d}>
                خلال {d} يوم
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Summary chips */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {[
          { label: 'حرجة (≤3 أيام)', key: 'critical', color: C.red },
          { label: 'عالية (≤7 أيام)', key: 'high', color: C.orange },
          { label: 'متوسطة (≤14 يوم)', key: 'medium', color: '#D97706' },
          { label: 'منخفضة', key: 'low', color: C.green },
        ].map(g => (
          <Grid item xs={6} sm={3} key={g.key}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${g.color}40`,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {g.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: g.color }}>
                {busy ? '…' : groups[g.key].length}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Doc list */}
      {busy ? (
        <Skeleton height={300} />
      ) : docs.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CheckIcon sx={{ fontSize: 64, color: C.green, mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد مستندات ستنتهي صلاحيتها خلال {days} يوم
          </Typography>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>المستند</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>تاريخ الانتهاء</TableCell>
                <TableCell>الأيام المتبقية</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>الرافع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map(d => (
                <TableRow
                  key={d._id}
                  hover
                  sx={{
                    bgcolor:
                      d.urgency === 'critical'
                        ? `${C.red}06`
                        : d.urgency === 'high'
                          ? `${C.orange}06`
                          : 'transparent',
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileIcon type={d.fileType} />
                      <Typography variant="caption" fontWeight={600}>
                        {d.title}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={d.category}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: URGENCY_COLORS[d.urgency] }}
                    >
                      {fmtDate(d.expiryDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={d.urgency} daysLeft={d.daysLeft} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={d.smartClassification?.priority || 'medium'}
                      size="small"
                      sx={{ fontSize: 10, bgcolor: `${C.purple}15`, color: C.purple }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{d.uploadedByName || '—'}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// ── MAIN: DocumentCenter ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════
const TAB_CONFIG = [
  { label: 'لوحة التحكم', icon: <DashIcon />, tab: 0 },
  { label: 'المكتبة', icon: <LibIcon />, tab: 1 },
  { label: 'سير العمل', icon: <WfIcon />, tab: 2 },
  { label: 'الذكاء الاصطناعي', icon: <AIIcon />, tab: 3 },
  { label: 'التقارير', icon: <ReportIcon />, tab: 4 },
  { label: 'البحث', icon: <SearchIcon />, tab: 5 },
  { label: 'رادار الانتهاء', icon: <AlertIcon />, tab: 6 },
];

export default function DocumentCenter() {
  const [tab, setTab] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', direction: 'rtl' }}>
      {/* Page header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${C.blue} 0%, ${C.purple} 100%)`,
          color: '#fff',
          px: { xs: 2, md: 4 },
          py: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              مركز إدارة الوثائق
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
              نظام موحد وذكي لإدارة جميع مستندات المؤسسة
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.3)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            رفع مستند
          </Button>
        </Box>
      </Box>

      {/* Tab navigation */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons="auto"
          sx={{ px: { xs: 1, md: 4 }, '& .MuiTab-root': { minHeight: 52, fontSize: 13 } }}
        >
          {TAB_CONFIG.map(t => (
            <Tab
              key={t.tab}
              icon={t.icon}
              label={t.label}
              iconPosition="start"
              sx={{ gap: 0.5, flexDirection: 'row', alignItems: 'center' }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 0 && <DashboardTab onNavigate={setTab} />}
            {tab === 1 && <LibraryTab onUploadClick={() => setUploadOpen(true)} />}
            {tab === 2 && <WorkflowTab />}
            {tab === 3 && <AITab />}
            {tab === 4 && <ReportsTab />}
            {tab === 5 && <SearchTab />}
            {tab === 6 && <ExpiryTab />}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Upload dialog — delegates to existing upload page */}
      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            رفع مستند جديد
            <IconButton size="small" onClick={() => setUploadOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <UploadForm
            onSuccess={() => {
              setUploadOpen(false);
              setTab(1);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// ── Inline Upload Form ────────────────────────────────────────
function UploadForm({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState({ title: '', description: '', category: 'أخرى', tags: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleSubmit = async e => {
    e.preventDefault();
    if (!file) {
      setError('يرجى اختيار ملف');
      return;
    }
    if (!fields.title.trim()) {
      setError('العنوان مطلوب');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fields.title);
      formData.append('description', fields.description);
      formData.append('category', fields.category);
      if (fields.tags) formData.append('tags', fields.tags);

      const { default: apiClient } = await import('../../services/api.client');
      await apiClient.post('/api/v1/documents/upload', formData, {
        headers: { 'Content-Type': undefined },
      });
      onSuccess?.();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'حدث خطأ');
    } finally {
      setBusy(false);
    }
  };

  const CATS = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Drop zone */}
      <Paper
        elevation={0}
        onClick={() => inputRef.current?.click()}
        sx={{
          border: `2px dashed ${file ? C.green : C.blue}`,
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 2,
          bgcolor: file ? `${C.green}08` : `${C.blue}05`,
          '&:hover': { bgcolor: `${C.blue}10` },
          transition: 'all .2s',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={e => {
            setFile(e.target.files[0]);
            setFields(f => ({
              ...f,
              title: f.title || e.target.files[0]?.name?.replace(/\.[^.]+$/, '') || '',
            }));
          }}
        />
        <UploadIcon sx={{ fontSize: 36, color: file ? C.green : C.blue, mb: 1 }} />
        <Typography variant="body2" fontWeight={600}>
          {file ? file.name : 'اسحب الملف هنا أو انقر للاختيار'}
        </Typography>
        {file && (
          <Typography variant="caption" color="text.secondary">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </Typography>
        )}
      </Paper>

      <Stack spacing={2}>
        <TextField
          label="العنوان *"
          fullWidth
          size="small"
          value={fields.title}
          onChange={e => setFields(f => ({ ...f, title: e.target.value }))}
        />
        <TextField
          label="الوصف"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={fields.description}
          onChange={e => setFields(f => ({ ...f, description: e.target.value }))}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>الفئة</InputLabel>
          <Select
            label="الفئة"
            value={fields.category}
            onChange={e => setFields(f => ({ ...f, category: e.target.value }))}
          >
            {CATS.map(c => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="الوسوم (مفصولة بفواصل)"
          fullWidth
          size="small"
          value={fields.tags}
          onChange={e => setFields(f => ({ ...f, tags: e.target.value }))}
        />
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? <CircularProgress size={20} color="inherit" /> : 'رفع المستند'}
        </Button>
      </Box>
    </Box>
  );
}

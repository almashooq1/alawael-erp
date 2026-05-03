/**
 * BlockchainDashboard — لوحة تحكم الشهادات الرقمية والبلوكتشين (Professional v2)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Avatar,
  Button,
  Stack,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  VerifiedUser as VerifyIcon,
  Description as CertIcon,
  Security as SecureIcon,
  Cancel as RevokeIcon,
  CheckCircle as IssuedIcon,
  Draw as SignIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  QrCode2 as QRIcon,
  AccountBalanceWallet as WalletIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  certificatesService,
  templatesService,
  getDashboard,
} from '../../services/blockchainService';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !ran.current) {
          ran.current = true;
          const t0 = Date.now();
          const step = () => {
            const p = Math.min((Date.now() - t0) / dur, 1);
            setV(Math.floor((1 - Math.pow(2, -10 * p)) * end));
            if (p < 1) requestAnimationFrame(step);
            else setV(end);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return { v, ref };
};

const KPICard = ({ label, value, icon, c1, c2, delay }) => {
  const { v, ref } = useCounter(typeof value === 'number' ? value : parseInt(value) || 0, 1000);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: `linear-gradient(135deg,${c1},${c2})`,
          color: '#fff',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {v.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

const certStatusLabels = { draft: 'مسودة', issued: 'مصدرة', signed: 'موقعة', revoked: 'ملغاة' };
const certStatusColors = { draft: 'default', issued: 'info', signed: 'success', revoked: 'error' };
const certStatusIcons = {
  draft: <CertIcon />,
  issued: <IssuedIcon />,
  signed: <SignIcon />,
  revoked: <RevokeIcon />,
};

// Pull a recipient name out of either the canonical {recipient.name.ar/en} shape
// or the older flat recipientName used by some legacy fixtures.
const recipientName = c =>
  c?.recipient?.name?.ar || c?.recipient?.name?.en || c?.recipientName || '-';

// Build a 6-month issued/signed series from the cert list.
const buildMonthlySeries = list => {
  const months = [];
  const buckets = new Map();
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, label: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }) });
    buckets.set(key, { month: '', issued: 0, signed: 0 });
  }
  for (const c of list) {
    const d = c.issueDate || c.issuedAt || c.createdAt;
    if (!d) continue;
    const dt = new Date(d);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const slot = buckets.get(key);
    if (!slot) continue;
    if (c.status === 'issued') slot.issued += 1;
    if (c.status === 'signed' || (c.signatures && c.signatures.length)) slot.signed += 1;
  }
  return months.map(m => ({ ...buckets.get(m.key), month: m.label }));
};

const buildStatusPie = list => {
  const counts = { signed: 0, issued: 0, draft: 0, revoked: 0 };
  for (const c of list) {
    if (c.status === 'revoked') counts.revoked += 1;
    else if (c.status === 'draft') counts.draft += 1;
    else if (c.signatures && c.signatures.length) counts.signed += 1;
    else if (c.status === 'issued') counts.issued += 1;
  }
  return [
    { name: 'موقعة', value: counts.signed, color: '#66bb6a' },
    { name: 'مصدرة', value: counts.issued, color: '#42a5f5' },
    { name: 'مسودة', value: counts.draft, color: '#bdbdbd' },
    { name: 'ملغاة', value: counts.revoked, color: '#ef5350' },
  ];
};

export default function BlockchainDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [certs, setCerts] = useState([]);
  const [stats, setStats] = useState({});
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cResp, tResp, dResp] = await Promise.all([
        certificatesService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        templatesService.getAll().catch(() => ({ data: [] })),
        getDashboard().catch(() => ({ data: {} })),
      ]);
      const c = Array.isArray(cResp.data) ? cResp.data : Array.isArray(cResp) ? cResp : [];
      const t = Array.isArray(tResp.data) ? tResp.data : Array.isArray(tResp) ? tResp : [];
      const d = dResp?.data || {};
      setCerts(c);
      setTemplates(t);
      setStats({
        total: d.totalCertificates ?? c.length,
        templates: d.activeTemplates ?? t.length,
        issued: d.issuedCertificates ?? c.filter(x => x.status === 'issued').length,
        signed: c.filter(x => x.signatures && x.signatures.length).length,
        revoked: d.revokedCertificates ?? c.filter(x => x.status === 'revoked').length,
        draft: d.draftCertificates ?? c.filter(x => x.status === 'draft').length,
      });
    } catch (err) {
      logger.error('Blockchain Dashboard error', err);
      setCerts([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = certs.filter(c => {
    const name = recipientName(c);
    const ms = !search || name?.includes(search) || c.certificateNumber?.includes(search);
    const mf = !filterStatus || c.status === filterStatus;
    return ms && mf;
  });

  const monthlyData = React.useMemo(() => buildMonthlySeries(certs), [certs]);
  const statusPie = React.useMemo(() => buildStatusPie(certs), [certs]);

  const handleExport = () => {
    const hdr = 'رقم الشهادة,المستلم,النوع,الحالة,التاريخ';
    const rows = certs.map(c => {
      const date = c.issueDate || c.issuedAt || c.createdAt;
      return `${c.certificateNumber || '-'},"${recipientName(c)}","${c.title?.ar || c.title?.en || c.template?.name || '-'}",${certStatusLabels[c.status] || '-'},${date ? new Date(date).toLocaleDateString('ar') : '-'}`;
    });
    const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificates_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            py: 3,
            px: 3,
            mb: -3,
            borderRadius: '0 0 24px 24px',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(99,179,237,0.08)',
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(99,179,237,0.05)',
            },
          }}
        >
          <Box maxWidth="xl" sx={{ mx: 'auto' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <SecureIcon sx={{ color: '#63b3ed', fontSize: 28 }} />
                  <Typography variant="h5" fontWeight={800} color="#fff">
                    الشهادات الرقمية — Blockchain
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>
                  توثيق وإصدار وتحقق الشهادات بتقنية البلوكتشين اللامركزية
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    icon={
                      <WalletIcon
                        sx={{ fontSize: '13px !important', color: '#63b3ed !important' }}
                      />
                    }
                    label="لامركزي"
                    size="small"
                    sx={{ bgcolor: 'rgba(99,179,237,0.15)', color: '#63b3ed', fontSize: 11 }}
                  />
                  <Chip
                    icon={
                      <QRIcon sx={{ fontSize: '13px !important', color: '#68d391 !important' }} />
                    }
                    label="QR التحقق"
                    size="small"
                    sx={{ bgcolor: 'rgba(104,211,145,0.15)', color: '#68d391', fontSize: 11 }}
                  />
                  <Chip
                    icon={
                      <SignIcon sx={{ fontSize: '13px !important', color: '#f6ad55 !important' }} />
                    }
                    label="توقيع رقمي"
                    size="small"
                    sx={{ bgcolor: 'rgba(246,173,85,0.15)', color: '#f6ad55', fontSize: 11 }}
                  />
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton
                    onClick={handleExport}
                    sx={{
                      color: '#63b3ed',
                      bgcolor: 'rgba(99,179,237,0.1)',
                      '&:hover': { bgcolor: 'rgba(99,179,237,0.2)' },
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تحديث">
                  <IconButton
                    onClick={loadData}
                    sx={{
                      color: '#63b3ed',
                      bgcolor: 'rgba(99,179,237,0.1)',
                      '&:hover': { bgcolor: 'rgba(99,179,237,0.2)' },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/blockchain/new')}
                  sx={{
                    bgcolor: '#0f3460',
                    border: '1px solid rgba(99,179,237,0.3)',
                    '&:hover': { bgcolor: '#1a4a80' },
                  }}
                >
                  شهادة جديدة
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الشهادات"
                value={stats.total || certs.length}
                icon={<CertIcon />}
                c1="#1a1a2e"
                c2="#0f3460"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="موقعة رقمياً"
                value={stats.signed || 0}
                icon={<VerifyIcon />}
                c1="#2e7d32"
                c2="#4caf50"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مصدرة"
                value={stats.issued || 0}
                icon={<IssuedIcon />}
                c1="#01579b"
                c2="#0288d1"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="القوالب النشطة"
                value={stats.templates || templates.length || 8}
                icon={<QRIcon />}
                c1="#4a148c"
                c2="#7b1fa2"
                delay={3}
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  منحنى الإصدار الشهري
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={monthlyData}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#42a5f5" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#42a5f5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gSigned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#66bb6a" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#66bb6a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="issued"
                      name="مصدرة"
                      stroke="#42a5f5"
                      fill="url(#gIssued)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="signed"
                      name="موقعة"
                      stroke="#66bb6a"
                      fill="url(#gSigned)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  توزيع حالات الشهادات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusPie.map((s, i) => (
                        <Cell key={i} fill={s.color} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Status mini-cards */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {Object.entries(certStatusLabels).map(([key, label]) => {
              const count = certs.filter(c => c.status === key).length;
              const pct = certs.length ? Math.round((count / certs.length) * 100) : 0;
              return (
                <Grid item xs={6} sm={3} key={key}>
                  <motion.div whileHover={{ y: -2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.75,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                      onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={label}
                          color={certStatusColors[key] || 'default'}
                          size="small"
                        />
                        <Typography variant="h6" fontWeight={800} sx={{ ml: 'auto' }}>
                          {count}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            bgcolor: `${certStatusColors[key]}.main`,
                            borderRadius: 2,
                            transition: 'width 1s ease',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {pct}% من الإجمالي
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>

          {/* Filters */}
          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالاسم أو رقم الشهادة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(certStatusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} شهادة`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Table */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                سجل الشهادات
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد شهادات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['رقم الشهادة', 'المستلم', 'النوع', 'الحالة', 'تاريخ الإصدار', 'إجراء'].map(
                        h => (
                          <TableCell
                            key={h}
                            sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                          >
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((c, i) => {
                      const name = recipientName(c);
                      const date = c.issueDate || c.issuedAt || c.createdAt;
                      const title = c.title?.ar || c.title?.en || c.type || c.template?.name || '-';
                      return (
                        <TableRow
                          key={c._id || i}
                          hover
                          sx={{ '&:last-child td': { borderBottom: 0 } }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <SecureIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              <Typography
                                variant="body2"
                                sx={{ fontFamily: 'monospace', fontSize: 12 }}
                              >
                                {c.certificateNumber || c._id?.slice(-8) || '-'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 12,
                                  bgcolor: alpha('#0f3460', 0.12),
                                  color: '#0f3460',
                                }}
                              >
                                {name?.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {title}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={certStatusLabels[c.status] || c.status || '-'}
                              color={certStatusColors[c.status] || 'default'}
                              size="small"
                              icon={certStatusIcons[c.status]}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {date ? new Date(date).toLocaleDateString('ar') : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="عرض الشهادة">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/blockchain/${c._id}`)}
                                  sx={{ border: '1px solid', borderColor: 'divider' }}
                                  aria-label="عرض الشهادة"
                                >
                                  <ViewIcon fontSize="small" color="primary" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تحميل PDF">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={certificatesService.pdfUrl(c._id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ border: '1px solid', borderColor: 'divider' }}
                                >
                                  <DownloadIcon fontSize="small" color="action" />
                                </IconButton>
                              </Tooltip>
                              {c.hash && (
                                <Tooltip title="رابط التحقق العام">
                                  <IconButton
                                    size="small"
                                    component="a"
                                    href={`/verify/${c.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ border: '1px solid', borderColor: 'divider' }}
                                  >
                                    <QRIcon fontSize="small" color="success" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </DashboardErrorBoundary>
  );
}

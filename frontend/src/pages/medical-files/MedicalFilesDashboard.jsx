/**
 * MedicalFilesDashboard — لوحة السجلات الطبية (Professional v2)
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
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  FolderSpecial as FilesIcon,
  CloudUpload as UploadIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { gradients } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';
import { formatDate as _fmtDate } from 'utils/dateUtils';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(([e]) => {
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
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return [v, ref];
};

const KPICard = ({ label, value, icon, gradient, delay = 0, suffix = '' }) => {
  const [count, ref] = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.12 }}
    >
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -16,
            right: -16,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {count.toLocaleString('ar-SA')}
              {suffix}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5, display: 'block' }}>
              {label}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
      </Paper>
    </motion.div>
  );
};

const fileTypeLabels = {
  pdf: 'PDF',
  image: 'صورة',
  xray: 'أشعة',
  lab: 'مختبر',
  report: 'تقرير',
  prescription: 'وصفة طبية',
  other: 'أخرى',
};
const fileStatusLabels = { active: 'نشط', archived: 'مؤرشف', pending: 'معلق', flagged: 'مُعلَّم' };
const fileStatusColors = {
  active: 'success',
  archived: 'default',
  pending: 'warning',
  flagged: 'error',
};
const PIE_COLORS = ['#1b5e20', '#2e7d32', '#388e3c', '#4caf50', '#81c784', '#a5d6a7', '#c8e6c9'];

const DEMO = {
  totalFiles: 3840,
  thisMonth: 127,
  storageGB: 24,
  secureFiles: 3612,
  byFileType: [
    { name: 'تقارير', value: 1200, color: PIE_COLORS[0] },
    { name: 'أشعة', value: 820, color: PIE_COLORS[1] },
    { name: 'مختبر', value: 650, color: PIE_COLORS[2] },
    { name: 'صور', value: 440, color: PIE_COLORS[3] },
    { name: 'وصفات', value: 380, color: PIE_COLORS[4] },
    { name: 'أخرى', value: 350, color: PIE_COLORS[5] },
  ],
  uploadsByMonth: [
    { month: 'يناير', count: 98 },
    { month: 'فبراير', count: 115 },
    { month: 'مارس', count: 89 },
    { month: 'أبريل', count: 134 },
    { month: 'مايو', count: 127 },
    { month: 'يونيو', count: 143 },
  ],
  files: [
    {
      _id: '1',
      patient: 'أحمد محمد العمري',
      fileType: 'report',
      size: '2.4 MB',
      status: 'active',
      doctor: 'د. فاطمة الزهراني',
      uploadDate: new Date().toISOString(),
    },
    {
      _id: '2',
      patient: 'سارة خالد السعيد',
      fileType: 'xray',
      size: '8.1 MB',
      status: 'active',
      doctor: 'د. عبدالله الشمري',
      uploadDate: new Date().toISOString(),
    },
    {
      _id: '3',
      patient: 'محمد سالم الغامدي',
      fileType: 'lab',
      size: '0.8 MB',
      status: 'archived',
      doctor: 'د. نورا العتيبي',
      uploadDate: new Date().toISOString(),
    },
    {
      _id: '4',
      patient: 'هند عبدالرحمن',
      fileType: 'prescription',
      size: '0.3 MB',
      status: 'pending',
      doctor: 'د. يوسف المطيري',
      uploadDate: new Date().toISOString(),
    },
    {
      _id: '5',
      patient: 'علي حسن القحطاني',
      fileType: 'image',
      size: '4.2 MB',
      status: 'active',
      doctor: 'د. منى الدوسري',
      uploadDate: new Date().toISOString(),
    },
  ],
};

export default function MedicalFilesDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/medical-files/storage/statistics');
      const d = res.data?.data || res.data || {};
      if (d.totalFiles) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('MedicalFilesDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.files || []).filter(f => {
    const ms =
      !search || [f.patient, f.doctor].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mt = !filterType || f.fileType === filterType;
    const ms2 = !filterStatus || f.status === filterStatus;
    return ms && mt && ms2;
  });

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg,#1b5e20,#2e7d32)',
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
              background: 'rgba(255,255,255,0.08)',
            },
          }}
        >
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
              <Typography variant="h5" fontWeight={800} color="#fff">
                السجلات الطبية
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                إدارة الملفات الطبية، التخزين الآمن، والأرشفة الرقمية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`إجمالي: ${dash.totalFiles?.toLocaleString('ar-SA')}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`هذا الشهر: ${dash.thisMonth}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="تحديث">
                <IconButton
                  onClick={loadData}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/medical-files/upload')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                رفع ملف
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الملفات"
                value={dash.totalFiles}
                icon={<FilesIcon />}
                gradient="linear-gradient(135deg,#1b5e20,#2e7d32)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مرفوعة هذا الشهر"
                value={dash.thisMonth}
                icon={<UploadIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="حجم التخزين (GB)"
                value={dash.storageGB}
                icon={<StorageIcon />}
                gradient={gradients.warning}
                delay={2}
                suffix=" GB"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="ملفات آمنة"
                value={dash.secureFiles}
                icon={<SecurityIcon />}
                gradient={gradients.success}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الملفات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byFileType || DEMO.byFileType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byFileType || DEMO.byFileType).map((e, i) => (
                        <Cell key={i} fill={e.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الرفع الشهري للملفات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.uploadsByMonth || DEMO.uploadsByMonth}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="ملفات مرفوعة" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالمريض أو الطبيب..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex' }}>
                        <SearchIcon fontSize="small" color="action" />
                      </Box>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="نوع الملف"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(fileTypeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2.5}>
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
                  {Object.entries(fileStatusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} ملف`}
                  sx={{ fontWeight: 700, bgcolor: '#2e7d32', color: '#fff' }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                السجلات الطبية
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد ملفات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المريض',
                        'نوع الملف',
                        'الحجم',
                        'الحالة',
                        'الطبيب',
                        'تاريخ الرفع',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((f, i) => (
                      <TableRow
                        key={f._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, bgcolor: '#2e7d32', fontSize: 12 }}
                            >
                              {(f.patient || 'م')[0]}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {f.patient || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={fileTypeLabels[f.fileType] || f.fileType || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#2e7d32', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {f.size || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={fileStatusLabels[f.status] || f.status || '—'}
                            color={fileStatusColors[f.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {f.doctor || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {f.uploadDate ? _fmtDate(f.uploadDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/medical-files/${f._id}`)}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <ViewIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
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

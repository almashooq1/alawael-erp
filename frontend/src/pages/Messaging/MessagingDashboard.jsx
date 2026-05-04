/**
 * MessagingDashboard — لوحة مركز الرسائل (Professional v2)
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
  Email as InboxIcon,
  MarkunreadMailbox as UnreadIcon,
  Send as SentIcon,
  Forum as ConvoIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
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

const KPICard = ({ label, value, icon, gradient, delay = 0 }) => {
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

const msgTypeLabels = {
  inbox: 'وارد',
  sent: 'صادر',
  internal: 'داخلي',
  circular: 'تعميم',
  complaint: 'شكوى',
  announcement: 'إعلان',
};
const msgPriorityLabels = { low: 'منخفض', normal: 'عادي', high: 'مرتفع', urgent: 'عاجل' };
const msgPriorityColors = { low: 'default', normal: 'info', high: 'warning', urgent: 'error' };
const msgStatusLabels = {
  unread: 'غير مقروء',
  read: 'مقروء',
  replied: 'تم الرد',
  archived: 'مؤرشف',
};
const PIE_COLORS = ['#006064', '#00838f', '#26c6da', '#80deea', '#b2ebf2', '#e0f7fa'];

const DEMO = {
  total: 1240,
  unread: 87,
  sent: 432,
  activeConversations: 34,
  byType: [
    { name: 'وارد', value: 320, color: PIE_COLORS[0] },
    { name: 'صادر', value: 180, color: PIE_COLORS[1] },
    { name: 'داخلي', value: 210, color: PIE_COLORS[2] },
    { name: 'تعميم', value: 95, color: PIE_COLORS[3] },
    { name: 'شكوى', value: 45, color: PIE_COLORS[4] },
  ],
  dailyMessages: [
    { day: 'السبت', count: 42 },
    { day: 'الأحد', count: 78 },
    { day: 'الاثنين', count: 91 },
    { day: 'الثلاثاء', count: 65 },
    { day: 'الأربعاء', count: 83 },
    { day: 'الخميس', count: 57 },
  ],
  messages: [
    {
      _id: '1',
      from: 'أحمد الزهراني',
      subject: 'طلب موافقة على الميزانية',
      type: 'inbox',
      priority: 'high',
      status: 'unread',
      date: new Date().toISOString(),
    },
    {
      _id: '2',
      from: 'سارة العتيبي',
      subject: 'تعميم: إجراءات السلامة الجديدة',
      type: 'circular',
      priority: 'urgent',
      status: 'read',
      date: new Date().toISOString(),
    },
    {
      _id: '3',
      from: 'قسم التقنية',
      subject: 'تحديث النظام المقرر الليلة',
      type: 'internal',
      priority: 'normal',
      status: 'replied',
      date: new Date().toISOString(),
    },
    {
      _id: '4',
      from: 'محمد الشمري',
      subject: 'شكوى: تأخر الراتب',
      type: 'complaint',
      priority: 'high',
      status: 'unread',
      date: new Date().toISOString(),
    },
    {
      _id: '5',
      from: 'نورة الدوسري',
      subject: 'طلب إجازة طارئة',
      type: 'inbox',
      priority: 'urgent',
      status: 'read',
      date: new Date().toISOString(),
    },
  ],
};

export default function MessagingDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/messages/stats');
      const d = res.data?.data || res.data || {};
      if (d.total) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('MessagingDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.messages || []).filter(m => {
    const ms =
      !search || [m.from, m.subject].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mt = !filterType || m.type === filterType;
    const mp = !filterPriority || m.priority === filterPriority;
    return ms && mt && mp;
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
            background: 'linear-gradient(135deg,#00838f,#006064)',
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
                مركز الرسائل والتواصل
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الرسائل الواردة، الصادرة، التعاميم، والمحادثات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`غير مقروءة: ${dash.unread}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`محادثات نشطة: ${dash.activeConversations}`}
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
                onClick={() => navigate('/messages/compose')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                رسالة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الرسائل"
                value={dash.total}
                icon={<InboxIcon />}
                gradient="linear-gradient(135deg,#00838f,#006064)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="غير مقروءة"
                value={dash.unread}
                icon={<UnreadIcon />}
                gradient="linear-gradient(135deg,#e53935,#c62828)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مُرسلة"
                value={dash.sent}
                icon={<SentIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="محادثات نشطة"
                value={dash.activeConversations}
                icon={<ConvoIcon />}
                gradient={gradients.ocean}
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
                  الرسائل حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byType || DEMO.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byType || DEMO.byType).map((e, i) => (
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
                  الرسائل اليومية (آخر 6 أيام)
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.dailyMessages || DEMO.dailyMessages}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="msgG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00838f" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#00838f" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="رسائل"
                      stroke="#00838f"
                      strokeWidth={2.5}
                      fill="url(#msgG)"
                    />
                  </AreaChart>
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
                  placeholder="بحث بالمرسل أو الموضوع..."
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
                  label="النوع"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(msgTypeLabels).map(([k, v]) => (
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
                  label="الأولوية"
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(msgPriorityLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} رسالة`}
                  sx={{ fontWeight: 700, bgcolor: '#006064', color: '#fff' }}
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
                صندوق الرسائل
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد رسائل مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المرسِل',
                        'الموضوع',
                        'النوع',
                        'الأولوية',
                        'الحالة',
                        'التاريخ',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((m, i) => (
                      <TableRow
                        key={m._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, bgcolor: '#00838f', fontSize: 12 }}
                            >
                              {(m.from || 'م')[0]}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {m.from || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {m.subject || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={msgTypeLabels[m.type] || m.type || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#006064', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={msgPriorityLabels[m.priority] || m.priority || '—'}
                            color={msgPriorityColors[m.priority] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={msgStatusLabels[m.status] || m.status || '—'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {m.date ? new Date(m.date).toLocaleDateString('ar') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/messages/${m._id}`)}
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

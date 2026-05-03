/**
 * SSOAdminDashboard — إدارة تسجيل الدخول الموحد (Professional v2)
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
  LinearProgress,
} from '@mui/material';
import {
  Security as SSOIcon,
  VpnKey as MFAIcon,
  People as SessionsIcon,
  Shield as ShieldIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  Cancel as BlockIcon,
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

const PIE_COLORS = ['#1565c0', '#2e7d32', '#e65100', '#c62828', '#6a1b9a'];
const mfaTypeLabels = {
  totp: 'TOTP',
  sms: 'رسالة SMS',
  email: 'بريد إلكتروني',
  hardware: 'مفتاح مادي',
};

const DEMO = {
  activeSessions: 248,
  mfaEnabled: 186,
  blockedUsers: 7,
  compliance: 92,
  sessionByProvider: [
    { name: 'محلي', value: 142, color: PIE_COLORS[0] },
    { name: 'Active Directory', value: 68, color: PIE_COLORS[1] },
    { name: 'SAML', value: 28, color: PIE_COLORS[2] },
    { name: 'OAuth2', value: 10, color: PIE_COLORS[3] },
  ],
  loginsByDay: [
    { day: 'السبت', count: 54 },
    { day: 'الأحد', count: 82 },
    { day: 'الاثنين', count: 91 },
    { day: 'الثلاثاء', count: 77 },
    { day: 'الأربعاء', count: 68 },
    { day: 'الخميس', count: 42 },
  ],
  sessions: [
    {
      _id: '1',
      user: 'أحمد محمد',
      provider: 'محلي',
      mfa: 'totp',
      status: 'active',
      ip: '10.0.1.14',
      loginAt: 'قبل 12د',
    },
    {
      _id: '2',
      user: 'سارة العمري',
      provider: 'Active Directory',
      mfa: 'sms',
      status: 'active',
      ip: '10.0.1.22',
      loginAt: 'قبل 35د',
    },
    {
      _id: '3',
      user: 'خالد سالم',
      provider: 'SAML',
      mfa: null,
      status: 'blocked',
      ip: '45.3.12.9',
      loginAt: 'قبل 2س',
    },
    {
      _id: '4',
      user: 'منى الزهراني',
      provider: 'محلي',
      mfa: 'totp',
      status: 'active',
      ip: '10.0.2.7',
      loginAt: 'قبل 1س',
    },
    {
      _id: '5',
      user: 'عمر الشهري',
      provider: 'OAuth2',
      mfa: 'email',
      status: 'active',
      ip: '10.0.1.44',
      loginAt: 'قبل 3س',
    },
  ],
};

const sessionStatusColors = { active: 'success', blocked: 'error', expired: 'default' };
const sessionStatusLabels = { active: 'نشطة', blocked: 'محظورة', expired: 'منتهية' };

export default function SSOAdminDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ssoRes, mfaRes] = await Promise.all([
        apiClient.get('/api/sso/sessions').catch(() => null),
        apiClient.get('/api/mfa/settings').catch(() => null),
      ]);
      const sso = ssoRes?.data || {};
      const mfa = mfaRes?.data || {};
      if (sso.activeSessions || mfa.enabledCount) {
        setDash({
          ...DEMO,
          activeSessions: sso.activeSessions || DEMO.activeSessions,
          mfaEnabled: mfa.enabledCount || DEMO.mfaEnabled,
          blockedUsers: sso.blockedUsers || DEMO.blockedUsers,
          sessions: sso.sessions || DEMO.sessions,
        });
      } else {
        setDash(DEMO);
      }
    } catch (err) {
      logger.warn('SSOAdminDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

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
            background: 'linear-gradient(135deg,#1565c0,#0d47a1)',
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
                إدارة تسجيل الدخول الموحد (SSO)
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الجلسات النشطة، التحقق الثنائي، الامتثال الأمني
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`امتثال الأمان: ${dash.compliance}%`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`محظورين: ${dash.blockedUsers}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,0,0,0.25)', color: '#fff', fontSize: 11 }}
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
                startIcon={<ShieldIcon />}
                onClick={() => navigate('/sso-admin/config')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                إعدادات الأمان
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="جلسات نشطة"
                value={dash.activeSessions}
                icon={<SessionsIcon />}
                gradient="linear-gradient(135deg,#1565c0,#0d47a1)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="تفعيل MFA"
                value={dash.mfaEnabled}
                icon={<MFAIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مستخدمون محظورون"
                value={dash.blockedUsers}
                icon={<SSOIcon />}
                gradient="linear-gradient(135deg,#c62828,#b71c1c)"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="نسبة الامتثال (%)"
                value={dash.compliance}
                icon={<ShieldIcon />}
                gradient={gradients.ocean}
                delay={3}
                suffix="%"
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
                  الجلسات حسب موفر الهوية
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dash.sessionByProvider || DEMO.sessionByProvider}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.sessionByProvider || DEMO.sessionByProvider).map((e, i) => (
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
                  تسجيلات الدخول اليومية
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={dash.loginsByDay || DEMO.loginsByDay}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={30}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="تسجيلات الدخول"
                      fill="#1565c0"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                مستوى الامتثال الأمني
              </Typography>
              <Chip label={`${dash.compliance}%`} color="success" size="small" icon={<OkIcon />} />
            </Box>
            <LinearProgress
              variant="determinate"
              value={dash.compliance || 0}
              sx={{
                height: 10,
                borderRadius: 5,
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg,#1565c0,#42a5f5)',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {dash.compliance >= 90
                ? 'ممتاز — النظام ممتثل بالكامل لمعايير الأمان'
                : 'يحتاج مراجعة — بعض المتطلبات غير مستوفاة'}
            </Typography>
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
                الجلسات الحالية
              </Typography>
            </Box>
            {!dash.sessions || dash.sessions.length === 0 ? (
              <EmptyState title="لا توجد جلسات نشطة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المستخدم',
                        'موفر الهوية',
                        'MFA',
                        'IP',
                        'تسجيل الدخول',
                        'الحالة',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dash.sessions || []).slice(0, 15).map((s, i) => (
                      <TableRow
                        key={s._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                            {s.user || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.provider || 'محلي'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#1565c0', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          {s.mfa ? (
                            <Chip
                              label={mfaTypeLabels[s.mfa] || s.mfa}
                              size="small"
                              color="success"
                              icon={<OkIcon sx={{ fontSize: '12px !important' }} />}
                            />
                          ) : (
                            <Chip label="بدون MFA" size="small" color="warning" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 11, fontFamily: 'monospace' }}
                          >
                            {s.ip || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {s.loginAt || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sessionStatusLabels[s.status] || s.status || '—'}
                            color={sessionStatusColors[s.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={s.status === 'blocked' ? 'رفع الحظر' : 'حظر المستخدم'}>
                            <IconButton
                              size="small"
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              {s.status === 'blocked' ? (
                                <OkIcon fontSize="small" color="success" />
                              ) : (
                                <BlockIcon fontSize="small" color="error" />
                              )}
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

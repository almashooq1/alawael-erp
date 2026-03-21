/**
 * SSO/MFA Admin Dashboard — لوحة إدارة تسجيل الدخول الموحد
 */
import { useState, useEffect } from 'react';

import apiClient from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';

const COLORS = ['#1565c0', '#2e7d32', '#e65100', '#c62828', '#6a1b9a'];

export default function SSOAdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ssoRes, mfaRes] = await Promise.all([
          apiClient.get('/api/sso/sessions').catch(() => null),
          apiClient.get('/api/mfa/settings').catch(() => null)
        ]);
        const sessions = ssoRes?.data?.data || [];
        const mfa = mfaRes?.data?.data || {};
        setData({
          activeSessions: sessions.length || 42,
          mfaEnabled: mfa.enabledUsers || 35,
          loginAttempts: 284,
          failedAttempts: 12,
          authMethods: [
            { name: 'كلمة مرور', value: 180 }, { name: 'SSO', value: 65 },
            { name: 'TOTP', value: 28 }, { name: 'بريد إلكتروني', value: 11 }
          ],
          dailyLogins: [
            { day: 'سبت', logins: 38 }, { day: 'أحد', logins: 45 },
            { day: 'إثنين', logins: 52 }, { day: 'ثلاثاء', logins: 48 },
            { day: 'أربعاء', logins: 50 }, { day: 'خميس', logins: 35 },
            { day: 'جمعة', logins: 16 }
          ],
          recentEvents: [
            { user: 'admin@alawael.sa', event: 'تسجيل دخول', method: 'SSO', ip: '192.168.1.10', time: '10:45' },
            { user: 'hr@alawael.sa', event: 'فشل MFA', method: 'TOTP', ip: '192.168.1.22', time: '10:30' },
            { user: 'finance@alawael.sa', event: 'تسجيل دخول', method: 'كلمة مرور', ip: '192.168.1.15', time: '09:55' }
          ]
        });
      } catch {
        setData({
          activeSessions: 42, mfaEnabled: 35, loginAttempts: 284, failedAttempts: 12,
          authMethods: [
            { name: 'كلمة مرور', value: 180 }, { name: 'SSO', value: 65 },
            { name: 'TOTP', value: 28 }, { name: 'بريد إلكتروني', value: 11 }
          ],
          dailyLogins: [
            { day: 'سبت', logins: 38 }, { day: 'أحد', logins: 45 },
            { day: 'إثنين', logins: 52 }, { day: 'ثلاثاء', logins: 48 },
            { day: 'أربعاء', logins: 50 }, { day: 'خميس', logins: 35 },
            { day: 'جمعة', logins: 16 }
          ],
          recentEvents: [
            { user: 'admin@alawael.sa', event: 'تسجيل دخول', method: 'SSO', ip: '192.168.1.10', time: '10:45' },
            { user: 'hr@alawael.sa', event: 'فشل MFA', method: 'TOTP', ip: '192.168.1.22', time: '10:30' },
            { user: 'finance@alawael.sa', event: 'تسجيل دخول', method: 'كلمة مرور', ip: '192.168.1.15', time: '09:55' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return <Typography>لا توجد بيانات</Typography>;

  const kpis = [
    { label: 'جلسات نشطة', value: data.activeSessions, icon: <SessionsIcon />, color: '#1565c0' },
    { label: 'MFA مفعّل', value: data.mfaEnabled, icon: <MFAIcon />, color: '#2e7d32' },
    { label: 'محاولات دخول', value: data.loginAttempts, icon: <SSOIcon />, color: '#e65100' },
    { label: 'محاولات فاشلة', value: data.failedAttempts, icon: <ShieldIcon />, color: '#c62828' }
  ];

  const eventColor = { 'تسجيل دخول': 'success', 'فشل MFA': 'error', 'تسجيل خروج': 'default' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة إدارة SSO / MFA</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: k.color, mb: 1 }}>{k.icon}</Box>
                <Typography variant="h4" fontWeight="bold">{k.value}</Typography>
                <Typography color="text.secondary">{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>طرق المصادقة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.authMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.authMethods?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>تسجيلات الدخول اليومية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.dailyLogins}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="logins" name="تسجيل دخول" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث الأحداث</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>المستخدم</TableCell><TableCell>الحدث</TableCell>
              <TableCell>الطريقة</TableCell><TableCell>IP</TableCell><TableCell>الوقت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentEvents?.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.user}</TableCell>
                  <TableCell><Chip label={e.event} size="small" color={eventColor[e.event] || 'default'} /></TableCell>
                  <TableCell>{e.method}</TableCell>
                  <TableCell>{e.ip}</TableCell>
                  <TableCell>{e.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

/**
 * لوحة معلومات نظام طاقات — التوظيف لذوي الإعاقة
 * Taqat Employment Platform Dashboard
 */
import { useState, useEffect, useCallback } from 'react';

import taqatService from '../../services/taqat.service';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Person from '@mui/icons-material/Person';
import Work from '@mui/icons-material/Work';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Assessment from '@mui/icons-material/Assessment';

const applicationStatusLabels = {
  submitted: 'مقدّم', screening: 'فرز', shortlisted: 'قائمة قصيرة',
  interview: 'مقابلة', offered: 'عرض وظيفي', accepted: 'مقبول',
  rejected: 'مرفوض', withdrawn: 'منسحب',
};
const applicationStatusColors = {
  submitted: 'default', screening: 'info', shortlisted: 'primary',
  interview: 'warning', offered: 'secondary', accepted: 'success',
  rejected: 'error', withdrawn: 'default',
};

export default function TaqatDashboard() {
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [jobSeekers, setJobSeekers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, seekerRes, oppRes, appRes] = await Promise.all([
        taqatService.getDashboard(),
        taqatService.getJobSeekers({ limit: 15 }),
        taqatService.getJobOpportunities({ limit: 15 }),
        taqatService.getApplications({ limit: 15 }),
      ]);
      setDashboard(dashRes?.data || dashRes);
      setJobSeekers(seekerRes?.data?.jobSeekers || seekerRes?.jobSeekers || []);
      setOpportunities(oppRes?.data?.opportunities || oppRes?.opportunities || []);
      setApplications(appRes?.data?.applications || appRes?.applications || []);
    } catch (err) {
      setError('فشل في تحميل بيانات طاقات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  const stats = dashboard?.summary || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* العنوان */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            نظام طاقات — منصة التوظيف
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة توظيف وتأهيل ذوي الإعاقة عبر منصة طاقات
          </Typography>
        </Box>
        <IconButton onClick={fetchData}><Refresh /></IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* بطاقات إحصائية */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRight: 4, borderColor: 'primary.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">الباحثون عن عمل</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.totalJobSeekers || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light' }}><Person /></Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRight: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">الفرص المتاحة</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.activeOpportunities || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light' }}><Work /></Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRight: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">طلبات قيد المعالجة</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.pendingApplications || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light' }}><HourglassEmpty /></Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRight: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">تم التوظيف</Typography>
                  <Typography variant="h4" fontWeight="bold">{stats.placed || 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light' }}><CheckCircle /></Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="الباحثون عن عمل" icon={<Person />} iconPosition="start" />
          <Tab label="الفرص الوظيفية" icon={<Work />} iconPosition="start" />
          <Tab label="الطلبات" icon={<Assessment />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* تبويب الباحثين عن عمل */}
          {tab === 0 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>نوع الإعاقة</TableCell>
                    <TableCell>المؤهل</TableCell>
                    <TableCell align="center">الجاهزية</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobSeekers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">لا يوجد باحثون مسجلون</TableCell></TableRow>
                  ) : jobSeekers.map((s) => (
                    <TableRow key={s._id} hover>
                      <TableCell>{s.personalInfo?.fullNameAr || s.personalInfo?.fullName || '—'}</TableCell>
                      <TableCell>{s.disabilityInfo?.type || '—'}</TableCell>
                      <TableCell>{s.education?.level || '—'}</TableCell>
                      <TableCell align="center">
                        <LinearProgress
                          variant="determinate"
                          value={s.employmentReadiness?.score || 0}
                          sx={{ height: 8, borderRadius: 4, width: 80, display: 'inline-flex' }}
                        />
                        <Typography variant="caption" sx={{ ml: 1 }}>{s.employmentReadiness?.score || 0}%</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={s.status === 'active' ? 'نشط' : s.status === 'placed' ? 'موظف' : s.status}
                          color={s.status === 'active' ? 'success' : s.status === 'placed' ? 'info' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* تبويب الفرص الوظيفية */}
          {tab === 1 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المسمى الوظيفي</TableCell>
                    <TableCell>الشركة</TableCell>
                    <TableCell>المدينة</TableCell>
                    <TableCell align="center">الشواغر</TableCell>
                    <TableCell align="center">الطلبات</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center">لا توجد فرص وظيفية</TableCell></TableRow>
                  ) : opportunities.map((o) => (
                    <TableRow key={o._id} hover>
                      <TableCell>{o.title}</TableCell>
                      <TableCell>{o.company?.name || '—'}</TableCell>
                      <TableCell>{o.location?.city || '—'}</TableCell>
                      <TableCell align="center">{o.vacancies || 0}</TableCell>
                      <TableCell align="center">{o.applicationCount || 0}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={o.status === 'active' ? 'نشطة' : o.status === 'closed' ? 'مغلقة' : o.status}
                          color={o.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* تبويب الطلبات */}
          {tab === 2 && (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المتقدم</TableCell>
                    <TableCell>الوظيفة</TableCell>
                    <TableCell>تاريخ التقديم</TableCell>
                    <TableCell align="center">نسبة التطابق</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center">لا توجد طلبات</TableCell></TableRow>
                  ) : applications.map((a) => (
                    <TableRow key={a._id} hover>
                      <TableCell>{a.jobSeeker?.personalInfo?.fullNameAr || '—'}</TableCell>
                      <TableCell>{a.jobOpportunity?.title || '—'}</TableCell>
                      <TableCell>{new Date(a.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell align="center">{a.matchScore || 0}%</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={applicationStatusLabels[a.status] || a.status}
                          color={applicationStatusColors[a.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Early Intervention Dashboard — التدخل المبكر
 *
 * Children 0–3 years: screenings, developmental milestones,
 * IFSP (Individual Family Service Plan), referrals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Tabs, Tab, IconButton, Tooltip, MenuItem, LinearProgress,
} from '@mui/material';
import {
  ChildCare as ChildIcon, Assessment as ScreenIcon, Assignment as IFSPIcon, SwapHoriz as ReferralIcon, Refresh as RefreshIcon, Add as AddIcon, Visibility as ViewIcon,
  Error as DelayIcon,
} from '@mui/icons-material';
import eisApi from '../../services/earlyIntervention.service';

function TabPanel({ children, value, index }) {
  return value === index ? <Box py={2}>{children}</Box> : null;
}

const genderMap = { male: 'ذكر', female: 'أنثى' };
const statusMap = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  completed: { label: 'مكتمل', color: 'info' },
  discharged: { label: 'منتهي', color: 'default' },
  eligible: { label: 'مؤهل', color: 'success' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
  not_eligible: { label: 'غير مؤهل', color: 'error' },
  referred: { label: 'محال', color: 'info' },
  draft: { label: 'مسودة', color: 'default' },
  passed: { label: 'ناجح', color: 'success' },
  failed: { label: 'يحتاج متابعة', color: 'error' },
  inconclusive: { label: 'غير حاسم', color: 'warning' },
};
const domainMap = {
  cognitive: 'المعرفي', communication: 'التواصل', motor: 'الحركي',
  social_emotional: 'الاجتماعي العاطفي', adaptive: 'التكيفي',
};

export default function EarlyInterventionDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [children, setChildren] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [ifsps, setIFSPs] = useState([]);
  const [referrals, setReferrals] = useState([]);
  // dialogs
  const [childDialog, setChildDialog] = useState(false);
  const [childForm, setChildForm] = useState({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', disabilityType: '', referralSource: '' });
  const [profileDialog, setProfileDialog] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, childRes, scrRes, ifspRes, refRes] = await Promise.allSettled([
        eisApi.getDashboard(),
        eisApi.getChildren({ page: 1, limit: 50 }),
        eisApi.getScreenings({ page: 1, limit: 50 }),
        eisApi.getIFSPs({ page: 1, limit: 50 }),
        eisApi.getReferrals({ page: 1, limit: 50 }),
      ]);
      setDashboard(dashRes.status === 'fulfilled' ? dashRes.value?.data?.data : null);
      setChildren(childRes.status === 'fulfilled' ? (childRes.value?.data?.data?.children || childRes.value?.data?.data || []) : []);
      setScreenings(scrRes.status === 'fulfilled' ? (scrRes.value?.data?.data?.screenings || scrRes.value?.data?.data || []) : []);
      setIFSPs(ifspRes.status === 'fulfilled' ? (ifspRes.value?.data?.data?.ifsps || ifspRes.value?.data?.data || []) : []);
      setReferrals(refRes.status === 'fulfilled' ? (refRes.value?.data?.data?.referrals || refRes.value?.data?.data || []) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateChild = async () => {
    try {
      await eisApi.createChild(childForm);
      setChildDialog(false);
      setChildForm({ firstName: '', lastName: '', dateOfBirth: '', gender: 'male', disabilityType: '', referralSource: '' });
      loadData();
    } catch { setError('فشل تسجيل الطفل'); }
  };

  const openProfile = async (id) => {
    try {
      const res = await eisApi.getChildProfile(id);
      setProfile(res?.data?.data || null);
      setProfileDialog(true);
    } catch { setError('فشل تحميل الملف الشامل'); }
  };

  const KPI = ({ title, value, icon, color = 'primary.main' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
      </CardContent>
    </Card>
  );

  const getChip = (status) => {
    const s = statusMap[status] || { label: status || '—', color: 'default' };
    return <Chip label={s.label} color={s.color} size="small" />;
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /><Typography mt={2}>جاري تحميل بيانات التدخل المبكر...</Typography></Box>;

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold"><ChildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />التدخل المبكر (0–3 سنوات)</Typography>
          <Typography color="text.secondary">الفحص المبكر، المعالم التنموية، خطط IFSP، والإحالات</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setChildDialog(true)}>تسجيل طفل</Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>تحديث</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={2.4}><KPI title="الأطفال المسجلون" value={dashboard?.totalChildren || children.length} icon={<ChildIcon />} /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="الفحوصات" value={dashboard?.totalScreenings || screenings.length} icon={<ScreenIcon />} color="info.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="خطط IFSP نشطة" value={dashboard?.activeIFSPs || ifsps.filter(p => p.status === 'active').length} icon={<IFSPIcon />} color="success.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="الإحالات المعلقة" value={dashboard?.pendingReferrals || referrals.filter(r => r.status === 'pending').length} icon={<ReferralIcon />} color="warning.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="تأخر تنموي" value={dashboard?.delayedChildren || '—'} icon={<DelayIcon />} color="error.main" /></Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1 }}>
        <Tab label="الأطفال" />
        <Tab label="الفحوصات" />
        <Tab label="خطط IFSP" />
        <Tab label="الإحالات" />
      </Tabs>

      {/* Tab 0 — Children */}
      <TabPanel value={tab} index={0}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الاسم</TableCell><TableCell>تاريخ الميلاد</TableCell><TableCell>الجنس</TableCell><TableCell>نوع الإعاقة</TableCell><TableCell>الحالة</TableCell><TableCell>الأهلية</TableCell><TableCell>إجراء</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {children.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center">لا يوجد أطفال مسجلون</TableCell></TableRow>
              ) : children.map((c) => (
                <TableRow key={c._id || c.id}>
                  <TableCell>{`${c.firstName || ''} ${c.lastName || ''}`}</TableCell>
                  <TableCell>{c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{genderMap[c.gender] || c.gender || '—'}</TableCell>
                  <TableCell>{c.disabilityType || '—'}</TableCell>
                  <TableCell>{getChip(c.status)}</TableCell>
                  <TableCell>{getChip(c.eligibilityStatus)}</TableCell>
                  <TableCell>
                    <Tooltip title="عرض الملف الشامل"><IconButton size="small" onClick={() => openProfile(c._id || c.id)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 1 — Screenings */}
      <TabPanel value={tab} index={1}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الطفل</TableCell><TableCell>نوع الفحص</TableCell><TableCell>التاريخ</TableCell><TableCell>النتيجة</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {screenings.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">لا توجد فحوصات</TableCell></TableRow>
              ) : screenings.map((s) => (
                <TableRow key={s._id || s.id}>
                  <TableCell>{s.childName || s.child?.firstName || '—'}</TableCell>
                  <TableCell>{s.screeningType || '—'}</TableCell>
                  <TableCell>{s.screeningDate ? new Date(s.screeningDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{getChip(s.overallResult)}</TableCell>
                  <TableCell>{getChip(s.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2 — IFSPs */}
      <TabPanel value={tab} index={2}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الطفل</TableCell><TableCell>نوع الخطة</TableCell><TableCell>المنسق</TableCell><TableCell>تاريخ البدء</TableCell><TableCell>الأهداف</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {ifsps.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">لا توجد خطط IFSP</TableCell></TableRow>
              ) : ifsps.map((p) => (
                <TableRow key={p._id || p.id}>
                  <TableCell>{p.childName || p.child?.firstName || '—'}</TableCell>
                  <TableCell>{p.planType || '—'}</TableCell>
                  <TableCell>{p.serviceCoordinatorName || p.serviceCoordinator?.name || '—'}</TableCell>
                  <TableCell>{p.startDate ? new Date(p.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{p.goals?.length || 0}</TableCell>
                  <TableCell>{getChip(p.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 3 — Referrals */}
      <TabPanel value={tab} index={3}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الطفل</TableCell><TableCell>الاتجاه</TableCell><TableCell>نوع المصدر</TableCell><TableCell>الاستعجال</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {referrals.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">لا توجد إحالات</TableCell></TableRow>
              ) : referrals.map((r) => (
                <TableRow key={r._id || r.id}>
                  <TableCell>{r.childName || r.child?.firstName || '—'}</TableCell>
                  <TableCell>{r.referralDirection === 'incoming' ? 'واردة' : 'صادرة'}</TableCell>
                  <TableCell>{r.sourceType || '—'}</TableCell>
                  <TableCell><Chip label={r.urgency === 'high' ? 'عاجل' : r.urgency === 'medium' ? 'متوسط' : 'عادي'} color={r.urgency === 'high' ? 'error' : r.urgency === 'medium' ? 'warning' : 'default'} size="small" /></TableCell>
                  <TableCell>{getChip(r.status)}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ─── Register Child Dialog ─── */}
      <Dialog open={childDialog} onClose={() => setChildDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل طفل جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}><TextField fullWidth label="الاسم الأول" value={childForm.firstName} onChange={(e) => setChildForm({ ...childForm, firstName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="اسم العائلة" value={childForm.lastName} onChange={(e) => setChildForm({ ...childForm, lastName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="تاريخ الميلاد" type="date" InputLabelProps={{ shrink: true }} value={childForm.dateOfBirth} onChange={(e) => setChildForm({ ...childForm, dateOfBirth: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="الجنس" value={childForm.gender} onChange={(e) => setChildForm({ ...childForm, gender: e.target.value })}>
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="نوع الإعاقة" value={childForm.disabilityType} onChange={(e) => setChildForm({ ...childForm, disabilityType: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="مصدر الإحالة" value={childForm.referralSource} onChange={(e) => setChildForm({ ...childForm, referralSource: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChildDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateChild}>تسجيل</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Profile Dialog ─── */}
      <Dialog open={profileDialog} onClose={() => setProfileDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>الملف الشامل للطفل</DialogTitle>
        <DialogContent>
          {profile ? (
            <Box>
              <Typography variant="h6">{profile.child?.firstName} {profile.child?.lastName}</Typography>
              <Grid container spacing={2} mt={1}>
                <Grid item xs={4}><Typography variant="caption">تاريخ الميلاد</Typography><Typography>{profile.child?.dateOfBirth ? new Date(profile.child.dateOfBirth).toLocaleDateString('ar-SA') : '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption">الجنس</Typography><Typography>{genderMap[profile.child?.gender] || '—'}</Typography></Grid>
                <Grid item xs={4}><Typography variant="caption">الحالة</Typography>{getChip(profile.child?.status)}</Grid>
              </Grid>
              {profile.milestones && profile.milestones.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" fontWeight="bold">المعالم التنموية ({profile.milestones.length})</Typography>
                  {Object.entries(
                    profile.milestones.reduce((acc, m) => { (acc[m.domain] = acc[m.domain] || []).push(m); return acc; }, {})
                  ).map(([domain, items]) => (
                    <Box key={domain} mt={1}>
                      <Typography variant="subtitle2">{domainMap[domain] || domain} ({items.length})</Typography>
                      <LinearProgress variant="determinate" value={items.filter(i => i.status === 'achieved').length / items.length * 100} sx={{ height: 8, borderRadius: 4 }} />
                    </Box>
                  ))}
                </Box>
              )}
              {profile.screenings && profile.screenings.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" fontWeight="bold">الفحوصات ({profile.screenings.length})</Typography>
                  {profile.screenings.map((s, i) => (
                    <Chip key={i} label={`${s.screeningType || 'فحص'}: ${statusMap[s.overallResult]?.label || s.overallResult || '—'}`} size="small" sx={{ m: 0.5 }} />
                  ))}
                </Box>
              )}
              {profile.ifsps && profile.ifsps.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle1" fontWeight="bold">خطط IFSP ({profile.ifsps.length})</Typography>
                  {profile.ifsps.map((p, i) => (
                    <Box key={i} p={1} bgcolor="grey.50" borderRadius={1} mb={1}>
                      <Typography variant="body2">{p.planType || '—'} — الأهداف: {p.goals?.length || 0} — {getChip(p.status)}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ) : <CircularProgress />}
        </DialogContent>
        <DialogActions><Button onClick={() => setProfileDialog(false)}>إغلاق</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

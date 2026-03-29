/**
 * Business Continuity & Disaster Recovery Page
 * صفحة استمرارية الأعمال والتعافي من الكوارث
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Alert, LinearProgress, Stack, IconButton, Divider,
} from '@mui/material';
import {
  Shield as ShieldIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
  LocalFireDepartment as CrisisIcon,
  School as DrillIcon,
  Storage as DRIcon,
  Refresh as RefreshIcon,
  PriorityHigh as HighIcon,
} from '@mui/icons-material';
import * as bcpService from '../../services/enterpriseUltra.service';

const statusColors = {
  draft: 'default', under_review: 'secondary', approved: 'success', active: 'success', outdated: 'warning', archived: 'default',
  in_progress: 'warning', completed: 'success',
  detected: 'error', assessing: 'warning', responding: 'info', escalated: 'error', contained: 'primary', recovering: 'secondary', resolved: 'success', post_mortem: 'default',
  planned: 'info', cancelled: 'error', scheduled: 'info',
  not_tested: 'warning', tested: 'success', failed_test: 'error',
};

const severityColors = { critical: 'error', high: 'warning', medium: 'info', low: 'default' };

export default function BusinessContinuityPage() {
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [bias, setBias] = useState([]);
  const [crises, setCrises] = useState([]);
  const [drills, setDrills] = useState([]);
  const [drPlans, setDrPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, biasRes, crisesRes, drillsRes, drRes, statsRes] = await Promise.all([
        bcpService.getBCPPlans(),
        bcpService.getBusinessImpactAnalyses(),
        bcpService.getCrisisIncidents(),
        bcpService.getBCDrills(),
        bcpService.getDisasterRecoveryPlans(),
        bcpService.getBCPDashboard(),
      ]);
      setPlans(plansRes.data?.data || []);
      setBias(biasRes.data?.data || []);
      setCrises(crisesRes.data?.data || []);
      setDrills(drillsRes.data?.data || []);
      setDrPlans(drRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'plan') await bcpService.createBCPPlan(form);
      else if (dialog.type === 'bia') await bcpService.createBusinessImpactAnalysis(form);
      else if (dialog.type === 'crisis') await bcpService.createCrisisIncident(form);
      else if (dialog.type === 'drill') await bcpService.createBCDrill(form);
      else if (dialog.type === 'dr') await bcpService.createDisasterRecoveryPlan(form);
      setDialog({ open: false, type: '' });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openDialog = (type) => { setDialog({ open: true, type }); setForm({}); setError(''); };

  const activeCrises = crises.filter(c => !['resolved', 'post_mortem'].includes(c.status));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldIcon color="primary" fontSize="large" /> استمرارية الأعمال والتعافي
          </Typography>
          <Typography variant="body2" color="text.secondary">إدارة خطط استمرارية الأعمال والاستجابة للأزمات</Typography>
        </Box>
        <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Active Crisis Alert */}
      {activeCrises.length > 0 && (
        <Alert severity="error" icon={<CrisisIcon />} sx={{ mb: 2 }}>
          تنبيه: يوجد {activeCrises.length} أزمة نشطة تتطلب استجابة فورية!
        </Alert>
      )}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'خطط BCP', value: stats.totalPlans || 0, color: '#1976d2' },
          { label: 'أزمات نشطة', value: activeCrises.length, color: '#d32f2f' },
          { label: 'تمارين مكتملة', value: stats.completedDrills || 0, color: '#2e7d32' },
          { label: 'خطط DR', value: drPlans.length, color: '#9c27b0' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ background: `linear-gradient(135deg, ${s.color}15, ${s.color}08)`, borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`خطط BCP (${plans.length})`} icon={<ShieldIcon />} iconPosition="start" />
        <Tab label={`تحليل الأثر (${bias.length})`} icon={<AssessmentIcon />} iconPosition="start" />
        <Tab label={`الأزمات (${crises.length})`} icon={<CrisisIcon />} iconPosition="start" />
        <Tab label={`التمارين (${drills.length})`} icon={<DrillIcon />} iconPosition="start" />
        <Tab label={`خطط DR (${drPlans.length})`} icon={<DRIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: BCP Plans */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('plan')} sx={{ mb: 2 }}>خطة جديدة</Button>
          <Grid container spacing={2}>
            {plans.map((p) => (
              <Grid item xs={12} md={4} key={p._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{p.planName}</Typography>
                      <Chip size="small" color={statusColors[p.status] || 'default'} label={p.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{p.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">النطاق: {p.scope}</Typography><br />
                    <Typography variant="caption">الإصدار: {p.version}</Typography><br />
                    <Typography variant="caption">RTO: {p.rto || '—'} | RPO: {p.rpo || '—'}</Typography>
                    {p.nextReviewDate && (
                      <Typography variant="caption" color={new Date(p.nextReviewDate) < new Date() ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 1 }}>
                        المراجعة القادمة: {new Date(p.nextReviewDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!plans.length && <Grid item xs={12}><Alert severity="info">لا توجد خطط BCP</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 1: BIA */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('bia')} sx={{ mb: 2 }}>تحليل جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>العملية</TableCell><TableCell>القسم</TableCell><TableCell>الأهمية</TableCell>
                <TableCell>الأثر المالي</TableCell><TableCell>RTO</TableCell><TableCell>الحالة</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {bias.map((b) => (
                  <TableRow key={b._id} hover>
                    <TableCell><Typography fontWeight="bold" variant="body2">{b.processName}</Typography></TableCell>
                    <TableCell>{b.department}</TableCell>
                    <TableCell><Chip size="small" color={severityColors[b.criticality] || 'default'} label={b.criticality} /></TableCell>
                    <TableCell>{b.financialImpact ? `${b.financialImpact.toLocaleString()} ر.س` : '—'}</TableCell>
                    <TableCell>{b.rto || '—'}</TableCell>
                    <TableCell><Chip size="small" color={statusColors[b.status] || 'default'} label={b.status?.replace(/_/g, ' ')} /></TableCell>
                  </TableRow>
                ))}
                {!bias.length && <TableRow><TableCell colSpan={6} align="center">لا توجد تحليلات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Crisis Incidents */}
      {tab === 2 && (
        <Box>
          <Button variant="contained" color="error" startIcon={<AddIcon />} onClick={() => openDialog('crisis')} sx={{ mb: 2 }}>تسجيل أزمة</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>المعرف</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
                <TableCell>الشدة</TableCell><TableCell>الحالة</TableCell><TableCell>بدء الأزمة</TableCell><TableCell>المتأثرون</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {crises.map((c) => (
                  <TableRow key={c._id} hover sx={{ bgcolor: ['detected', 'escalated'].includes(c.status) ? 'error.50' : 'inherit' }}>
                    <TableCell><Typography fontWeight="bold" variant="body2">{c.incidentId}</Typography></TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell><Chip size="small" label={c.incidentType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>
                      <Chip size="small" color={severityColors[c.severity] || 'default'} label={c.severity}
                        icon={c.severity === 'critical' ? <HighIcon /> : undefined} />
                    </TableCell>
                    <TableCell><Chip size="small" color={statusColors[c.status] || 'default'} label={c.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{new Date(c.detectedAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{c.impactedAreas?.length || 0} مناطق</TableCell>
                  </TableRow>
                ))}
                {!crises.length && <TableRow><TableCell colSpan={7} align="center">لا توجد أزمات مسجلة</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 3: Drills */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('drill')} sx={{ mb: 2 }}>تمرين جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>اسم التمرين</TableCell><TableCell>النوع</TableCell><TableCell>التاريخ</TableCell>
                <TableCell>الحالة</TableCell><TableCell>النتيجة</TableCell><TableCell>المشاركون</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {drills.map((d) => (
                  <TableRow key={d._id} hover>
                    <TableCell><Typography fontWeight="bold" variant="body2">{d.drillName}</Typography></TableCell>
                    <TableCell><Chip size="small" label={d.drillType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{new Date(d.scheduledDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell><Chip size="small" color={statusColors[d.status] || 'default'} label={d.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{d.score !== null ? `${d.score}%` : '—'}</TableCell>
                    <TableCell>{d.participants?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {!drills.length && <TableRow><TableCell colSpan={6} align="center">لا توجد تمارين</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 4: Disaster Recovery Plans */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('dr')} sx={{ mb: 2 }}>خطة DR جديدة</Button>
          <Grid container spacing={2}>
            {drPlans.map((d) => (
              <Grid item xs={12} md={4} key={d._id}>
                <Card variant="outlined" sx={{ borderColor: d.status === 'active' ? 'success.main' : 'divider' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{d.planName}</Typography>
                      <Chip size="small" color={statusColors[d.status] || 'default'} label={d.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{d.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">RTO: {d.rto || '—'}</Typography><br />
                    <Typography variant="caption">RPO: {d.rpo || '—'}</Typography><br />
                    <Typography variant="caption">آخر اختبار: {d.lastTestedDate ? new Date(d.lastTestedDate).toLocaleDateString('ar-SA') : 'لم يختبر'}</Typography>
                    <Chip size="small" color={statusColors[d.testStatus] || 'default'} label={d.testStatus?.replace(/_/g, ' ') || '—'} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!drPlans.length && <Grid item xs={12}><Alert severity="info">لا توجد خطط DR</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, type: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.type === 'plan' && 'خطة استمرارية أعمال جديدة'}
          {dialog.type === 'bia' && 'تحليل أثر جديد'}
          {dialog.type === 'crisis' && 'تسجيل أزمة جديدة'}
          {dialog.type === 'drill' && 'تمرين جديد'}
          {dialog.type === 'dr' && 'خطة تعافي من كوارث جديدة'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'plan' && (<>
              <TextField label="اسم الخطة" fullWidth value={form.planName || ''} onChange={e => setForm({ ...form, planName: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <TextField label="النطاق" fullWidth value={form.scope || ''} onChange={e => setForm({ ...form, scope: e.target.value })} />
              <Grid container spacing={1}>
                <Grid item xs={6}><TextField label="RTO (ساعات)" fullWidth type="number" value={form.rto || ''} onChange={e => setForm({ ...form, rto: e.target.value })} /></Grid>
                <Grid item xs={6}><TextField label="RPO (ساعات)" fullWidth type="number" value={form.rpo || ''} onChange={e => setForm({ ...form, rpo: e.target.value })} /></Grid>
              </Grid>
            </>)}
            {dialog.type === 'bia' && (<>
              <TextField label="اسم العملية" fullWidth value={form.processName || ''} onChange={e => setForm({ ...form, processName: e.target.value })} />
              <TextField label="القسم" fullWidth value={form.department || ''} onChange={e => setForm({ ...form, department: e.target.value })} />
              <TextField select label="الأهمية" fullWidth value={form.criticality || ''} onChange={e => setForm({ ...form, criticality: e.target.value })}>
                {['critical', 'high', 'medium', 'low'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField label="الأثر المالي (ر.س)" fullWidth type="number" value={form.financialImpact || ''} onChange={e => setForm({ ...form, financialImpact: e.target.value })} />
            </>)}
            {dialog.type === 'crisis' && (<>
              <TextField label="عنوان الأزمة" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.incidentType || ''} onChange={e => setForm({ ...form, incidentType: e.target.value })}>
                {['natural_disaster', 'cyber_attack', 'pandemic', 'supply_chain', 'financial', 'reputational', 'infrastructure', 'regulatory'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField select label="الشدة" fullWidth value={form.severity || ''} onChange={e => setForm({ ...form, severity: e.target.value })}>
                {['critical', 'high', 'medium', 'low'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'drill' && (<>
              <TextField label="اسم التمرين" fullWidth value={form.drillName || ''} onChange={e => setForm({ ...form, drillName: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.drillType || ''} onChange={e => setForm({ ...form, drillType: e.target.value })}>
                {['tabletop', 'walkthrough', 'simulation', 'full_scale', 'functional'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="التاريخ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.scheduledDate || ''} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
              <TextField label="السيناريو" fullWidth multiline rows={2} value={form.scenario || ''} onChange={e => setForm({ ...form, scenario: e.target.value })} />
            </>)}
            {dialog.type === 'dr' && (<>
              <TextField label="اسم الخطة" fullWidth value={form.planName || ''} onChange={e => setForm({ ...form, planName: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <Grid container spacing={1}>
                <Grid item xs={6}><TextField label="RTO (ساعات)" fullWidth type="number" value={form.rto || ''} onChange={e => setForm({ ...form, rto: e.target.value })} /></Grid>
                <Grid item xs={6}><TextField label="RPO (ساعات)" fullWidth type="number" value={form.rpo || ''} onChange={e => setForm({ ...form, rpo: e.target.value })} /></Grid>
              </Grid>
            </>)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, type: '' })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

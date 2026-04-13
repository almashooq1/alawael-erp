/**
 * Legal & Contract Lifecycle Management Page
 * صفحة إدارة الشؤون القانونية ودورة حياة العقود
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import * as legalService from '../../services/enterpriseUltra.service';

const statusColors = {
  open: 'info', in_progress: 'warning', hearing_scheduled: 'secondary', won: 'success', lost: 'error', settled: 'default', closed: 'default',
  active: 'success', expired: 'error', revoked: 'warning', draft: 'default', pending_notarization: 'info',
  requested: 'info', in_review: 'warning', delivered: 'success', approved: 'success',
  upcoming: 'info', in_preparation: 'warning', submitted: 'primary', under_review: 'secondary', overdue: 'error', rejected: 'error',
  scheduled: 'info', completed: 'success', postponed: 'warning', cancelled: 'error',
};

const priorityColors = { critical: 'error', high: 'warning', medium: 'info', low: 'default', urgent: 'error', normal: 'info' };

export default function LegalManagementPage() {
  const [tab, setTab] = useState(0);
  const [cases, setCases] = useState([]);
  const [hearings, setHearings] = useState([]);
  const [poas, setPoas] = useState([]);
  const [opinions, setOpinions] = useState([]);
  const [filings, setFilings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, hearingsRes, poasRes, opinionsRes, filingsRes, statsRes] = await Promise.all([
        legalService.getLegalCases(),
        legalService.getCourtHearings(),
        legalService.getPowerOfAttorneys(),
        legalService.getLegalOpinions(),
        legalService.getRegulatoryFilings(),
        legalService.getLegalDashboard(),
      ]);
      setCases(casesRes.data?.data || []);
      setHearings(hearingsRes.data?.data || []);
      setPoas(poasRes.data?.data || []);
      setOpinions(opinionsRes.data?.data || []);
      setFilings(filingsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'case') await legalService.createLegalCase(form);
      else if (dialog.type === 'hearing') await legalService.createCourtHearing(form);
      else if (dialog.type === 'poa') await legalService.createPowerOfAttorney(form);
      else if (dialog.type === 'opinion') await legalService.createLegalOpinion(form);
      else if (dialog.type === 'filing') await legalService.createRegulatoryFiling(form);
      setDialog({ open: false, type: '' });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openDialog = (type) => { setDialog({ open: true, type }); setForm({}); setError(''); };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon color="primary" fontSize="large" /> إدارة الشؤون القانونية
          </Typography>
          <Typography variant="body2" color="text.secondary">إدارة القضايا والجلسات والتوكيلات والفتاوى القانونية</Typography>
        </Box>
        <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي القضايا', value: stats.total || 0, color: '#1976d2' },
          { label: 'قضايا نشطة', value: stats.open || 0, color: '#ed6c02' },
          { label: 'قضايا مكسوبة', value: stats.won || 0, color: '#2e7d32' },
          { label: 'معدل النشاط', value: `${stats.activeRate || 0}%`, color: '#9c27b0' },
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
        <Tab label={`القضايا (${cases.length})`} icon={<GavelIcon />} iconPosition="start" />
        <Tab label={`الجلسات (${hearings.length})`} icon={<CourtIcon />} iconPosition="start" />
        <Tab label={`التوكيلات (${poas.length})`} icon={<DescriptionIcon />} iconPosition="start" />
        <Tab label={`الفتاوى القانونية (${opinions.length})`} icon={<FilingIcon />} iconPosition="start" />
        <Tab label={`الإيداعات التنظيمية (${filings.length})`} icon={<EventIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Legal Cases */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('case')} sx={{ mb: 2 }}>قضية جديدة</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>رقم القضية</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell><TableCell>الأولوية</TableCell><TableCell>المحكمة</TableCell>
                <TableCell>الجلسة القادمة</TableCell><TableCell>المبلغ</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c._id} hover>
                    <TableCell><Typography variant="body2" fontWeight="bold">{c.caseNumber}</Typography></TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell><Chip size="small" label={c.caseType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[c.status] || 'default'} label={c.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={priorityColors[c.priority] || 'default'} label={c.priority} /></TableCell>
                    <TableCell>{c.court?.name || '—'}</TableCell>
                    <TableCell>{c.nextHearingDate ? new Date(c.nextHearingDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>{c.claimAmount ? `${c.claimAmount.toLocaleString()} ر.س` : '—'}</TableCell>
                  </TableRow>
                ))}
                {!cases.length && <TableRow><TableCell colSpan={8} align="center">لا توجد قضايا</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Court Hearings */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('hearing')} sx={{ mb: 2 }}>جلسة جديدة</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>القضية</TableCell><TableCell>تاريخ الجلسة</TableCell><TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell><TableCell>المحكمة</TableCell><TableCell>النتيجة</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {hearings.map((h) => (
                  <TableRow key={h._id} hover>
                    <TableCell>{h.case?.caseNumber || h.case}</TableCell>
                    <TableCell>{new Date(h.hearingDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell><Chip size="small" label={h.hearingType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[h.status] || 'default'} label={h.status} /></TableCell>
                    <TableCell>{h.location?.court || '—'}</TableCell>
                    <TableCell>{h.outcome || '—'}</TableCell>
                  </TableRow>
                ))}
                {!hearings.length && <TableRow><TableCell colSpan={6} align="center">لا توجد جلسات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Power of Attorney */}
      {tab === 2 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('poa')} sx={{ mb: 2 }}>توكيل جديد</Button>
          <Grid container spacing={2}>
            {poas.map((p) => (
              <Grid item xs={12} md={4} key={p._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{p.poaNumber}</Typography>
                      <Chip size="small" color={statusColors[p.status] || 'default'} label={p.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" gutterBottom>{p.title}</Typography>
                    <Typography variant="caption" color="text.secondary">النوع: {p.poaType?.replace(/_/g, ' ')}</Typography>
                    <Box mt={1}>
                      <Typography variant="caption">المانح: {p.grantor?.name || '—'}</Typography><br />
                      <Typography variant="caption">المفوض: {p.grantee?.name || '—'}</Typography>
                    </Box>
                    {p.expiryDate && (
                      <Typography variant="caption" color={new Date(p.expiryDate) < new Date() ? 'error' : 'text.secondary'} sx={{ mt: 1, display: 'block' }}>
                        الانتهاء: {new Date(p.expiryDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!poas.length && <Grid item xs={12}><Alert severity="info">لا توجد توكيلات</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 3: Legal Opinions */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('opinion')} sx={{ mb: 2 }}>طلب فتوى</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>التصنيف</TableCell>
                <TableCell>الحالة</TableCell><TableCell>الأولوية</TableCell><TableCell>تاريخ التسليم</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {opinions.map((o) => (
                  <TableRow key={o._id} hover>
                    <TableCell>{o.opinionNumber}</TableCell>
                    <TableCell>{o.title}</TableCell>
                    <TableCell><Chip size="small" label={o.category?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[o.status] || 'default'} label={o.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={priorityColors[o.priority] || 'default'} label={o.priority} /></TableCell>
                    <TableCell>{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  </TableRow>
                ))}
                {!opinions.length && <TableRow><TableCell colSpan={6} align="center">لا توجد فتاوى</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 4: Regulatory Filings */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('filing')} sx={{ mb: 2 }}>إيداع جديد</Button>
          {filings.filter(f => f.status === 'overdue').length > 0 && (
            <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
              يوجد {filings.filter(f => f.status === 'overdue').length} إيداع متأخر يتطلب اهتمام فوري!
            </Alert>
          )}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>الجهة التنظيمية</TableCell>
                <TableCell>النوع</TableCell><TableCell>الحالة</TableCell><TableCell>تاريخ الاستحقاق</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {filings.map((f) => (
                  <TableRow key={f._id} hover sx={{ bgcolor: f.status === 'overdue' ? 'error.50' : 'inherit' }}>
                    <TableCell>{f.filingNumber}</TableCell>
                    <TableCell>{f.title}</TableCell>
                    <TableCell>{f.regulatoryBody}</TableCell>
                    <TableCell><Chip size="small" label={f.filingType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[f.status] || 'default'} label={f.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{new Date(f.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
                {!filings.length && <TableRow><TableCell colSpan={6} align="center">لا توجد إيداعات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, type: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.type === 'case' && 'قضية جديدة'}
          {dialog.type === 'hearing' && 'جلسة جديدة'}
          {dialog.type === 'poa' && 'توكيل جديد'}
          {dialog.type === 'opinion' && 'طلب فتوى قانونية'}
          {dialog.type === 'filing' && 'إيداع تنظيمي جديد'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'case' && (<>
              <TextField label="رقم القضية" fullWidth value={form.caseNumber || ''} onChange={e => setForm({ ...form, caseNumber: e.target.value })} />
              <TextField label="عنوان القضية" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="نوع القضية" fullWidth value={form.caseType || ''} onChange={e => setForm({ ...form, caseType: e.target.value })}>
                {['litigation', 'arbitration', 'labor_dispute', 'commercial', 'regulatory', 'ip', 'criminal', 'administrative'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField select label="الأولوية" fullWidth value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {['critical', 'high', 'medium', 'low'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </>)}
            {dialog.type === 'hearing' && (<>
              <TextField label="تاريخ الجلسة" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.hearingDate || ''} onChange={e => setForm({ ...form, hearingDate: e.target.value })} />
              <TextField select label="نوع الجلسة" fullWidth value={form.hearingType || ''} onChange={e => setForm({ ...form, hearingType: e.target.value })}>
                {['initial', 'discovery', 'trial', 'appeal', 'mediation', 'settlement', 'procedural'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </>)}
            {dialog.type === 'poa' && (<>
              <TextField label="رقم التوكيل" fullWidth value={form.poaNumber || ''} onChange={e => setForm({ ...form, poaNumber: e.target.value })} />
              <TextField label="العنوان" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.poaType || ''} onChange={e => setForm({ ...form, poaType: e.target.value })}>
                {['general', 'special', 'limited', 'durable', 'financial', 'healthcare', 'litigation'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="نطاق التوكيل" fullWidth multiline rows={2} value={form.scope || ''} onChange={e => setForm({ ...form, scope: e.target.value })} />
            </>)}
            {dialog.type === 'opinion' && (<>
              <TextField label="عنوان الفتوى" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="التصنيف" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['contract_review', 'compliance', 'risk_assessment', 'policy_interpretation', 'litigation_strategy', 'regulatory', 'employment_law', 'ip_protection'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="السؤال القانوني" fullWidth multiline rows={3} value={form.question || ''} onChange={e => setForm({ ...form, question: e.target.value })} />
            </>)}
            {dialog.type === 'filing' && (<>
              <TextField label="رقم الإيداع" fullWidth value={form.filingNumber || ''} onChange={e => setForm({ ...form, filingNumber: e.target.value })} />
              <TextField label="العنوان" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField label="الجهة التنظيمية" fullWidth value={form.regulatoryBody || ''} onChange={e => setForm({ ...form, regulatoryBody: e.target.value })} />
              <TextField label="تاريخ الاستحقاق" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.dueDate || ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
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

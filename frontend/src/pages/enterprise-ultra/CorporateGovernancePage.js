/**
 * Corporate Governance Page
 * صفحة الحوكمة المؤسسية
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Alert, LinearProgress, Stack, IconButton, Divider,
} from '@mui/material';
import {
  AccountBalance as GovernanceIcon,
  Add as AddIcon,
  Groups as GroupsIcon,
  HowToVote as VoteIcon,
  Policy as PolicyIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  EventNote as MeetingIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import * as govService from '../../services/enterpriseUltra.service';

const statusColors = {
  scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error',
  active: 'success', dissolved: 'error', suspended: 'warning',
  proposed: 'info', passed: 'success', rejected: 'error', tabled: 'warning', implemented: 'primary',
  draft: 'default', under_review: 'secondary', approved: 'success', published: 'primary',
  pending: 'warning', acknowledged: 'info',
};

export default function CorporateGovernancePage() {
  const [tab, setTab] = useState(0);
  const [meetings, setMeetings] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [resolutions, setResolutions] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [meetingsRes, committeesRes, resolutionsRes, policiesRes, reportsRes, statsRes] = await Promise.all([
        govService.getBoardMeetings(),
        govService.getBoardCommittees(),
        govService.getBoardResolutions(),
        govService.getGovernancePolicies(),
        govService.getGovernanceReports(),
        govService.getGovernanceDashboard(),
      ]);
      setMeetings(meetingsRes.data?.data || []);
      setCommittees(committeesRes.data?.data || []);
      setResolutions(resolutionsRes.data?.data || []);
      setPolicies(policiesRes.data?.data || []);
      setReports(reportsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'meeting') await govService.createBoardMeeting(form);
      else if (dialog.type === 'committee') await govService.createBoardCommittee(form);
      else if (dialog.type === 'resolution') await govService.createBoardResolution(form);
      else if (dialog.type === 'policy') await govService.createGovernancePolicy(form);
      else if (dialog.type === 'report') await govService.createGovernanceReport(form);
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
            <GovernanceIcon color="primary" fontSize="large" /> الحوكمة المؤسسية
          </Typography>
          <Typography variant="body2" color="text.secondary">إدارة مجلس الإدارة واللجان والقرارات والسياسات</Typography>
        </Box>
        <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'اجتماعات المجلس', value: stats.totalMeetings || 0, color: '#1976d2' },
          { label: 'اللجان النشطة', value: stats.activeCommittees || 0, color: '#ed6c02' },
          { label: 'القرارات المعتمدة', value: stats.passedResolutions || 0, color: '#2e7d32' },
          { label: 'السياسات المنشورة', value: stats.publishedPolicies || 0, color: '#9c27b0' },
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
        <Tab label={`الاجتماعات (${meetings.length})`} icon={<MeetingIcon />} iconPosition="start" />
        <Tab label={`اللجان (${committees.length})`} icon={<GroupsIcon />} iconPosition="start" />
        <Tab label={`القرارات (${resolutions.length})`} icon={<VoteIcon />} iconPosition="start" />
        <Tab label={`السياسات (${policies.length})`} icon={<PolicyIcon />} iconPosition="start" />
        <Tab label={`التقارير (${reports.length})`} icon={<ReportIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Board Meetings */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('meeting')} sx={{ mb: 2 }}>اجتماع جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
                <TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell><TableCell>النصاب</TableCell><TableCell>الحضور</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {meetings.map((m) => (
                  <TableRow key={m._id} hover>
                    <TableCell><Typography variant="body2" fontWeight="bold">{m.meetingNumber}</Typography></TableCell>
                    <TableCell>{m.title}</TableCell>
                    <TableCell><Chip size="small" label={m.meetingType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{new Date(m.scheduledDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell><Chip size="small" color={statusColors[m.status] || 'default'} label={m.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{m.quorumMet ? <CheckIcon color="success" fontSize="small" /> : '—'}</TableCell>
                    <TableCell>{m.attendees?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {!meetings.length && <TableRow><TableCell colSpan={7} align="center">لا توجد اجتماعات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Committees */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('committee')} sx={{ mb: 2 }}>لجنة جديدة</Button>
          <Grid container spacing={2}>
            {committees.map((c) => (
              <Grid item xs={12} md={4} key={c._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{c.name}</Typography>
                      <Chip size="small" color={statusColors[c.status] || 'default'} label={c.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{c.mandate}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">النوع: {c.committeeType?.replace(/_/g, ' ')}</Typography><br />
                    <Typography variant="caption">الأعضاء: {c.members?.length || 0}</Typography><br />
                    <Typography variant="caption">الرئيس: {c.chairperson?.name || '—'}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!committees.length && <Grid item xs={12}><Alert severity="info">لا توجد لجان</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Resolutions */}
      {tab === 2 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('resolution')} sx={{ mb: 2 }}>قرار جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
                <TableCell>الحالة</TableCell><TableCell>التصويت</TableCell><TableCell>تاريخ القرار</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {resolutions.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell><Typography variant="body2" fontWeight="bold">{r.resolutionNumber}</Typography></TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell><Chip size="small" label={r.resolutionType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[r.status] || 'default'} label={r.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>
                      {r.votingResult ? (
                        <Stack direction="row" spacing={0.5}>
                          <Chip size="small" color="success" label={`✓ ${r.votingResult?.inFavor || 0}`} />
                          <Chip size="small" color="error" label={`✗ ${r.votingResult?.against || 0}`} />
                        </Stack>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{r.decisionDate ? new Date(r.decisionDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  </TableRow>
                ))}
                {!resolutions.length && <TableRow><TableCell colSpan={6} align="center">لا توجد قرارات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 3: Policies */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('policy')} sx={{ mb: 2 }}>سياسة جديدة</Button>
          <Grid container spacing={2}>
            {policies.map((p) => (
              <Grid item xs={12} md={6} key={p._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{p.title}</Typography>
                      <Chip size="small" color={statusColors[p.status] || 'default'} label={p.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{p.description}</Typography>
                    <Typography variant="caption">الفئة: {p.category?.replace(/_/g, ' ')}</Typography><br />
                    <Typography variant="caption">الإصدار: {p.version}</Typography><br />
                    <Typography variant="caption">الجهة المسؤولة: {p.owner?.department || '—'}</Typography>
                    {p.nextReviewDate && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1 }} color={new Date(p.nextReviewDate) < new Date() ? 'error' : 'text.secondary'}>
                        المراجعة القادمة: {new Date(p.nextReviewDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!policies.length && <Grid item xs={12}><Alert severity="info">لا توجد سياسات</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 4: Reports */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('report')} sx={{ mb: 2 }}>تقرير جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>العنوان</TableCell><TableCell>النوع</TableCell><TableCell>الفترة</TableCell>
                <TableCell>الحالة</TableCell><TableCell>تاريخ التقديم</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {reports.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.title}</TableCell>
                    <TableCell><Chip size="small" label={r.reportType?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell><Chip size="small" color={statusColors[r.status] || 'default'} label={r.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{r.submissionDate ? new Date(r.submissionDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  </TableRow>
                ))}
                {!reports.length && <TableRow><TableCell colSpan={5} align="center">لا توجد تقارير</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, type: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.type === 'meeting' && 'اجتماع مجلس جديد'}
          {dialog.type === 'committee' && 'لجنة جديدة'}
          {dialog.type === 'resolution' && 'قرار جديد'}
          {dialog.type === 'policy' && 'سياسة حوكمة جديدة'}
          {dialog.type === 'report' && 'تقرير حوكمة جديد'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'meeting' && (<>
              <TextField label="رقم الاجتماع" fullWidth value={form.meetingNumber || ''} onChange={e => setForm({ ...form, meetingNumber: e.target.value })} />
              <TextField label="عنوان الاجتماع" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.meetingType || ''} onChange={e => setForm({ ...form, meetingType: e.target.value })}>
                {['regular', 'extraordinary', 'annual_general', 'special'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="التاريخ" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.scheduledDate || ''} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
            </>)}
            {dialog.type === 'committee' && (<>
              <TextField label="اسم اللجنة" fullWidth value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.committeeType || ''} onChange={e => setForm({ ...form, committeeType: e.target.value })}>
                {['audit', 'risk', 'compensation', 'nomination', 'governance', 'executive', 'strategy', 'compliance'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="الصلاحيات" fullWidth multiline rows={2} value={form.mandate || ''} onChange={e => setForm({ ...form, mandate: e.target.value })} />
            </>)}
            {dialog.type === 'resolution' && (<>
              <TextField label="رقم القرار" fullWidth value={form.resolutionNumber || ''} onChange={e => setForm({ ...form, resolutionNumber: e.target.value })} />
              <TextField label="عنوان القرار" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.resolutionType || ''} onChange={e => setForm({ ...form, resolutionType: e.target.value })}>
                {['ordinary', 'special', 'written', 'emergency'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="التفاصيل" fullWidth multiline rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'policy' && (<>
              <TextField label="عنوان السياسة" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="الفئة" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['board_governance', 'risk_management', 'ethics', 'compliance', 'disclosure', 'related_party', 'whistleblower', 'conflict_of_interest'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'report' && (<>
              <TextField label="عنوان التقرير" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.reportType || ''} onChange={e => setForm({ ...form, reportType: e.target.value })}>
                {['annual_governance', 'board_evaluation', 'committee_report', 'compliance_report', 'risk_report', 'esg_report'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="الفترة" fullWidth value={form.period || ''} onChange={e => setForm({ ...form, period: e.target.value })} />
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

/**
 * Digital Transformation & Innovation Page
 * صفحة التحول الرقمي والابتكار
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';

import * as dtService from '../../services/enterpriseUltra.service';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import RocketIcon from '@mui/icons-material/Rocket';
import RefreshIcon from '@mui/icons-material/Refresh';
import RadarIcon from '@mui/icons-material/Radar';
import AddIcon from '@mui/icons-material/Add';

const statusColors = {
  draft: 'default', in_progress: 'warning', completed: 'success', archived: 'default',
  submitted: 'info', under_review: 'secondary', approved: 'success', rejected: 'error', implementing: 'primary', implemented: 'success',
  planning: 'info', active: 'success', on_hold: 'warning', cancelled: 'error',
  assess: 'default', trial: 'info', adopt: 'success', hold: 'warning', retire: 'error',
  on_track: 'success', at_risk: 'warning', behind: 'error',
};

const maturityLevels = {
  1: { label: 'أولي', color: 'error' },
  2: { label: 'متكرر', color: 'warning' },
  3: { label: 'محدد', color: 'info' },
  4: { label: 'مُدار', color: 'primary' },
  5: { label: 'محسّن', color: 'success' },
};

export default function DigitalTransformationPage() {
  const [tab, setTab] = useState(0);
  const [assessments, setAssessments] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [projects, setProjects] = useState([]);
  const [radar, setRadar] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [assessRes, ideasRes, projRes, radarRes, kpisRes, statsRes] = await Promise.all([
        dtService.getMaturityAssessments(),
        dtService.getInnovationIdeas(),
        dtService.getInnovationProjects(),
        dtService.getTechRadarEntries(),
        dtService.getTransformationKPIs(),
        dtService.getDTDashboard(),
      ]);
      setAssessments(assessRes.data?.data || []);
      setIdeas(ideasRes.data?.data || []);
      setProjects(projRes.data?.data || []);
      setRadar(radarRes.data?.data || []);
      setKpis(kpisRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'assessment') await dtService.createMaturityAssessment(form);
      else if (dialog.type === 'idea') await dtService.createInnovationIdea(form);
      else if (dialog.type === 'project') await dtService.createInnovationProject(form);
      else if (dialog.type === 'radar') await dtService.createTechRadarEntry(form);
      else if (dialog.type === 'kpi') await dtService.createTransformationKPI(form);
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
            <RocketIcon color="primary" fontSize="large" /> التحول الرقمي والابتكار
          </Typography>
          <Typography variant="body2" color="text.secondary">تقييم النضج الرقمي وإدارة الأفكار والمشاريع الابتكارية</Typography>
        </Box>
        <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'مستوى النضج', value: stats.maturityLevel ? `${stats.maturityLevel}/5` : '—', color: '#1976d2' },
          { label: 'أفكار مقدمة', value: stats.totalIdeas || 0, color: '#ed6c02' },
          { label: 'مشاريع نشطة', value: stats.activeProjects || 0, color: '#2e7d32' },
          { label: 'تقنيات في الرادار', value: radar.length, color: '#9c27b0' },
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
        <Tab label={`تقييم النضج (${assessments.length})`} icon={<MaturityIcon />} iconPosition="start" />
        <Tab label={`بنك الأفكار (${ideas.length})`} icon={<IdeaIcon />} iconPosition="start" />
        <Tab label={`المشاريع (${projects.length})`} icon={<ProjectIcon />} iconPosition="start" />
        <Tab label={`رادار التقنية (${radar.length})`} icon={<RadarIcon />} iconPosition="start" />
        <Tab label={`مؤشرات الأداء (${kpis.length})`} icon={<KPIIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Maturity Assessments */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('assessment')} sx={{ mb: 2 }}>تقييم جديد</Button>
          <Grid container spacing={2}>
            {assessments.map((a) => (
              <Grid item xs={12} md={6} key={a._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{a.assessmentName || a.title}</Typography>
                      <Chip size="small" color={statusColors[a.status] || 'default'} label={a.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{a.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    {a.dimensions?.map((d, idx) => (
                      <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="caption">{d.name}</Typography>
                        <Chip size="small" color={maturityLevels[d.level]?.color || 'default'} label={`${d.level}/5 - ${maturityLevels[d.level]?.label || ''}`} />
                      </Stack>
                    ))}
                    {a.overallScore != null && (
                      <Box mt={1}>
                        <Typography variant="caption" fontWeight="bold">الدرجة الكلية: </Typography>
                        <Chip size="small" color={maturityLevels[Math.round(a.overallScore)]?.color || 'info'} label={`${a.overallScore}/5`} />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!assessments.length && <Grid item xs={12}><Alert severity="info">لا توجد تقييمات</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Innovation Ideas */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('idea')} sx={{ mb: 2 }}>فكرة جديدة</Button>
          <Grid container spacing={2}>
            {ideas.map((idea) => (
              <Grid item xs={12} md={4} key={idea._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{idea.title}</Typography>
                      <Chip size="small" color={statusColors[idea.status] || 'default'} label={idea.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{idea.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">الفئة: {idea.category?.replace(/_/g, ' ')}</Typography><br />
                    <Typography variant="caption">الأثر المتوقع: {idea.expectedImpact || '—'}</Typography><br />
                    <Typography variant="caption">المقدم: {idea.submittedBy?.name || '—'}</Typography>
                    <Stack direction="row" spacing={1} mt={1} alignItems="center">
                      <VoteIcon fontSize="small" color="action" />
                      <Typography variant="caption">{idea.votes || 0} تصويت</Typography>
                      {idea.estimatedROI && <Chip size="small" color="success" label={`ROI: ${idea.estimatedROI}%`} />}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!ideas.length && <Grid item xs={12}><Alert severity="info">لا توجد أفكار</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 2: Innovation Projects */}
      {tab === 2 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('project')} sx={{ mb: 2 }}>مشروع جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>المشروع</TableCell><TableCell>المرحلة</TableCell><TableCell>الحالة</TableCell>
                <TableCell>الميزانية</TableCell><TableCell>التقدم</TableCell><TableCell>الموعد النهائي</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p._id} hover>
                    <TableCell>
                      <Typography fontWeight="bold" variant="body2">{p.projectName}</Typography>
                      <Typography variant="caption" color="text.secondary">{p.description?.substring(0, 60)}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" label={p.stage?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[p.status] || 'default'} label={p.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{p.budget ? `${p.budget.toLocaleString()} ر.س` : '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LinearProgress variant="determinate" value={p.progress || 0} sx={{ width: 60, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption">{p.progress || 0}%</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{p.deadline ? new Date(p.deadline).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  </TableRow>
                ))}
                {!projects.length && <TableRow><TableCell colSpan={6} align="center">لا توجد مشاريع</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 3: Tech Radar */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('radar')} sx={{ mb: 2 }}>إدخال رادار جديد</Button>
          {/* Quadrant grouping */}
          {['techniques', 'platforms', 'tools', 'languages_frameworks'].map((quadrant) => {
            const items = radar.filter(r => r.quadrant === quadrant);
            if (!items.length) return null;
            return (
              <Box key={quadrant} mb={3}>
                <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>{quadrant.replace(/_/g, ' ')}</Typography>
                <Grid container spacing={1}>
                  {items.map((r) => (
                    <Grid item xs={12} sm={6} md={3} key={r._id}>
                      <Card variant="outlined" sx={{ borderLeft: `3px solid ${statusColors[r.ring] === 'success' ? '#2e7d32' : statusColors[r.ring] === 'warning' ? '#ed6c02' : '#1976d2'}` }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight="bold" variant="body2">{r.name}</Typography>
                            <Chip size="small" color={statusColors[r.ring] || 'default'} label={r.ring} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{r.description?.substring(0, 80)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
          {!radar.length && <Alert severity="info">لا توجد إدخالات في الرادار</Alert>}
        </Box>
      )}

      {/* Tab 4: KPIs */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('kpi')} sx={{ mb: 2 }}>مؤشر أداء جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>المؤشر</TableCell><TableCell>الفئة</TableCell><TableCell>القيمة الحالية</TableCell>
                <TableCell>الهدف</TableCell><TableCell>الحالة</TableCell><TableCell>الاتجاه</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {kpis.map((k) => (
                  <TableRow key={k._id} hover>
                    <TableCell><Typography fontWeight="bold" variant="body2">{k.kpiName}</Typography></TableCell>
                    <TableCell><Chip size="small" label={k.category?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{k.currentValue != null ? k.currentValue : '—'}{k.unit || ''}</TableCell>
                    <TableCell>{k.targetValue != null ? k.targetValue : '—'}{k.unit || ''}</TableCell>
                    <TableCell>
                      <Chip size="small" color={statusColors[k.status] || 'default'} label={k.status?.replace(/_/g, ' ')} />
                    </TableCell>
                    <TableCell>
                      {k.trend === 'up' && <Chip size="small" color="success" icon={<TrendUpIcon />} label="تحسن" />}
                      {k.trend === 'down' && <Chip size="small" color="error" label="↓ تراجع" />}
                      {k.trend === 'stable' && <Chip size="small" label="— مستقر" />}
                      {!k.trend && '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!kpis.length && <TableRow><TableCell colSpan={6} align="center">لا توجد مؤشرات أداء</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, type: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.type === 'assessment' && 'تقييم نضج رقمي جديد'}
          {dialog.type === 'idea' && 'فكرة ابتكارية جديدة'}
          {dialog.type === 'project' && 'مشروع ابتكار جديد'}
          {dialog.type === 'radar' && 'إدخال رادار تقني جديد'}
          {dialog.type === 'kpi' && 'مؤشر أداء تحول رقمي جديد'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'assessment' && (<>
              <TextField label="اسم التقييم" fullWidth value={form.assessmentName || ''} onChange={e => setForm({ ...form, assessmentName: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'idea' && (<>
              <TextField label="عنوان الفكرة" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <TextField select label="الفئة" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['process_automation', 'customer_experience', 'data_analytics', 'ai_ml', 'iot', 'blockchain', 'cloud', 'cybersecurity', 'other'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="الأثر المتوقع" fullWidth value={form.expectedImpact || ''} onChange={e => setForm({ ...form, expectedImpact: e.target.value })} />
              <TextField label="ROI المتوقع (%)" fullWidth type="number" value={form.estimatedROI || ''} onChange={e => setForm({ ...form, estimatedROI: e.target.value })} />
            </>)}
            {dialog.type === 'project' && (<>
              <TextField label="اسم المشروع" fullWidth value={form.projectName || ''} onChange={e => setForm({ ...form, projectName: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <TextField select label="المرحلة" fullWidth value={form.stage || ''} onChange={e => setForm({ ...form, stage: e.target.value })}>
                {['ideation', 'proof_of_concept', 'pilot', 'scaling', 'production'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="الميزانية (ر.س)" fullWidth type="number" value={form.budget || ''} onChange={e => setForm({ ...form, budget: e.target.value })} />
              <TextField label="الموعد النهائي" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </>)}
            {dialog.type === 'radar' && (<>
              <TextField label="اسم التقنية" fullWidth value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <TextField select label="الربع" fullWidth value={form.quadrant || ''} onChange={e => setForm({ ...form, quadrant: e.target.value })}>
                {['techniques', 'platforms', 'tools', 'languages_frameworks'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField select label="الحلقة" fullWidth value={form.ring || ''} onChange={e => setForm({ ...form, ring: e.target.value })}>
                {['adopt', 'trial', 'assess', 'hold'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'kpi' && (<>
              <TextField label="اسم المؤشر" fullWidth value={form.kpiName || ''} onChange={e => setForm({ ...form, kpiName: e.target.value })} />
              <TextField select label="الفئة" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['digital_adoption', 'process_efficiency', 'innovation_output', 'data_quality', 'customer_digital', 'employee_digital', 'revenue_digital'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="القيمة الحالية" fullWidth type="number" value={form.currentValue || ''} onChange={e => setForm({ ...form, currentValue: e.target.value })} />
              <TextField label="الهدف" fullWidth type="number" value={form.targetValue || ''} onChange={e => setForm({ ...form, targetValue: e.target.value })} />
              <TextField label="الوحدة" fullWidth value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
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

/**
 * إدارة خطط التأهيل الموحدة — Unified Rehabilitation Plans Management
 * CRUD كامل: قائمة، إنشاء، تعديل، أعضاء الفريق، الأهداف، المراجعات، الموافقات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Alert, Tabs, Tab, Divider, Card, CardContent,
  LinearProgress, Slider,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  ArrowBack as BackIcon, PersonAdd as PersonAddIcon, Flag as GoalIcon,
  CheckCircle as ApproveIcon, RateReview as ReviewIcon, TrackChanges as ProgressIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { plansService } from '../../services/mdtCoordinationService';

const STATUS_LABELS = { DRAFT: 'مسودة', PENDING_APPROVAL: 'بانتظار الموافقة', ACTIVE: 'نشط', ON_HOLD: 'معلق', COMPLETED: 'مكتمل', ARCHIVED: 'مؤرشف' };
const STATUS_COLORS = { DRAFT: 'default', PENDING_APPROVAL: 'warning', ACTIVE: 'success', ON_HOLD: 'info', COMPLETED: 'primary', ARCHIVED: 'default' };
const DOMAINS = [
  { value: 'MOTOR', label: 'حركي' }, { value: 'COGNITIVE', label: 'معرفي' },
  { value: 'COMMUNICATION', label: 'تواصل' }, { value: 'SOCIAL', label: 'اجتماعي' },
  { value: 'SELF_CARE', label: 'رعاية ذاتية' }, { value: 'BEHAVIORAL', label: 'سلوكي' },
  { value: 'EDUCATIONAL', label: 'تعليمي' }, { value: 'VOCATIONAL', label: 'مهني' },
  { value: 'OTHER', label: 'أخرى' },
];
const ROLES = [
  { value: 'LEAD', label: 'قائد' }, { value: 'CONTRIBUTOR', label: 'مساهم' },
  { value: 'CONSULTANT', label: 'استشاري' }, { value: 'OBSERVER', label: 'مراقب' },
];
const SPECIALTIES = [
  { value: 'PHYSIOTHERAPY', label: 'علاج طبيعي' }, { value: 'OCCUPATIONAL_THERAPY', label: 'علاج وظيفي' },
  { value: 'SPEECH_THERAPY', label: 'نطق ولغة' }, { value: 'PSYCHOLOGY', label: 'علم نفس' },
  { value: 'SOCIAL_WORK', label: 'خدمة اجتماعية' }, { value: 'NURSING', label: 'تمريض' },
  { value: 'MEDICINE', label: 'طب' }, { value: 'EDUCATION', label: 'تعليم' },
  { value: 'NUTRITION', label: 'تغذية' }, { value: 'BEHAVIORAL_THERAPY', label: 'سلوكي' },
  { value: 'CASE_MANAGEMENT', label: 'إدارة حالات' }, { value: 'ADMINISTRATION', label: 'إدارة' },
  { value: 'OTHER', label: 'أخرى' },
];
const REVIEW_CYCLES = [
  { value: 'WEEKLY', label: 'أسبوعي' }, { value: 'BIWEEKLY', label: 'نصف شهري' },
  { value: 'MONTHLY', label: 'شهري' }, { value: 'QUARTERLY', label: 'ربع سنوي' },
];

const emptyForm = { title: '', description: '', beneficiary: '', startDate: '', endDate: '', reviewCycle: 'MONTHLY', department: '' };

export default function MDTPlansPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState({ status: '' });

  // Create/Edit
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detail
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0);

  // Add team member
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: '', specialty: '', role: 'CONTRIBUTOR' });

  // Add goal
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', domain: 'OTHER', description: '', baseline: '', target: '', icfCode: '' });

  // Update goal progress
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressGoalId, setProgressGoalId] = useState(null);
  const [progressForm, setProgressForm] = useState({ progressValue: 0, note: '' });

  // Add review
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ summary: '', recommendations: '', overallStatus: 'ON_TRACK' });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (filter.status) params.status = filter.status;
      const [listRes, statsRes] = await Promise.all([
        plansService.getAll(params).catch(() => ({ data: [], pagination: {} })),
        plansService.getStats().catch(() => ({ data: {} })),
      ]);
      const arr = Array.isArray(listRes.data) ? listRes.data : Array.isArray(listRes) ? listRes : [];
      setPlans(arr);
      setTotal(listRes.pagination?.total || arr.length);
      setStats(statsRes.data || statsRes || {});
    } catch { /* */ }
    setLoading(false);
  }, [page, rowsPerPage, filter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleCreate = () => { setForm({ ...emptyForm }); setEditId(null); setError(''); setFormOpen(true); };
  const handleEdit = (p) => {
    setForm({
      title: p.title || '', description: p.description || '', beneficiary: p.beneficiary?._id || p.beneficiary || '',
      startDate: p.startDate ? p.startDate.substring(0, 10) : '', endDate: p.endDate ? p.endDate.substring(0, 10) : '',
      reviewCycle: p.reviewCycle || 'MONTHLY', department: p.department || '',
    });
    setEditId(p._id); setError(''); setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.startDate) { setError('العنوان وتاريخ البداية مطلوبان'); return; }
    setSaving(true);
    try {
      if (editId) await plansService.update(editId, form);
      else await plansService.create(form);
      setFormOpen(false); loadPlans();
    } catch (e) { setError(e.response?.data?.message || 'حدث خطأ'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الخطة؟')) return;
    try { await plansService.remove(id); loadPlans(); } catch { /* */ }
  };

  const reloadDetail = async (id) => {
    try { const res = await plansService.getById(id); setDetail(res.data || res); } catch { /* */ }
  };

  const openDetail = async (p) => {
    try { const res = await plansService.getById(p._id); setDetail(res.data || res); } catch { setDetail(p); }
    setDetailTab(0); setDetailOpen(true);
  };

  const handleAddMember = async () => {
    if (!memberForm.name) return;
    try { await plansService.addTeamMember(detail._id, memberForm); reloadDetail(detail._id); setMemberOpen(false); setMemberForm({ name: '', specialty: '', role: 'CONTRIBUTOR' }); } catch { /* */ }
  };

  const handleAddGoal = async () => {
    if (!goalForm.title) return;
    try { await plansService.addGoal(detail._id, goalForm); reloadDetail(detail._id); setGoalOpen(false); setGoalForm({ title: '', domain: 'OTHER', description: '', baseline: '', target: '', icfCode: '' }); } catch { /* */ }
  };

  const handleUpdateProgress = async () => {
    if (!progressGoalId) return;
    try { await plansService.updateGoalProgress(detail._id, progressGoalId, { progress: progressForm.progressValue, note: progressForm.note }); reloadDetail(detail._id); setProgressOpen(false); } catch { /* */ }
  };

  const handleApprove = async () => {
    try { await plansService.approve(detail._id, { decision: 'APPROVED', notes: 'تمت الموافقة' }); reloadDetail(detail._id); } catch { /* */ }
  };

  const handleAddReview = async () => {
    if (!reviewForm.summary) return;
    try { await plansService.addReview(detail._id, reviewForm); reloadDetail(detail._id); setReviewOpen(false); setReviewForm({ summary: '', recommendations: '', overallStatus: 'ON_TRACK' }); } catch { /* */ }
  };

  const domainLabels = Object.fromEntries(DOMAINS.map(d => [d.value, d.label]));

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/mdt-coordination')}><BackIcon /></IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">خطط التأهيل الموحدة</Typography>
            <Typography variant="body2" color="text.secondary">إنشاء وإدارة خطط التأهيل، الأهداف، وتقدم العلاج</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث"><IconButton onClick={loadPlans}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>خطة جديدة</Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي', value: stats.totalPlans || total, color: '#1976d2' },
          { label: 'نشط', value: stats.byStatus?.ACTIVE || 0, color: '#4caf50' },
          { label: 'بانتظار موافقة', value: stats.byStatus?.PENDING_APPROVAL || 0, color: '#ff9800' },
          { label: 'متوسط التقدم', value: `${Math.round(stats.averageProgress || 0)}%`, color: '#9c27b0' },
        ].map(s => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper sx={{ p: 2, borderRadius: 2, borderTop: `3px solid ${s.color}`, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>{s.value}</Typography>
              <Typography variant="body2" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <TextField select label="الحالة" value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0); }} size="small" sx={{ minWidth: 160 }}>
          <MenuItem value="">الكل</MenuItem>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>المستفيد</TableCell>
                  <TableCell>الحالة</TableCell><TableCell>التقدم</TableCell><TableCell>الفريق</TableCell>
                  <TableCell>الأهداف</TableCell><TableCell>تاريخ البداية</TableCell><TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(p)}>
                    <TableCell><Typography variant="body2" color="primary" fontWeight="bold">{p.planNumber || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</Typography></TableCell>
                    <TableCell>{p.beneficiary?.name || '-'}</TableCell>
                    <TableCell><Chip label={STATUS_LABELS[p.status] || p.status} color={STATUS_COLORS[p.status] || 'default'} size="small" /></TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box display="flex" alignItems="center" gap={1}><LinearProgress variant="determinate" value={p.overallProgress || 0} sx={{ flex: 1, height: 8, borderRadius: 4 }} /><Typography variant="caption">{Math.round(p.overallProgress || 0)}%</Typography></Box>
                    </TableCell>
                    <TableCell><Chip label={p.teamMembers?.length || 0} size="small" /></TableCell>
                    <TableCell><Chip label={p.goals?.length || 0} size="small" /></TableCell>
                    <TableCell>{p.startDate ? new Date(p.startDate).toLocaleDateString('ar') : '-'}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Tooltip title="تعديل"><IconButton size="small" onClick={() => handleEdit(p)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(p._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><Typography color="text.secondary">لا توجد خطط</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
            <TablePagination component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage} onRowsPerPageChange={e => { setRowsPerPage(+e.target.value); setPage(0); }}
              labelRowsPerPage="عدد الصفوف:" labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`} />
          </>
        )}
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل الخطة' : 'خطة تأهيل جديدة'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="عنوان الخطة" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الوصف" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="معرف المستفيد" value={form.beneficiary} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} placeholder="ID المستفيد" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="تاريخ البداية" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="تاريخ النهاية" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={6}><TextField fullWidth select label="دورة المراجعة" value={form.reviewCycle} onChange={e => setForm(f => ({ ...f, reviewCycle: e.target.value }))}>
              {REVIEW_CYCLES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="القسم" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? <CircularProgress size={20} /> : editId ? 'تحديث' : 'إنشاء'}</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        {detail && (
          <>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{detail.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detail.planNumber} — {detail.beneficiary?.name || ''} — {detail.startDate ? new Date(detail.startDate).toLocaleDateString('ar') : ''}
                  </Typography>
                </Box>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip label={STATUS_LABELS[detail.status] || detail.status} color={STATUS_COLORS[detail.status] || 'default'} />
                  {detail.status === 'PENDING_APPROVAL' && (
                    <Tooltip title="موافقة"><IconButton color="success" onClick={handleApprove}><ApproveIcon /></IconButton></Tooltip>
                  )}
                </Box>
              </Box>
              {/* Overall Progress */}
              <Box mt={1} display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" fontWeight="bold">التقدم الكلي:</Typography>
                <LinearProgress variant="determinate" value={detail.overallProgress || 0} sx={{ flex: 1, height: 10, borderRadius: 5 }} />
                <Typography variant="body2" fontWeight="bold">{Math.round(detail.overallProgress || 0)}%</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label="التفاصيل" />
                <Tab label={`الفريق (${detail.teamMembers?.length || 0})`} />
                <Tab label={`الأهداف (${detail.goals?.length || 0})`} />
                <Tab label={`المراجعات (${detail.reviews?.length || 0})`} />
              </Tabs>

              {/* Details Tab */}
              {detailTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">دورة المراجعة</Typography><Typography>{REVIEW_CYCLES.find(c => c.value === detail.reviewCycle)?.label || detail.reviewCycle || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">القسم</Typography><Typography>{detail.department || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">تاريخ النهاية</Typography><Typography>{detail.endDate ? new Date(detail.endDate).toLocaleDateString('ar') : '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">تاريخ المراجعة القادمة</Typography><Typography>{detail.reviewDate ? new Date(detail.reviewDate).toLocaleDateString('ar') : '-'}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">الوصف</Typography><Typography>{detail.description || '-'}</Typography></Grid>
                  {(detail.linkedMeetings || []).length > 0 && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" mb={1}>الاجتماعات المرتبطة ({detail.linkedMeetings.length})</Typography>
                      {detail.linkedMeetings.map((m, i) => (
                        <Chip key={i} label={m.title || m.meetingNumber || 'اجتماع'} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                      ))}
                    </Grid>
                  )}
                  {(detail.approvals || []).length > 0 && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" mb={1}>الموافقات</Typography>
                      {detail.approvals.map((a, i) => (
                        <Box key={i} display="flex" gap={2} alignItems="center" mb={0.5}>
                          <Chip label={a.decision === 'APPROVED' ? 'موافق' : a.decision === 'REJECTED' ? 'مرفوض' : a.decision} color={a.decision === 'APPROVED' ? 'success' : 'error'} size="small" />
                          <Typography variant="caption">{a.approverName || ''} — {a.date ? new Date(a.date).toLocaleDateString('ar') : ''}</Typography>
                          {a.notes && <Typography variant="caption" color="text.secondary">{a.notes}</Typography>}
                        </Box>
                      ))}
                    </Grid>
                  )}
                </Grid>
              )}

              {/* Team Tab */}
              {detailTab === 1 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={1}>
                    <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setMemberOpen(true)}>إضافة عضو</Button>
                  </Box>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>التخصص</TableCell><TableCell>الدور</TableCell><TableCell>الأهداف المسندة</TableCell></TableRow></TableHead>
                    <TableBody>
                      {(detail.teamMembers || []).map((m, i) => (
                        <TableRow key={i}>
                          <TableCell>{m.therapistName || m.name || '-'}</TableCell>
                          <TableCell>{SPECIALTIES.find(s => s.value === m.specialty)?.label || m.specialty || '-'}</TableCell>
                          <TableCell><Chip label={ROLES.find(r => r.value === m.role)?.label || m.role} size="small" color={m.role === 'LEAD' ? 'primary' : 'default'} /></TableCell>
                          <TableCell>{m.assignedGoals?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                      {(!detail.teamMembers || detail.teamMembers.length === 0) && <TableRow><TableCell colSpan={4} align="center">لا يوجد أعضاء</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </>
              )}

              {/* Goals Tab */}
              {detailTab === 2 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={1}>
                    <Button size="small" startIcon={<GoalIcon />} onClick={() => setGoalOpen(true)}>إضافة هدف</Button>
                  </Box>
                  {(detail.goals || []).map((g, i) => (
                    <Card key={i} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                          <Box flex={1}>
                            <Typography variant="subtitle2" fontWeight="bold">{g.title}</Typography>
                            <Box display="flex" gap={1} mt={0.5} mb={1}>
                              <Chip label={domainLabels[g.domain] || g.domain} size="small" variant="outlined" />
                              {g.icfCode && <Chip label={g.icfCode} size="small" variant="outlined" color="info" />}
                              <Chip label={g.status === 'ACHIEVED' ? 'محقق' : g.status === 'IN_PROGRESS' ? 'جارٍ' : g.status === 'NOT_STARTED' ? 'لم يبدأ' : g.status || 'جارٍ'} size="small" color={g.status === 'ACHIEVED' ? 'success' : g.status === 'IN_PROGRESS' ? 'warning' : 'default'} />
                            </Box>
                          </Box>
                          <Tooltip title="تحديث التقدم">
                            <IconButton size="small" onClick={() => { setProgressGoalId(g._id); setProgressForm({ progressValue: g.progress || 0, note: '' }); setProgressOpen(true); }}>
                              <ProgressIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {g.description && <Typography variant="body2" color="text.secondary" mb={1}>{g.description}</Typography>}
                        <Box display="flex" gap={3} mb={1}>
                          <Typography variant="caption">خط أساس: {g.baseline || '-'}</Typography>
                          <Typography variant="caption">الهدف: {g.target || '-'}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress variant="determinate" value={g.progress || 0} sx={{ flex: 1, height: 8, borderRadius: 4 }} color={g.progress >= 80 ? 'success' : g.progress >= 50 ? 'warning' : 'error'} />
                          <Typography variant="body2" fontWeight="bold">{Math.round(g.progress || 0)}%</Typography>
                        </Box>
                        {(g.progressNotes || []).length > 0 && (
                          <Box mt={1}>
                            <Typography variant="caption" color="text.secondary">آخر ملاحظات التقدم:</Typography>
                            {g.progressNotes.slice(-2).map((n, ni) => (
                              <Typography key={ni} variant="caption" display="block" sx={{ pr: 2 }}>
                                • {n.note || n.description || ''} {n.date ? `(${new Date(n.date).toLocaleDateString('ar')})` : ''}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(!detail.goals || detail.goals.length === 0) && <Typography color="text.secondary" textAlign="center" py={2}>لا توجد أهداف</Typography>}
                </>
              )}

              {/* Reviews Tab */}
              {detailTab === 3 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={1}>
                    <Button size="small" startIcon={<ReviewIcon />} onClick={() => setReviewOpen(true)}>إضافة مراجعة</Button>
                  </Box>
                  {(detail.reviews || []).map((r, i) => (
                    <Card key={i} variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="subtitle2">{r.reviewerName || 'مراجع'} — {r.date ? new Date(r.date).toLocaleDateString('ar') : ''}</Typography>
                          <Chip label={r.overallStatus === 'ON_TRACK' ? 'على المسار' : r.overallStatus === 'BEHIND' ? 'متأخر' : r.overallStatus === 'AHEAD' ? 'متقدم' : r.overallStatus || '-'} size="small" color={r.overallStatus === 'ON_TRACK' ? 'success' : r.overallStatus === 'BEHIND' ? 'error' : 'info'} />
                        </Box>
                        <Typography variant="body2" mt={1}>{r.summary}</Typography>
                        {r.recommendations && <Typography variant="body2" color="text.secondary" mt={0.5}>التوصيات: {r.recommendations}</Typography>}
                      </CardContent>
                    </Card>
                  ))}
                  {(!detail.reviews || detail.reviews.length === 0) && <Typography color="text.secondary" textAlign="center" py={2}>لا توجد مراجعات</Typography>}
                </>
              )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailOpen(false)}>إغلاق</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={memberOpen} onClose={() => setMemberOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة عضو فريق</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="الاسم" value={memberForm.name} onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth select label="التخصص" value={memberForm.specialty} onChange={e => setMemberForm(f => ({ ...f, specialty: e.target.value }))}>
              {SPECIALTIES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><TextField fullWidth select label="الدور" value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setMemberOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddMember}>إضافة</Button></DialogActions>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={goalOpen} onClose={() => setGoalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة هدف</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="عنوان الهدف" value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الوصف" value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={6}><TextField fullWidth select label="المجال" value={goalForm.domain} onChange={e => setGoalForm(f => ({ ...f, domain: e.target.value }))}>
              {DOMAINS.map(d => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="كود ICF" value={goalForm.icfCode} onChange={e => setGoalForm(f => ({ ...f, icfCode: e.target.value }))} placeholder="مثال: b710.2" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="خط أساس" value={goalForm.baseline} onChange={e => setGoalForm(f => ({ ...f, baseline: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="الهدف" value={goalForm.target} onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setGoalOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddGoal}>إضافة</Button></DialogActions>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={progressOpen} onClose={() => setProgressOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تحديث تقدم الهدف</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>نسبة التقدم: {progressForm.progressValue}%</Typography>
            <Slider value={progressForm.progressValue} onChange={(_, v) => setProgressForm(f => ({ ...f, progressValue: v }))} min={0} max={100} step={5} valueLabelDisplay="auto" />
            <TextField fullWidth label="ملاحظة" value={progressForm.note} onChange={e => setProgressForm(f => ({ ...f, note: e.target.value }))} multiline rows={2} sx={{ mt: 2 }} />
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setProgressOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleUpdateProgress}>حفظ</Button></DialogActions>
      </Dialog>

      {/* Add Review Dialog */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مراجعة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="ملخص المراجعة" value={reviewForm.summary} onChange={e => setReviewForm(f => ({ ...f, summary: e.target.value }))} multiline rows={3} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="التوصيات" value={reviewForm.recommendations} onChange={e => setReviewForm(f => ({ ...f, recommendations: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth select label="الحالة العامة" value={reviewForm.overallStatus} onChange={e => setReviewForm(f => ({ ...f, overallStatus: e.target.value }))}>
              <MenuItem value="ON_TRACK">على المسار</MenuItem>
              <MenuItem value="BEHIND">متأخر</MenuItem>
              <MenuItem value="AHEAD">متقدم</MenuItem>
              <MenuItem value="AT_RISK">في خطر</MenuItem>
            </TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setReviewOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddReview}>إضافة</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

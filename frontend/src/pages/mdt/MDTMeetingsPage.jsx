/**
 * إدارة اجتماعات الفريق متعدد التخصصات — MDT Meetings Management
 * CRUD كامل: قائمة، إنشاء، تعديل، إضافة حاضرين، تسجيل الحضور، إضافة جدول أعمال
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Alert, Tabs, Tab, Divider, Card, CardContent,
  List, ListItem, ListItemText, ListItemSecondaryAction, FormControlLabel, Switch,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  Groups as MeetingIcon, ArrowBack as BackIcon, PersonAdd as PersonAddIcon,
  PlayArrow as StartIcon, CheckCircle as CompleteIcon, EventNote as AgendaIcon,
  Description as MinutesIcon, Gavel as DecisionIcon, Assignment as ActionIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { meetingsService, minutesService } from '../../services/mdtCoordinationService';

const TYPES = [
  { value: 'REGULAR', label: 'دوري' }, { value: 'EMERGENCY', label: 'طارئ' },
  { value: 'CASE_REVIEW', label: 'مراجعة حالة' }, { value: 'CARE_PLANNING', label: 'تخطيط رعاية' },
  { value: 'DISCHARGE_PLANNING', label: 'تخطيط خروج' }, { value: 'PROGRESS_REVIEW', label: 'مراجعة تقدم' },
  { value: 'INITIAL_ASSESSMENT', label: 'تقييم أولي' },
];
const SPECIALTIES = [
  'PHYSIOTHERAPY', 'OCCUPATIONAL_THERAPY', 'SPEECH_THERAPY', 'PSYCHOLOGY',
  'SOCIAL_WORK', 'NURSING', 'MEDICINE', 'EDUCATION', 'NUTRITION',
  'BEHAVIORAL_THERAPY', 'CASE_MANAGEMENT', 'ADMINISTRATION', 'OTHER',
];
const specLabels = {
  PHYSIOTHERAPY: 'علاج طبيعي', OCCUPATIONAL_THERAPY: 'علاج وظيفي', SPEECH_THERAPY: 'نطق ولغة',
  PSYCHOLOGY: 'علم نفس', SOCIAL_WORK: 'خدمة اجتماعية', NURSING: 'تمريض', MEDICINE: 'طب',
  EDUCATION: 'تعليم', NUTRITION: 'تغذية', BEHAVIORAL_THERAPY: 'سلوكي',
  CASE_MANAGEMENT: 'إدارة حالات', ADMINISTRATION: 'إدارة', OTHER: 'أخرى',
};
const statusColors = { SCHEDULED: 'info', IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'error', POSTPONED: 'default' };
const statusLabels = { SCHEDULED: 'مجدول', IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', CANCELLED: 'ملغى', POSTPONED: 'مؤجل' };
const typeLabels = Object.fromEntries(TYPES.map(t => [t.value, t.label]));

const emptyForm = { title: '', description: '', type: 'REGULAR', date: '', startTime: '', endTime: '', duration: 60, location: '', isVirtual: false, meetingLink: '', department: '' };

export default function MDTMeetingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState({ status: '', type: '' });

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Detail
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState(0);

  // Attendee dialog
  const [attendeeOpen, setAttendeeOpen] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState({ name: '', role: '', specialty: '', department: '' });

  // Minutes dialog
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutesContent, setMinutesContent] = useState('');

  // Decision dialog
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionForm, setDecisionForm] = useState({ title: '', description: '', category: 'OTHER' });

  // Agenda dialog
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [agendaForm, setAgendaForm] = useState({ topic: '', duration: 15, notes: '' });

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (filter.status) params.status = filter.status;
      if (filter.type) params.type = filter.type;
      const [listRes, statsRes] = await Promise.all([
        meetingsService.getAll(params).catch(() => ({ data: [], pagination: {} })),
        meetingsService.getStats().catch(() => ({ data: {} })),
      ]);
      const arr = Array.isArray(listRes.data) ? listRes.data : Array.isArray(listRes) ? listRes : [];
      setMeetings(arr);
      setTotal(listRes.pagination?.total || arr.length);
      setStats(statsRes.data || statsRes || {});
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, rowsPerPage, filter]);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const handleCreate = () => { setForm({ ...emptyForm }); setEditId(null); setError(''); setFormOpen(true); };
  const handleEdit = (m) => {
    setForm({
      title: m.title || '', description: m.description || '', type: m.type || 'REGULAR',
      date: m.date ? m.date.substring(0, 10) : '', startTime: m.startTime || '', endTime: m.endTime || '',
      duration: m.duration || 60, location: m.location || '', isVirtual: m.isVirtual || false,
      meetingLink: m.meetingLink || '', department: m.department || '',
    });
    setEditId(m._id);
    setError('');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.startTime) { setError('العنوان والتاريخ ووقت البداية مطلوبة'); return; }
    setSaving(true);
    try {
      if (editId) await meetingsService.update(editId, form);
      else await meetingsService.create(form);
      setFormOpen(false);
      loadMeetings();
    } catch (e) { setError(e.response?.data?.message || 'حدث خطأ'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاجتماع؟')) return;
    try { await meetingsService.remove(id); loadMeetings(); } catch { /* ignore */ }
  };

  const openDetail = async (m) => {
    try {
      const res = await meetingsService.getById(m._id);
      setDetail(res.data || res);
    } catch { setDetail(m); }
    setDetailTab(0);
    setDetailOpen(true);
  };

  const handleAddAttendee = async () => {
    if (!attendeeForm.name || !attendeeForm.role) return;
    try {
      await meetingsService.addAttendee(detail._id, attendeeForm);
      const res = await meetingsService.getById(detail._id);
      setDetail(res.data || res);
      setAttendeeOpen(false);
      setAttendeeForm({ name: '', role: '', specialty: '', department: '' });
    } catch { /* ignore */ }
  };

  const handleAddMinutes = async () => {
    if (!minutesContent) return;
    try {
      await minutesService.create(detail._id, { content: minutesContent });
      const res = await meetingsService.getById(detail._id);
      setDetail(res.data || res);
      setMinutesOpen(false);
      setMinutesContent('');
    } catch { /* ignore */ }
  };

  const handleAddDecision = async () => {
    if (!decisionForm.title) return;
    try {
      await minutesService.addDecision(detail._id, decisionForm);
      const res = await meetingsService.getById(detail._id);
      setDetail(res.data || res);
      setDecisionOpen(false);
      setDecisionForm({ title: '', description: '', category: 'OTHER' });
    } catch { /* ignore */ }
  };

  const handleAddAgenda = async () => {
    if (!agendaForm.topic) return;
    try {
      await meetingsService.addAgenda(detail._id, agendaForm);
      const res = await meetingsService.getById(detail._id);
      setDetail(res.data || res);
      setAgendaOpen(false);
      setAgendaForm({ topic: '', duration: 15, notes: '' });
    } catch { /* ignore */ }
  };

  const DECISION_CATEGORIES = [
    { value: 'TREATMENT_PLAN', label: 'خطة علاج' }, { value: 'MEDICATION', label: 'دواء' },
    { value: 'REFERRAL', label: 'إحالة' }, { value: 'DISCHARGE', label: 'خروج' },
    { value: 'ASSESSMENT', label: 'تقييم' }, { value: 'GOAL_CHANGE', label: 'تغيير هدف' },
    { value: 'EQUIPMENT', label: 'معدات' }, { value: 'FAMILY_MEETING', label: 'اجتماع عائلة' },
    { value: 'OTHER', label: 'أخرى' },
  ];

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/mdt-coordination')}><BackIcon /></IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">اجتماعات الفريق متعدد التخصصات</Typography>
            <Typography variant="body2" color="text.secondary">إنشاء وإدارة الاجتماعات، المحاضر، القرارات، وجدول الأعمال</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث"><IconButton onClick={loadMeetings}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>اجتماع جديد</Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي', value: stats.totalMeetings || total, color: '#1976d2' },
          { label: 'مكتمل', value: stats.byStatus?.COMPLETED || 0, color: '#4caf50' },
          { label: 'مجدول', value: stats.byStatus?.SCHEDULED || 0, color: '#2196f3' },
          { label: 'متوسط الحضور', value: Math.round(stats.averageAttendees || 0), color: '#9c27b0' },
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
        <Box display="flex" gap={2} alignItems="center">
          <TextField select label="الحالة" value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0); }} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(statusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField select label="النوع" value={filter.type} onChange={e => { setFilter(f => ({ ...f, type: e.target.value })); setPage(0); }} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
        </Box>
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
                  <TableCell>الرقم</TableCell><TableCell>العنوان</TableCell><TableCell>النوع</TableCell>
                  <TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>الوقت</TableCell>
                  <TableCell>المكان</TableCell><TableCell>المشاركون</TableCell><TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {meetings.map((m) => (
                  <TableRow key={m._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(m)}>
                    <TableCell><Typography variant="body2" color="primary" fontWeight="bold">{m.meetingNumber || '-'}</Typography></TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</Typography></TableCell>
                    <TableCell><Chip label={typeLabels[m.type] || m.type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={statusLabels[m.status] || m.status} color={statusColors[m.status] || 'default'} size="small" /></TableCell>
                    <TableCell>{m.date ? new Date(m.date).toLocaleDateString('ar') : '-'}</TableCell>
                    <TableCell>{m.startTime || '-'}{m.endTime ? ` - ${m.endTime}` : ''}</TableCell>
                    <TableCell>{m.isVirtual ? 'افتراضي' : m.location || '-'}</TableCell>
                    <TableCell><Chip label={m.attendees?.length || 0} size="small" icon={<MeetingIcon />} /></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Tooltip title="تعديل"><IconButton size="small" onClick={() => handleEdit(m)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(m._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {meetings.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><Typography color="text.secondary">لا توجد اجتماعات</Typography></TableCell></TableRow>}
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
        <DialogTitle>{editId ? 'تعديل اجتماع' : 'اجتماع جديد'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="عنوان الاجتماع" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الوصف" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={6}><TextField fullWidth select label="النوع" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="التاريخ" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="وقت البداية" type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="وقت النهاية" type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={4}><TextField fullWidth label="المدة (دقيقة)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} /></Grid>
            <Grid item xs={8}><TextField fullWidth label="المكان" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></Grid>
            <Grid item xs={4}><FormControlLabel control={<Switch checked={form.isVirtual} onChange={e => setForm(f => ({ ...f, isVirtual: e.target.checked }))} />} label="افتراضي" /></Grid>
            {form.isVirtual && <Grid item xs={12}><TextField fullWidth label="رابط الاجتماع" value={form.meetingLink} onChange={e => setForm(f => ({ ...f, meetingLink: e.target.value }))} /></Grid>}
            <Grid item xs={12}><TextField fullWidth label="القسم" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></Grid>
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
                  <Typography variant="caption" color="text.secondary">{detail.meetingNumber} — {detail.date ? new Date(detail.date).toLocaleDateString('ar') : ''}</Typography>
                </Box>
                <Chip label={statusLabels[detail.status] || detail.status} color={statusColors[detail.status] || 'default'} />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label="التفاصيل" />
                <Tab label={`المشاركون (${detail.attendees?.length || 0})`} />
                <Tab label={`جدول الأعمال (${detail.agenda?.length || 0})`} />
                <Tab label="المحضر والقرارات" />
              </Tabs>

              {detailTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">النوع</Typography><Typography>{typeLabels[detail.type] || detail.type}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">المكان</Typography><Typography>{detail.isVirtual ? 'افتراضي' : detail.location || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">الوقت</Typography><Typography>{detail.startTime}{detail.endTime ? ` - ${detail.endTime}` : ''} ({detail.duration || 60} دقيقة)</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">القسم</Typography><Typography>{detail.department || '-'}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">الوصف</Typography><Typography>{detail.description || '-'}</Typography></Grid>
                  {detail.isVirtual && detail.meetingLink && (
                    <Grid item xs={12}><Typography variant="caption" color="text.secondary">رابط الاجتماع</Typography><Typography><a href={detail.meetingLink} target="_blank" rel="noreferrer">{detail.meetingLink}</a></Typography></Grid>
                  )}
                  {(detail.cases || []).length > 0 && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>الحالات ({detail.cases.length})</Typography>
                      {detail.cases.map((c, i) => (
                        <Card key={i} variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                          <CardContent sx={{ py: 1 }}>
                            <Typography variant="body2" fontWeight="bold">{c.beneficiaryName || c.beneficiary?.name || 'مستفيد'}</Typography>
                            <Typography variant="caption" color="text.secondary">{c.currentStatus || ''}</Typography>
                            {c.discussionSummary && <Typography variant="body2" mt={0.5}>{c.discussionSummary}</Typography>}
                          </CardContent>
                        </Card>
                      ))}
                    </Grid>
                  )}
                </Grid>
              )}

              {detailTab === 1 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={1}>
                    <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAttendeeOpen(true)}>إضافة مشارك</Button>
                  </Box>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>الاسم</TableCell><TableCell>الدور</TableCell><TableCell>التخصص</TableCell><TableCell>الحالة</TableCell></TableRow></TableHead>
                    <TableBody>
                      {(detail.attendees || []).map((a, i) => (
                        <TableRow key={i}>
                          <TableCell>{a.name}</TableCell>
                          <TableCell>{a.role}</TableCell>
                          <TableCell>{specLabels[a.specialty] || a.specialty || '-'}</TableCell>
                          <TableCell><Chip label={a.attendance === 'PRESENT' ? 'حاضر' : a.attendance === 'ABSENT' ? 'غائب' : a.attendance === 'EXCUSED' ? 'معتذر' : 'معلق'} size="small" color={a.attendance === 'PRESENT' ? 'success' : a.attendance === 'ABSENT' ? 'error' : 'default'} /></TableCell>
                        </TableRow>
                      ))}
                      {(!detail.attendees || detail.attendees.length === 0) && <TableRow><TableCell colSpan={4} align="center">لا يوجد مشاركون</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </>
              )}

              {detailTab === 2 && (
                <>
                  <Box display="flex" justifyContent="flex-end" mb={1}>
                    <Button size="small" startIcon={<AgendaIcon />} onClick={() => setAgendaOpen(true)}>إضافة بند</Button>
                  </Box>
                  <List>
                    {(detail.agenda || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((a, i) => (
                      <ListItem key={i} divider>
                        <ListItemText
                          primary={<Box display="flex" gap={1} alignItems="center"><Chip label={a.order || i + 1} size="small" /><Typography>{a.topic}</Typography></Box>}
                          secondary={`${a.duration || 0} دقيقة${a.notes ? ` — ${a.notes}` : ''}`}
                        />
                      </ListItem>
                    ))}
                    {(!detail.agenda || detail.agenda.length === 0) && <Typography color="text.secondary" textAlign="center" py={2}>لا يوجد جدول أعمال</Typography>}
                  </List>
                </>
              )}

              {detailTab === 3 && (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">المحضر</Typography>
                    <Button size="small" startIcon={<MinutesIcon />} onClick={() => { setMinutesContent(detail.minutes?.content || ''); setMinutesOpen(true); }}>
                      {detail.minutes?.content ? 'تعديل المحضر' : 'إضافة محضر'}
                    </Button>
                  </Box>
                  {detail.minutes?.content ? (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#fafafa' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{detail.minutes.content}</Typography>
                      <Box display="flex" gap={2} mt={1}>
                        <Chip label={detail.minutes.approved ? 'معتمد' : 'غير معتمد'} size="small" color={detail.minutes.approved ? 'success' : 'warning'} />
                        {detail.minutes.recordedAt && <Typography variant="caption" color="text.secondary">{new Date(detail.minutes.recordedAt).toLocaleString('ar')}</Typography>}
                      </Box>
                    </Paper>
                  ) : <Typography color="text.secondary" mb={2}>لم يتم إضافة محضر بعد</Typography>}

                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">القرارات ({detail.generalDecisions?.length || 0})</Typography>
                    <Button size="small" startIcon={<DecisionIcon />} onClick={() => setDecisionOpen(true)}>إضافة قرار</Button>
                  </Box>
                  {(detail.generalDecisions || []).map((d, i) => (
                    <Card key={i} variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" fontWeight="bold">{d.title}</Typography>
                          <Chip label={d.status === 'APPROVED' ? 'معتمد' : d.status === 'IMPLEMENTED' ? 'منفذ' : d.status === 'REJECTED' ? 'مرفوض' : 'مقترح'} size="small" color={d.status === 'APPROVED' ? 'success' : d.status === 'IMPLEMENTED' ? 'primary' : 'default'} />
                        </Box>
                        {d.description && <Typography variant="caption" color="text.secondary">{d.description}</Typography>}
                      </CardContent>
                    </Card>
                  ))}

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" fontWeight="bold" mb={1}>المهام ({detail.generalActionItems?.length || 0})</Typography>
                  {(detail.generalActionItems || []).map((a, i) => (
                    <Card key={i} variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                      <CardContent sx={{ py: 1 }}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">{a.description}</Typography>
                          <Chip label={a.status === 'COMPLETED' ? 'مكتمل' : a.status === 'IN_PROGRESS' ? 'جارٍ' : 'معلق'} size="small" color={a.status === 'COMPLETED' ? 'success' : a.status === 'IN_PROGRESS' ? 'warning' : 'default'} />
                        </Box>
                        <Box display="flex" gap={2} mt={0.5}>
                          {a.assignedToName && <Typography variant="caption">المسؤول: {a.assignedToName}</Typography>}
                          {a.dueDate && <Typography variant="caption" color="text.secondary">الموعد: {new Date(a.dueDate).toLocaleDateString('ar')}</Typography>}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailOpen(false)}>إغلاق</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Attendee Dialog */}
      <Dialog open={attendeeOpen} onClose={() => setAttendeeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة مشارك</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="الاسم" value={attendeeForm.name} onChange={e => setAttendeeForm(f => ({ ...f, name: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الدور" value={attendeeForm.role} onChange={e => setAttendeeForm(f => ({ ...f, role: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth select label="التخصص" value={attendeeForm.specialty} onChange={e => setAttendeeForm(f => ({ ...f, specialty: e.target.value }))}>
              <MenuItem value="">-- اختر --</MenuItem>
              {SPECIALTIES.map(s => <MenuItem key={s} value={s}>{specLabels[s] || s}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={12}><TextField fullWidth label="القسم" value={attendeeForm.department} onChange={e => setAttendeeForm(f => ({ ...f, department: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setAttendeeOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddAttendee}>إضافة</Button></DialogActions>
      </Dialog>

      {/* Minutes Dialog */}
      <Dialog open={minutesOpen} onClose={() => setMinutesOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>محضر الاجتماع</DialogTitle>
        <DialogContent>
          <TextField fullWidth multiline rows={8} label="محتوى المحضر" value={minutesContent} onChange={e => setMinutesContent(e.target.value)} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions><Button onClick={() => setMinutesOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddMinutes}>حفظ</Button></DialogActions>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog open={decisionOpen} onClose={() => setDecisionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة قرار</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="عنوان القرار" value={decisionForm.title} onChange={e => setDecisionForm(f => ({ ...f, title: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الوصف" value={decisionForm.description} onChange={e => setDecisionForm(f => ({ ...f, description: e.target.value }))} multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth select label="التصنيف" value={decisionForm.category} onChange={e => setDecisionForm(f => ({ ...f, category: e.target.value }))}>
              {DECISION_CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setDecisionOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddDecision}>إضافة</Button></DialogActions>
      </Dialog>

      {/* Agenda Dialog */}
      <Dialog open={agendaOpen} onClose={() => setAgendaOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إضافة بند جدول أعمال</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="الموضوع" value={agendaForm.topic} onChange={e => setAgendaForm(f => ({ ...f, topic: e.target.value }))} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="المدة (دقيقة)" type="number" value={agendaForm.duration} onChange={e => setAgendaForm(f => ({ ...f, duration: +e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="ملاحظات" value={agendaForm.notes} onChange={e => setAgendaForm(f => ({ ...f, notes: e.target.value }))} multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setAgendaOpen(false)}>إلغاء</Button><Button variant="contained" onClick={handleAddAgenda}>إضافة</Button></DialogActions>
      </Dialog>
    </Box>
  );
}

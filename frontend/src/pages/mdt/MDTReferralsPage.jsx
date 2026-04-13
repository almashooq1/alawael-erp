/**
 * إدارة تذاكر الإحالة الداخلية — Internal Referral Tickets Management
 * CRUD كامل: قائمة، إنشاء، قبول، رفض، إكمال، سجل التدقيق
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, IconButton, Tooltip,
  Table, TableHead, TableRow, TableCell, TableBody, TablePagination,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, Alert, Tabs, Tab, Divider, Card, CardContent,
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon,
  ArrowBack as BackIcon, CheckCircle as AcceptIcon, Cancel as RejectIcon,
  DoneAll as CompleteIcon, Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { referralsService } from '../../services/mdtCoordinationService';

const STATUS_LABELS = { PENDING: 'معلق', ACCEPTED: 'مقبول', IN_PROGRESS: 'جارٍ', COMPLETED: 'مكتمل', REJECTED: 'مرفوض', CANCELLED: 'ملغى', RETURNED: 'معاد' };
const STATUS_COLORS = { PENDING: 'warning', ACCEPTED: 'info', IN_PROGRESS: 'primary', COMPLETED: 'success', REJECTED: 'error', CANCELLED: 'default', RETURNED: 'warning' };
const PRIORITY_LABELS = { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي', URGENT: 'عاجل' };
const PRIORITY_COLORS = { LOW: '#8bc34a', MEDIUM: '#ff9800', HIGH: '#f44336', URGENT: '#d32f2f' };
const TYPES = [
  { value: 'INTERNAL', label: 'داخلية' }, { value: 'EXTERNAL', label: 'خارجية' },
  { value: 'SPECIALIST', label: 'تخصصية' }, { value: 'ASSESSMENT', label: 'تقييم' },
  { value: 'THERAPY', label: 'علاج' }, { value: 'CONSULTATION', label: 'استشارة' },
  { value: 'FOLLOW_UP', label: 'متابعة' }, { value: 'EMERGENCY', label: 'طارئة' },
];

const emptyForm = { beneficiary: '', type: 'INTERNAL', priority: 'MEDIUM', reason: '', clinicalNotes: '', fromDepartment: '', toDepartment: '', toSpecialist: '' };

export default function MDTReferralsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState({ status: '', priority: '', type: '' });

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

  // Action dialogs
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'accept', 'reject', 'complete'
  const [actionForm, setActionForm] = useState({ note: '', summary: '', findings: '', recommendations: '', followUp: false });

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (filter.status) params.status = filter.status;
      if (filter.priority) params.priority = filter.priority;
      if (filter.type) params.type = filter.type;
      const [listRes, statsRes] = await Promise.all([
        referralsService.getAll(params).catch(() => ({ data: [], pagination: {} })),
        referralsService.getStats().catch(() => ({ data: {} })),
      ]);
      const arr = Array.isArray(listRes.data) ? listRes.data : Array.isArray(listRes) ? listRes : [];
      setReferrals(arr);
      setTotal(listRes.pagination?.total || arr.length);
      setStats(statsRes.data || statsRes || {});
    } catch { /* */ }
    setLoading(false);
  }, [page, rowsPerPage, filter]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const handleCreate = () => { setForm({ ...emptyForm }); setEditId(null); setError(''); setFormOpen(true); };
  const handleEdit = (r) => {
    setForm({
      beneficiary: r.beneficiary?._id || r.beneficiary || '', type: r.type || 'INTERNAL',
      priority: r.priority || 'MEDIUM', reason: r.reason || '', clinicalNotes: r.clinicalNotes || '',
      fromDepartment: r.fromDepartment || '', toDepartment: r.toDepartment || '', toSpecialist: r.toSpecialist || '',
    });
    setEditId(r._id); setError(''); setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.reason) { setError('سبب الإحالة مطلوب'); return; }
    setSaving(true);
    try {
      if (editId) await referralsService.update(editId, form);
      else await referralsService.create(form);
      setFormOpen(false); loadReferrals();
    } catch (e) { setError(e.response?.data?.message || 'حدث خطأ'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الإحالة؟')) return;
    try { await referralsService.remove(id); loadReferrals(); } catch { /* */ }
  };

  const openDetail = async (r) => {
    try { const res = await referralsService.getById(r._id); setDetail(res.data || res); } catch { setDetail(r); }
    setDetailTab(0); setDetailOpen(true);
  };

  const reloadDetail = async (id) => {
    try { const res = await referralsService.getById(id); setDetail(res.data || res); } catch { /* */ }
  };

  const openAction = (type) => {
    setActionType(type);
    setActionForm({ note: '', summary: '', findings: '', recommendations: '', followUp: false });
    setActionOpen(true);
  };

  const handleAction = async () => {
    try {
      if (actionType === 'accept') {
        await referralsService.accept(detail._id, { acceptanceNote: actionForm.note });
      } else if (actionType === 'reject') {
        await referralsService.reject(detail._id, { rejectionReason: actionForm.note });
      } else if (actionType === 'complete') {
        await referralsService.complete(detail._id, {
          summary: actionForm.summary, findings: actionForm.findings,
          recommendations: actionForm.recommendations, followUp: actionForm.followUp,
        });
      }
      reloadDetail(detail._id);
      loadReferrals();
      setActionOpen(false);
    } catch { /* */ }
  };

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/mdt-coordination')}><BackIcon /></IconButton>
          <Box>
            <Typography variant="h4" fontWeight="bold">تذاكر الإحالة الداخلية</Typography>
            <Typography variant="body2" color="text.secondary">إنشاء وإدارة الإحالات، القبول، الرفض، والإكمال</Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="تحديث"><IconButton onClick={loadReferrals}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>إحالة جديدة</Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'إجمالي', value: stats.totalReferrals || total, color: '#1976d2' },
          { label: 'معلقة', value: stats.byStatus?.PENDING || 0, color: '#ff9800' },
          { label: 'مكتملة', value: stats.byStatus?.COMPLETED || 0, color: '#4caf50' },
          { label: 'عاجلة', value: stats.byPriority?.URGENT || 0, color: '#d32f2f' },
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
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField select label="الحالة" value={filter.status} onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(0); }} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField select label="الأولوية" value={filter.priority} onChange={e => { setFilter(f => ({ ...f, priority: e.target.value })); setPage(0); }} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
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
                  <TableCell>الرقم</TableCell><TableCell>المستفيد</TableCell><TableCell>النوع</TableCell>
                  <TableCell>الأولوية</TableCell><TableCell>الحالة</TableCell>
                  <TableCell>من / إلى</TableCell><TableCell>السبب</TableCell><TableCell>التاريخ</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {referrals.map((r) => (
                  <TableRow key={r._id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetail(r)}>
                    <TableCell><Typography variant="body2" color="primary" fontWeight="bold">{r.ticketNumber || '-'}</Typography></TableCell>
                    <TableCell>{r.beneficiary?.name || r.beneficiaryName || '-'}</TableCell>
                    <TableCell><Chip label={TYPES.find(t => t.value === r.type)?.label || r.type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={PRIORITY_LABELS[r.priority] || r.priority} size="small" sx={{ bgcolor: PRIORITY_COLORS[r.priority], color: '#fff' }} /></TableCell>
                    <TableCell><Chip label={STATUS_LABELS[r.status] || r.status} color={STATUS_COLORS[r.status] || 'default'} size="small" /></TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.fromDepartment || '-'} → {r.toDepartment || '-'}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason || '-'}</Typography></TableCell>
                    <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar') : '-'}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Tooltip title="عرض"><IconButton size="small" onClick={() => openDetail(r)}><ViewIcon fontSize="small" /></IconButton></Tooltip>
                      {r.status === 'PENDING' && (
                        <>
                          <Tooltip title="تعديل"><IconButton size="small" onClick={() => handleEdit(r)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(r._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {referrals.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4 }}><Typography color="text.secondary">لا توجد إحالات</Typography></TableCell></TableRow>}
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
        <DialogTitle>{editId ? 'تعديل الإحالة' : 'إحالة جديدة'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}><TextField fullWidth label="معرف المستفيد" value={form.beneficiary} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} placeholder="ID المستفيد" /></Grid>
            <Grid item xs={6}><TextField fullWidth select label="النوع" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth select label="الأولوية" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField></Grid>
            <Grid item xs={6}><TextField fullWidth label="من قسم" value={form.fromDepartment} onChange={e => setForm(f => ({ ...f, fromDepartment: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="إلى قسم" value={form.toDepartment} onChange={e => setForm(f => ({ ...f, toDepartment: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="الأخصائي المحول إليه (اختياري)" value={form.toSpecialist} onChange={e => setForm(f => ({ ...f, toSpecialist: e.target.value }))} placeholder="ID الأخصائي" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="سبب الإحالة" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} multiline rows={2} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="ملاحظات سريرية" value={form.clinicalNotes} onChange={e => setForm(f => ({ ...f, clinicalNotes: e.target.value }))} multiline rows={3} /></Grid>
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
                  <Typography variant="h6">{detail.ticketNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {detail.beneficiary?.name || '-'} — {TYPES.find(t => t.value === detail.type)?.label || detail.type}
                  </Typography>
                </Box>
                <Box display="flex" gap={1} alignItems="center">
                  <Chip label={PRIORITY_LABELS[detail.priority] || detail.priority} size="small" sx={{ bgcolor: PRIORITY_COLORS[detail.priority], color: '#fff' }} />
                  <Chip label={STATUS_LABELS[detail.status] || detail.status} color={STATUS_COLORS[detail.status] || 'default'} />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {/* Action buttons */}
              <Box display="flex" gap={1} mb={2}>
                {detail.status === 'PENDING' && (
                  <>
                    <Button variant="contained" color="success" size="small" startIcon={<AcceptIcon />} onClick={() => openAction('accept')}>قبول</Button>
                    <Button variant="contained" color="error" size="small" startIcon={<RejectIcon />} onClick={() => openAction('reject')}>رفض</Button>
                  </>
                )}
                {(detail.status === 'ACCEPTED' || detail.status === 'IN_PROGRESS') && (
                  <Button variant="contained" color="primary" size="small" startIcon={<CompleteIcon />} onClick={() => openAction('complete')}>إكمال</Button>
                )}
              </Box>

              <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
                <Tab label="التفاصيل" />
                <Tab label="الاستجابة والنتائج" />
                <Tab label={`سجل التدقيق (${detail.history?.length || 0})`} />
              </Tabs>

              {/* Details Tab */}
              {detailTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">المحيل</Typography><Typography>{detail.referredByName || detail.referredBy?.name || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">تاريخ الإنشاء</Typography><Typography>{detail.createdAt ? new Date(detail.createdAt).toLocaleDateString('ar') : '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">من قسم</Typography><Typography>{detail.fromDepartment || '-'}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">إلى قسم</Typography><Typography>{detail.toDepartment || '-'}</Typography></Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">سبب الإحالة</Typography><Typography>{detail.reason || '-'}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">ملاحظات سريرية</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{detail.clinicalNotes || '-'}</Typography></Grid>
                </Grid>
              )}

              {/* Response & Outcome Tab */}
              {detailTab === 1 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" mb={1}>الاستجابة</Typography>
                  {detail.response ? (
                    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
                      <CardContent>
                        <Grid container spacing={1}>
                          <Grid item xs={6}><Typography variant="caption" color="text.secondary">المستجيب</Typography><Typography>{detail.response.respondedByName || '-'}</Typography></Grid>
                          <Grid item xs={6}><Typography variant="caption" color="text.secondary">التاريخ</Typography><Typography>{detail.response.respondedAt ? new Date(detail.response.respondedAt).toLocaleDateString('ar') : '-'}</Typography></Grid>
                          {detail.response.acceptanceNote && <Grid item xs={12}><Typography variant="caption" color="text.secondary">ملاحظة القبول</Typography><Typography>{detail.response.acceptanceNote}</Typography></Grid>}
                          {detail.response.rejectionReason && <Grid item xs={12}><Typography variant="caption" color="text.secondary">سبب الرفض</Typography><Typography color="error">{detail.response.rejectionReason}</Typography></Grid>}
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : <Typography color="text.secondary" mb={2}>لم يتم الاستجابة بعد</Typography>}

                  <Typography variant="subtitle1" fontWeight="bold" mb={1}>النتيجة</Typography>
                  {detail.outcome ? (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Grid container spacing={1}>
                          {detail.outcome.summary && <Grid item xs={12}><Typography variant="caption" color="text.secondary">الملخص</Typography><Typography>{detail.outcome.summary}</Typography></Grid>}
                          {detail.outcome.findings && <Grid item xs={12}><Typography variant="caption" color="text.secondary">النتائج</Typography><Typography>{detail.outcome.findings}</Typography></Grid>}
                          {detail.outcome.recommendations && <Grid item xs={12}><Typography variant="caption" color="text.secondary">التوصيات</Typography><Typography>{detail.outcome.recommendations}</Typography></Grid>}
                          <Grid item xs={12}><Typography variant="caption" color="text.secondary">متابعة مطلوبة</Typography><Chip label={detail.outcome.followUp ? 'نعم' : 'لا'} size="small" color={detail.outcome.followUp ? 'warning' : 'default'} /></Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ) : <Typography color="text.secondary">لم يتم تسجيل نتيجة بعد</Typography>}
                </Box>
              )}

              {/* Audit Trail Tab */}
              {detailTab === 2 && (
                <Box>
                  {(detail.history || []).length > 0 ? (
                    <Box sx={{ pl: 2 }}>
                      {detail.history.map((h, i) => (
                        <Box key={i} sx={{ mb: 2, display: 'flex', gap: 2, position: 'relative', '&:before': i < detail.history.length - 1 ? { content: '""', position: 'absolute', right: -16, top: 24, bottom: -16, width: 2, bgcolor: '#e0e0e0' } : {} }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#1976d2', mt: 1, flexShrink: 0 }} />
                          <Box flex={1}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" fontWeight="bold">
                                {h.action === 'CREATED' ? 'تم الإنشاء' : h.action === 'ACCEPTED' ? 'تم القبول' :
                                 h.action === 'REJECTED' ? 'تم الرفض' : h.action === 'COMPLETED' ? 'تم الإكمال' :
                                 h.action === 'UPDATED' ? 'تم التحديث' : h.action || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{h.date ? new Date(h.date).toLocaleString('ar') : ''}</Typography>
                            </Box>
                            {h.performedByName && <Typography variant="caption" color="text.secondary">بواسطة: {h.performedByName}</Typography>}
                            {h.notes && <Typography variant="body2" mt={0.5}>{h.notes}</Typography>}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : <Typography color="text.secondary" textAlign="center" py={2}>لا يوجد سجل</Typography>}
                </Box>
              )}
            </DialogContent>
            <DialogActions><Button onClick={() => setDetailOpen(false)}>إغلاق</Button></DialogActions>
          </>
        )}
      </Dialog>

      {/* Action Dialog (Accept / Reject / Complete) */}
      <Dialog open={actionOpen} onClose={() => setActionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionType === 'accept' ? 'قبول الإحالة' : actionType === 'reject' ? 'رفض الإحالة' : 'إكمال الإحالة'}
        </DialogTitle>
        <DialogContent>
          {actionType === 'complete' ? (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}><TextField fullWidth label="ملخص" value={actionForm.summary} onChange={e => setActionForm(f => ({ ...f, summary: e.target.value }))} multiline rows={2} required /></Grid>
              <Grid item xs={12}><TextField fullWidth label="النتائج" value={actionForm.findings} onChange={e => setActionForm(f => ({ ...f, findings: e.target.value }))} multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="التوصيات" value={actionForm.recommendations} onChange={e => setActionForm(f => ({ ...f, recommendations: e.target.value }))} multiline rows={2} /></Grid>
              <Grid item xs={12}><TextField fullWidth select label="متابعة مطلوبة" value={actionForm.followUp ? 'yes' : 'no'} onChange={e => setActionForm(f => ({ ...f, followUp: e.target.value === 'yes' }))}>
                <MenuItem value="no">لا</MenuItem><MenuItem value="yes">نعم</MenuItem>
              </TextField></Grid>
            </Grid>
          ) : (
            <TextField fullWidth label={actionType === 'accept' ? 'ملاحظة القبول' : 'سبب الرفض'}
              value={actionForm.note} onChange={e => setActionForm(f => ({ ...f, note: e.target.value }))}
              multiline rows={3} required sx={{ mt: 1 }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionOpen(false)}>إلغاء</Button>
          <Button variant="contained" color={actionType === 'reject' ? 'error' : 'primary'} onClick={handleAction}>
            {actionType === 'accept' ? 'قبول' : actionType === 'reject' ? 'رفض' : 'إكمال'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
